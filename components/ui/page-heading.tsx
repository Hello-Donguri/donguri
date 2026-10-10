import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

// The page-title/subtitle pair repeated at the top of nearly every
// dashboard, admin and auth page (usually right under <Breadcrumbs />).
// `className` lets a caller add e.g. a top margin for the handful of
// mid-page uses (a session's "done" screen) without duplicating the base
// styling.
export function PageTitle({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <h1
      className={cn("text-2xl font-extrabold text-sumi", className)}
      style={style}
    >
      {children}
    </h1>
  );
}

export function PageSubtitle({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p className={cn("mt-1 text-sumi-soft", className)} style={style}>
      {children}
    </p>
  );
}

// A section's heading on a dashboard page — the small uppercase label that
// opens each card on the course page (Today, Your words, Your active decks,
// the leaderboard, the week's progress), so they all read as one set.
// `action` sits at the other end of the row (e.g. "Browse decks").
export const sectionHeadingClass = "text-sm font-semibold uppercase tracking-wide text-sumi-soft";

export function SectionHeading({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className={sectionHeadingClass}>{children}</h2>
      {action}
    </div>
  );
}
