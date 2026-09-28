"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, X } from "lucide-react";
import type { ReviewDueStatus } from "@/lib/dal";
import { useTranslations } from "@/components/i18n/locale-provider";

// The notifier keeps its own copy of when the next word falls due and
// checks the clock against it every TICK_MS — cheap, and unlike one long
// setTimeout it can't be lost to a throttled background tab or a sleeping
// laptop. It only asks the server when that time has passed, plus a slow
// SYNC_MS backstop for words learnt or reviewed elsewhere (another tab or
// device) and whenever the tab comes back into view.
const TICK_MS = 30 * 1000;
const SYNC_MS = 10 * 60 * 1000;
const TOAST_DURATION_MS = 15 * 1000;

type Toast = { slug: string; title: string; count: number };

async function fetchReviewsDue(): Promise<ReviewDueStatus[] | null> {
  const response = await fetch("/api/reviews-due", { cache: "no-store" });
  return response.ok ? response.json() : null;
}

// Watches every enrolled course's review queue while the app is open and
// pops a toast when words *become* due — not for ones already waiting when
// the page loaded (the course page shows those), and not while the learner
// is already reviewing that course. See TICK_MS for how it keeps time.
export function ReviewDueNotifier() {
  const t = useTranslations();
  const pathname = usePathname();
  const [toast, setToast] = useState<Toast | null>(null);
  const known = useRef<Map<string, number> | null>(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

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
        setToast({ slug: newlyDue.slug, title: newlyDue.title, count: newlyDue.dueCount });
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

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [toast]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={`${toast.slug}-${toast.count}`}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-card-border bg-washi p-4 shadow-xl"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sakura-soft text-sakura">
              <RotateCcw aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sumi">
                {toast.count === 1
                  ? t("review_toast.title_one", "A word is ready to review")
                  : t("review_toast.title_other", "{{count}} words are ready to review", {
                      count: toast.count,
                    })}
              </p>
              <p className="mt-0.5 truncate text-sm text-sumi-soft">{toast.title}</p>
              <Link
                href={`/dashboard/courses/${toast.slug}/review`}
                onClick={() => setToast(null)}
                className="mt-2 inline-flex text-sm font-semibold text-sakura-dark transition hover:text-sakura"
              >
                {t("review_toast.review_now", "Review now →")}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label={t("common.close", "Close")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sumi-soft transition hover:bg-sumi/5 hover:text-sumi"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
