import type { ReactNode } from "react";
import { connection } from "next/server";
import { Jyutping } from "@/components/vocab/jyutping";
import {
  DEFAULT_GREETINGS,
  DEFAULT_MOTIVATIONS,
  type GreetingKey,
  type GreetingLine,
} from "@/lib/course-greetings";

// Hello, welcome, welcome back, or the time of day — at random.
function pickGreeting(greetings: Record<GreetingKey, GreetingLine>): GreetingLine {
  const hour = new Date().getHours();
  const timeOfDay: GreetingKey = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const options: GreetingKey[] = ["hello", "welcome", "welcome_back", timeOfDay];
  return greetings[options[Math.floor(Math.random() * options.length)]];
}

function pickMotivation(motivations: string[]): string {
  return motivations[Math.floor(Math.random() * motivations.length)];
}

// Scale the greeting to its column rather than the viewport, so it never runs
// into the illustration beside it. ~0.62em is a safe average glyph width for
// Nunito ExtraBold, and a Chinese or Japanese character is a full em; the
// floor lets very long names (e.g. email fallback) wrap.
function greetingFontSize(text: string) {
  const width = [...text].reduce((total, char) => total + (/[　-鿿＀-￯]/.test(char) ? 1 : 0.62), 0);
  return `clamp(1.75rem, ${(100 / width).toFixed(2)}cqi, 5.5rem)`;
}

// A Server Component, so the random picks happen once, on the server, and the
// HTML arrives already decided — picking in a Client Component ran them again
// during hydration and mismatched. `connection()` defers to request time, as
// Cache Components requires before `Math.random()` / `new Date()`. The time of
// day is the server's clock, not the learner's.
// The greeting is in the language being learnt, with its romanization (e.g.
// Jyutping) underneath where there is one; the motivation line is in the
// learner's own language (see getCourseGreeting). Without a course — the
// multi-course dashboard — English greetings stand in.
// `children` sits under the greeting — the course page's badge row.
export const Greeting = async ({
  firstName,
  greetings = DEFAULT_GREETINGS,
  motivations = DEFAULT_MOTIVATIONS.en,
  children,
}: {
  firstName: string;
  greetings?: Record<GreetingKey, GreetingLine>;
  motivations?: string[];
  children?: ReactNode;
}) => {
  await connection();

  const line = pickGreeting(greetings);
  const motivation = pickMotivation(motivations);
  const greeting = line.text.replaceAll("{name}", firstName);
  const romanization = line.romanization?.replaceAll("{name}", firstName) ?? null;

  return (
    <div className="mt-2 grid grid-cols-1 items-center gap-6 sm:mt-6 sm:gap-8 sm:grid-cols-[5fr_3fr]">
      <div className="@container min-w-0">
        <p
          className="max-w-full font-nunito font-extrabold leading-[0.95] text-balance wrap-anywhere"
          style={{ fontSize: greetingFontSize(greeting) }}
        >
          {greeting}
        </p>

        {romanization && (
          <p className="mt-2 text-lg font-semibold sm:text-xl">
            <Jyutping text={romanization} />
          </p>
        )}

        <p className="mt-3 text-base font-bold sm:text-lg text-sumi-soft">{motivation}</p>

        {children}
      </div>

      <div className="flex min-w-0 justify-center sm:justify-end">
        <img
          src="/images/london4.webp"
          alt="Donguri peering"
          className="h-auto w-full max-w-sm object-contain sm:max-w-md"
        />
      </div>
    </div>
  );
};
