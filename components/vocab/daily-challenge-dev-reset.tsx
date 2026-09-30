"use client";

import { useEffect, useRef } from "react";
import { resetDailyChallengeToday } from "@/lib/actions/daily-challenge";
import { useDevMode } from "@/components/dashboard/dev-mode-context";

type Props = {
  courseSlug: string;
  attemptsToday: number;
};

// Dev mode only (the toggle is admin-only, and the action re-checks the
// role): every visit to the course page quietly wipes today's
// daily-challenge attempts, so testing is never capped at three. Draws
// nothing — resetting by hand is in the header's Admin menu. The action
// revalidates the page, which then shows the full count again.
export function DailyChallengeDevReset({ courseSlug, attemptsToday }: Props) {
  const { enabled } = useDevMode();
  // Runs once per visit (this remounts on each navigation to the course
  // page). Re-running whenever attemptsToday > 0 looped: the action
  // resolves before the revalidated page (with the new count) has
  // rendered, so the stale count triggered another reset, and so on. Also
  // guards against Strict Mode's double effect run in development.
  const autoResetDone = useRef(false);

  useEffect(() => {
    if (!enabled || attemptsToday === 0 || autoResetDone.current) return;
    autoResetDone.current = true;
    resetDailyChallengeToday(courseSlug).catch((error) =>
      console.error("Automatic daily challenge reset failed:", error),
    );
  }, [enabled, attemptsToday, courseSlug]);

  return null;
}
