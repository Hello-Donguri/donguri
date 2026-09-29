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

// The eyebrow's colour — the same split the app uses: blue for learning,
// green for grammar and the daily challenge, pink for quizzes, gold for
// reviews and rewards.
export type Accent = "ai" | "matcha" | "sakura" | "kin";

// Soft chip of each accent colour — eyebrows and feature-list icons.
export const ICON_CHIP: Record<Accent, string> = {
  ai: "bg-ai-soft text-ai-dark",
  matcha: "bg-matcha-soft text-matcha-dark",
  sakura: "bg-sakura-soft text-sakura-dark",
  kin: "bg-kin/20 text-sumi",
};

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
      {eyebrow && (
        <span
          className={cn(
            "rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
            ICON_CHIP[accent],
          )}
        >
          {eyebrow}
        </span>
      )}
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
