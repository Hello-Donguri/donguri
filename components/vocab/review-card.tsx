"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { FakeButton } from "@/components/ui/fake-button";
import { CountBadge } from "@/components/ui/count-badge";
import { NextReviewCountdown } from "@/components/vocab/next-review-countdown";
import { useTranslations } from "@/components/i18n/locale-provider";
import { onReviewQueueChanged } from "@/lib/review-sync";

type Queue = { dueCount: number; upcoming: number[] };

// Once a word is due, words due within this long after it count as due too,
// so they arrive as one review. Kept in step with DUE_GRACE_MS in lib/dal.ts,
// which applies the same rule to the review itself.
const DUE_GRACE_MS = 5 * 60 * 1000;

// The number of words due, kept live without polling. The server sends the
// count plus when each of the next day's words comes due; one timer is set
// for the next of those, and when it fires the count goes up and the timer
// moves on to the one after — exactly on time, with no requests. Timers
// are throttled in background tabs, so the count is also recomputed when
// the tab comes back into view. And when another tab answers a review or
// learns a word (see announceReviewQueueChanged), the real count is fetched
// once from /api/reviews-due.
function useLiveDueCount(courseSlug: string, initial: Queue) {
  const [queue, setQueue] = useState(initial);
  // 0 until mounted, so the first render matches the server's (which only
  // counted words due when it rendered); the real clock starts after.
  const [now, setNow] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts the clock once mounted (see above).
    setNow(Date.now());
  }, []);

  // Anything due at all? Then the next few minutes' words come with it.
  const anyDue = queue.dueCount > 0 || (now > 0 && queue.upcoming.some((at) => at <= now));
  const cutoff = anyDue ? now + DUE_GRACE_MS : now;
  const dueCount = queue.dueCount + (now > 0 ? queue.upcoming.filter((at) => at <= cutoff).length : 0);
  // When the count next changes: a word reaching the grace window while
  // reviews are due, or the first word coming due otherwise.
  const nextWord = queue.upcoming.find((at) => at > cutoff) ?? null;
  const wakeAt = nextWord === null ? null : anyDue ? nextWord - DUE_GRACE_MS : nextWord;
  // The countdown shows when the first word is really due.
  const nextAt = anyDue ? null : nextWord;

  // The one timer: wake when the count next changes.
  useEffect(() => {
    if (wakeAt === null || now === 0) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, wakeAt - Date.now()) + 50);
    return () => clearTimeout(timer);
  }, [wakeAt, now]);

  // Back in view: catch up on anything a throttled timer missed.
  useEffect(() => {
    const catchUp = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("focus", catchUp);
    return () => {
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("focus", catchUp);
    };
  }, []);

  // Another tab changed the queue: fetch the real count, once.
  useEffect(
    () =>
      onReviewQueueChanged((slug) => {
        if (slug !== courseSlug) return;
        fetch("/api/reviews-due", { cache: "no-store" })
          .then((response) => (response.ok ? response.json() : []))
          .then((courses: { slug: string; dueCount: number; upcomingDue: string[] }[]) => {
            const course = courses.find((entry) => entry.slug === courseSlug);
            if (!course) return;
            setQueue({
              dueCount: course.dueCount,
              upcoming: course.upcomingDue.map((at) => new Date(at).getTime()),
            });
            setNow(Date.now());
          })
          .catch(() => {});
      }),
    [courseSlug],
  );

  return { dueCount, nextAt };
}

const CARD_CLASS =
  "relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-card-border bg-cover bg-center p-5 sm:min-h-[240px] sm:p-6 shadow-sm";

// The course page's review card. Live: "8 words due" ticks up the moment
// another word comes due, and a caught-up card turns into a link to the
// review by itself (see useLiveDueCount).
export function ReviewCard({
  courseSlug,
  dueCount: initialDueCount,
  upcomingDue,
  nextDueAt,
  locked = false,
}: {
  courseSlug: string;
  dueCount: number;
  upcomingDue: Date[];
  // The next word due beyond the upcoming list (over a day away), if any.
  nextDueAt: Date | null;
  // For guests (see lib/access.ts): greyed out, pointing at sign-up.
  locked?: boolean;
}) {
  const t = useTranslations();
  if (locked) return <LockedReviewCard />;
  return (
    <LiveReviewCard
      courseSlug={courseSlug}
      initialDueCount={initialDueCount}
      upcomingDue={upcomingDue}
      nextDueAt={nextDueAt}
      t={t}
    />
  );
}

