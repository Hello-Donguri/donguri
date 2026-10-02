import "server-only";

import { cacheLife } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { NativeLanguage } from "@/lib/definitions";

// One way of greeting the learner, with "{name}" where their name goes —
// in the language being learnt, plus its romanization where the course has
// one (Jyutping for Cantonese).
export type GreetingLine = { text: string; romanization: string | null };

export const GREETING_KEYS = ["hello", "welcome", "welcome_back", "morning", "afternoon", "evening"] as const;
export type GreetingKey = (typeof GREETING_KEYS)[number];

export type CourseGreeting = {
  greetings: Record<GreetingKey, GreetingLine>;
  // The line under the greeting, in the course's audience language.
  motivations: string[];
};

// For anywhere without a course of its own (the multi-course dashboard),
// and any course whose own are missing.
export const DEFAULT_GREETINGS: Record<GreetingKey, GreetingLine> = {
  hello: { text: "Hello, {name}", romanization: null },
  welcome: { text: "Welcome, {name}", romanization: null },
  welcome_back: { text: "Welcome back, {name}", romanization: null },
  morning: { text: "Good morning, {name}", romanization: null },
  afternoon: { text: "Good afternoon, {name}", romanization: null },
  evening: { text: "Good evening, {name}", romanization: null },
};

// The motivation lines for the multi-course dashboard, in the learner's
// native language (English unless they speak Japanese).
export const DEFAULT_MOTIVATIONS: Record<NativeLanguage, string[]> = {
  en: [
    "Every small step is still an adventure.",
    "Go at your own pace — it all adds up.",
    "Today's step leads to tomorrow's.",
    "Your goal is getting closer every day.",
    "You're doing brilliantly!",
  ],
  ja: [
    "小さな一歩も、ちゃんと冒険だよ。",
    "ゆっくり、自分のペースでやろう。",
    "今日の一歩が、明日へつながるよ。",
    "目標は、だんだん近づいてるよ。",
    "君はすごい！",
  ],
  other: [],
};
DEFAULT_MOTIVATIONS.other = DEFAULT_MOTIVATIONS.en;

function parseGreetings(value: unknown): Record<GreetingKey, GreetingLine> {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    GREETING_KEYS.map((key) => {
      const entry = source[key] as { text?: unknown; romanization?: unknown } | undefined;
      return [
        key,
        typeof entry?.text === "string" && entry.text.includes("{name}")
          ? {
              text: entry.text,
              romanization: typeof entry.romanization === "string" ? entry.romanization : null,
            }
          : DEFAULT_GREETINGS[key],
      ];
    }),
  ) as Record<GreetingKey, GreetingLine>;
}

// A course's greetings and motivations (section 49 of supabase/schema.sql),
// with the defaults standing in for anything missing or malformed. Cached
// for hours — they're course content, edited rarely.
export async function getCourseGreeting(courseSlug: string): Promise<CourseGreeting> {
  "use cache";
  cacheLife("hours");

  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    select: { greetings: true, motivations: true },
  });
  const motivations = Array.isArray(course?.motivations)
    ? course.motivations.filter((line): line is string => typeof line === "string" && line.trim() !== "")
    : [];

  return {
    greetings: parseGreetings(course?.greetings),
    motivations: motivations.length > 0 ? motivations : DEFAULT_MOTIVATIONS.en,
  };
}
