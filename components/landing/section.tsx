import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionProps = {
  id?: string;
  tone?: "washi" | "washi-soft";
  className?: string;
  children: ReactNode;
};

export function Section({ id, tone = "washi", className, children }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-6 border-t border-sumi/10",
        tone === "washi-soft" && "bg-washi-soft",
      )}
    >
      <div className={cn("mx-auto max-w-5xl px-6 py-16 sm:py-24", className)}>{children}</div>
    </section>
  );
}

// A section's colour — the same split the app uses: blue for learning,
// green for grammar and the daily challenge, pink for quizzes, gold for
// reviews and rewards — plus acorn (Donguri's warm brown) and sage for
// quieter accents, so blue is left mainly to buttons and progress.
export type Accent = "ai" | "matcha" | "sakura" | "kin" | "acorn" | "sage";

// Soft chip of each accent colour — feature-list and step icons. Acorn and
// sage fall back to the blue chip in dark mode, which is what they were.
export const ICON_CHIP: Record<Accent, string> = {
  ai: "bg-ai-soft text-ai-dark",
  matcha: "bg-matcha-soft text-matcha-dark",
  sakura: "bg-sakura-soft text-sakura-dark",
  kin: "bg-kin/20 text-sumi",
  acorn: "bg-acorn-soft text-acorn dark:bg-ai-soft dark:text-ai-dark",
  sage: "bg-neutral-soft text-sumi dark:bg-ai-soft dark:text-ai-dark",
};

// Dark mode keeps the old coloured eyebrow pill; light mode uses the quiet
// acorn label below. Written out in full so Tailwind finds each class.
const DARK_EYEBROW: Record<Accent, string> = {
  ai: "dark:bg-ai-soft dark:text-ai-dark",
  matcha: "dark:bg-matcha-soft dark:text-matcha-dark",
  sakura: "dark:bg-sakura-soft dark:text-sakura-dark",
  kin: "dark:bg-kin/20 dark:text-sumi",
  acorn: "dark:bg-ai-soft dark:text-ai-dark",
  sage: "dark:bg-ai-soft dark:text-ai-dark",
};

// A section's small label above its heading: acorn text after a short
// acorn rule in light mode, so it adds warmth without competing with the
// blue call-to-action buttons.
export function Eyebrow({ accent = "ai", children }: { accent?: Accent; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-acorn dark:rounded-full dark:px-4 dark:py-1 dark:font-semibold",
        DARK_EYEBROW[accent],
      )}
    >
      <span aria-hidden="true" className="h-0.5 w-6 rounded-full bg-acorn dark:hidden" />
      {children}
    </span>
  );
}

type SectionHeadingProps = {
  eyebrow?: string;
  heading: string;
  subtext?: string;
  center?: boolean;
  accent?: Accent;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  heading,
  subtext,
  center = true,
  accent = "ai",
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col", center && "items-center text-center", className)}>
      {eyebrow && <Eyebrow accent={accent}>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 max-w-2xl font-nunito text-3xl font-extrabold tracking-tight text-sumi text-balance sm:text-4xl">
        {heading}
      </h2>
      {subtext && (
        <p className={cn("mt-3 text-lg text-sumi-soft text-pretty", center && "max-w-2xl")}>
          {subtext}
        </p>
      )}
    </div>
  );
}

type FeatureItem = {
  icon: ReactNode;
  title: string;
  body: string;
};

// A stacked list of icon + title + one line — used beside each mock-up.
export function FeatureList({ items, accent }: { items: FeatureItem[]; accent: Accent }) {
  return (
    <ul className="flex flex-col gap-5">
      {items.map((item) => (
        <li key={item.title} className="flex gap-4">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              ICON_CHIP[accent],
            )}
          >
            {item.icon}
          </span>
          <div>
            <p className="font-semibold text-sumi">{item.title}</p>
            <p className="mt-0.5 text-sm text-sumi-soft text-pretty">{item.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