// Reviews need an account: greyed out, with a lock, linking to sign-up.
function LockedReviewCard() {
  const t = useTranslations();
  return (
    <Link
      href="/signup"
      className={`${CARD_CLASS} opacity-60 grayscale transition hover:opacity-75`}
      style={{ backgroundImage: "url(/images/red-bg.webp)" }}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100/95 text-2xl font-bold leading-none text-red-600 shadow-sm">
            復
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sumi text-washi shadow-sm">
              <Lock aria-hidden className="h-3 w-3" strokeWidth={2.5} />
            </span>
          </div>
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-ink-on-dark/90">
            {t("course_home.review_label", "Review")}
          </span>
        </div>
        <h2 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl text-ink-on-dark">
          {t("course_home.review_locked_title", "Sign up to review")}
        </h2>
        <p className="mt-2 max-w-[65%] text-sm leading-relaxed sm:max-w-[60%] text-ink-on-dark/85">
          {t(
            "course_home.review_locked_subtitle",
            "Reviews bring words back just before you'd forget them. Create a free account to unlock them.",
          )}
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, sized by CSS like the other course cards. */}
      <img
        src="/images/rabbit-flash.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 right-2 z-0 h-28 select-none object-contain"
      />
    </Link>
  );
}

function LiveReviewCard({
  courseSlug,
  initialDueCount,
  upcomingDue,
  nextDueAt,
  t,
}: {
  courseSlug: string;
  initialDueCount: number;
  upcomingDue: Date[];
  nextDueAt: Date | null;
  t: ReturnType<typeof useTranslations>;
}) {
  const { dueCount, nextAt } = useLiveDueCount(courseSlug, {
    dueCount: initialDueCount,
    upcoming: upcomingDue.map((at) => new Date(at).getTime()),
  });
  const hasReviews = dueCount > 0;
  const countdownTo = nextAt !== null ? new Date(nextAt) : nextDueAt;

  const content = (
    <>
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100/95 text-2xl font-bold leading-none text-red-600 shadow-sm backdrop-blur-sm">
            復
            <CountBadge count={dueCount} />
          </div>

          <span className="text-sm font-bold uppercase tracking-[0.2em] text-ink-on-dark/90">
            {t("course_home.review_label", "Review")}
          </span>
        </div>

        <h2 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl text-ink-on-dark" aria-live="polite">
          {!hasReviews
            ? t("course_home.review_empty_title", "You're all caught up!")
            : dueCount === 1
              ? t("course_home.review_title_singular", "{{count}} word due", { count: dueCount })
              : t("course_home.review_title", "{{count}} words due", { count: dueCount })}
        </h2>

        <p className="mt-2 max-w-[65%] text-sm leading-relaxed sm:max-w-[60%] text-ink-on-dark/85">
          {!hasReviews
            ? t(
                "course_home.review_empty_subtitle",
                "Come back soon to review what you've learned, or learn new words to add to your review queue.",
              )
            : t("course_home.review_subtitle", "Keep it fresh. Strengthen your memory with a quick review.")}
        </p>

        {/* Caught up: when the next word comes due, counting down. */}
        {!hasReviews && countdownTo && <NextReviewCountdown key={countdownTo.getTime()} nextDueAt={countdownTo} />}
      </div>

      {hasReviews && (
        <div className="relative z-10 mt-auto pt-5">
          <FakeButton className="bg-red-100/95 text-red-700">
            {dueCount === 1
              ? t("course_home.review_cta_singular", "Review {{count}} word", { count: dueCount })
              : t("course_home.review_cta", "Review {{count}} words", { count: dueCount })}
          </FakeButton>
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, sized by CSS like the other course cards. */}
      <img
        src="/images/rabbit-flash.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 right-2 z-0 h-28 select-none object-contain transition-transform duration-300 group-hover:-translate-y-1"
      />
    </>
  );

  return hasReviews ? (
    <Link
      href={`/dashboard/courses/${courseSlug}/review`}
      className={`group ${CARD_CLASS} transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.015] hover:brightness-105 hover:shadow-md`}
      style={{ backgroundImage: "url(/images/red-bg.webp)" }}
    >
      {content}
    </Link>
  ) : (
    <div
      className={`pointer-events-none select-none saturate-75 ${CARD_CLASS}`}
      style={{ backgroundImage: "url(/images/red-bg.webp)" }}
    >
      {content}
    </div>
  );
}
