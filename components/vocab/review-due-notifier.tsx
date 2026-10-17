"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { ReviewDueStatus } from "@/lib/dal";
import { useTranslations } from "@/components/i18n/locale-provider";
import { toast } from "@/components/ui/toast";

// The notifier keeps its own copy of when the next word falls due and
// checks the clock against it every TICK_MS — cheap, and unlike one long
// setTimeout it can't be lost to a throttled background tab or a sleeping
// laptop. It only asks the server when that time has passed, plus a slow
// SYNC_MS backstop for words learnt or reviewed elsewhere (another tab or
// device) and whenever the tab comes back into view.
const TICK_MS = 30 * 1000;
const SYNC_MS = 10 * 60 * 1000;
const TOAST_DURATION_MS = 15 * 1000;

async function fetchReviewsDue(): Promise<ReviewDueStatus[] | null> {
  const response = await fetch("/api/reviews-due", { cache: "no-store" });
  return response.ok ? response.json() : null;
}

// Watches every enrolled course's review queue while the app is open and
// pops a toast when words *become* due — not for ones already waiting when
// the page loaded (the course page shows those), and not while the learner
// is already reviewing that course. See TICK_MS for how it keeps time.
// Shown through the app's shared toasts (see Toaster); draws nothing itself.
export function ReviewDueNotifier() {
  const t = useTranslations();
  const pathname = usePathname();
  const known = useRef<Map<string, number> | null>(null);
  const pathnameRef = useRef(pathname);
  const tRef = useRef(t);

  useEffect(() => {
    pathnameRef.current = pathname;
    tRef.current = t;
  }, [pathname, t]);

  useEffect(() => {
    let cancelled = false;
    let checking = false;
    let nextDueAt = Infinity;
    let lastSyncAt = 0;

    const check = async () => {
      if (checking) return;
      checking = true;
      lastSyncAt = Date.now();
      const statuses = await fetchReviewsDue().catch(() => null);
      checking = false;
      if (cancelled || !statuses) return;

      const previous = known.current;
      const newlyDue = previous
        ? statuses.find((status) => status.dueCount > (previous.get(status.slug) ?? 0))
        : undefined;
      known.current = new Map(statuses.map((status) => [status.slug, status.dueCount]));
      nextDueAt = Math.min(
        ...statuses.flatMap((status) =>
          status.nextUpcomingAt ? [new Date(status.nextUpcomingAt).getTime()] : [],
        ),
      );

      const reviewing =
        newlyDue && pathnameRef.current.startsWith(`/dashboard/courses/${newlyDue.slug}/review`);
      if (newlyDue && !reviewing) {
        const translate = tRef.current;
        toast({
          key: "review-due",
          tone: "review",
          title:
            newlyDue.dueCount === 1
              ? translate("review_toast.title_one", "A word is ready to review")
              : translate("review_toast.title_other", "{{count}} words are ready to review", {
                  count: newlyDue.dueCount,
                }),
          body: newlyDue.title,
          action: {
            label: translate("review_toast.review_now", "Review now →"),
            href: `/dashboard/courses/${newlyDue.slug}/review`,
          },
          durationMs: TOAST_DURATION_MS,
        });
      }
    };

    const tick = () => {
      const now = Date.now();
      if (now >= nextDueAt || now - lastSyncAt >= SYNC_MS) check();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    check();
    const interval = setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
