import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";

import {
  getCourseDecks,
  getCourseTitle,
  getDailyActivityCounts,
  getDailyChallengeStatus,
  getEnrolledCourseCount,
  getFlaggedWords,
  getLearningAllowance,
  getCourseStreak,
  getWeeklyStats,
  getLeaderboards,
  getReviewQueueDebug,
  getReviewQueueSummary,
  requireProfile,
} from "@/lib/dal";
import { getTranslator } from "@/lib/i18n/server";
import { ArrowLeft, ArrowRight, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GuestLimitModal } from "@/components/access/guest-limit-modal";

import { ActivityOverviewCard } from "@/components/vocab/activity-overview-card";
import { Greeting } from "@/components/dashboard/greeting";
import { getCourseGreeting } from "@/lib/course-greetings";
import { LeaderboardTabs } from "@/components/leaderboard/leaderboard-tabs";
import { DeckCompleteCelebration } from "@/components/vocab/deck-complete-celebration";
import { BadgeCelebration } from "@/components/badges/badge-celebration";
import { LevelUpCelebration } from "@/components/donguri/level-up-celebration";
import { CourseBadges } from "@/components/badges/course-badges";
import { badgeShelf, startOfBadgeWeek } from "@/lib/badges";
import {
  BrowseDecksTrigger,
  FindDeckModal,
} from "@/components/vocab/find-deck-modal";
import { ResetProgressButton } from "@/components/vocab/reset-progress-button";
import { ReviewQueueDevPanel } from "@/components/vocab/review-queue-dev-panel";
import { DailyChallengeDevReset } from "@/components/vocab/daily-challenge-dev-reset";
import ReadingRabbit from "@/components/icons/ReadingRabbit";
import { FakeButton } from "@/components/ui/fake-button";
import { ReviewCard } from "@/components/vocab/review-card";
import { CountBadge } from "@/components/ui/count-badge";
import { SleepingDuck } from "@/components/icons/SleepingDuck";
import { FlaggedLessons } from "@/components/vocab/flagged-lessons";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${await getCourseTitle(slug)} — Donguri`,
  };
}

// Everything the page shows for this learner, in one private cache scope:
// the result lives only in this user's browser (never on the server), which
// is what lets a `<Link prefetch>` to this page carry the real content
// instead of the loading skeleton. `stale: 30` is the minimum that still
// counts for per-link prefetching; the session-completion actions in
// lib/actions/vocab.ts revalidate, which clears the client cache outright,
// so finishing a learn/test/review session never shows stale numbers here.
async function loadCourseHome(slug: string) {
  "use cache: private";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });

  const [
    { course, decks, activeDeckIds },
    { currentStreak, longestStreak, activeToday },
    dailyActivity,
    leaderboards,
    reviewQueue,
    profile,
    weeklyStats,
    challengeStatus,
    enrolledCourseCount,
    allowance,
    flaggedWords,
  ] = await Promise.all([
    getCourseDecks(slug),
    getCourseStreak(slug),
    getDailyActivityCounts(slug),
    getLeaderboards(),
    getReviewQueueSummary(slug),
    requireProfile(),
    getWeeklyStats(slug),
    getDailyChallengeStatus(slug),
    getEnrolledCourseCount(),
    getLearningAllowance(),
    getFlaggedWords(slug),
  ]);

  const isAdmin = profile.role === "admin";
  const [reviewQueueDebug, badges] = await Promise.all([
    isAdmin ? getReviewQueueDebug(slug) : null,
    // This course's badges plus the every-course ones.
    badgeShelf(profile.id, course.id),
  ]);
  const badgeWeekStart = startOfBadgeWeek();

  return {
    course,
    decks,
    activeDeckIds,
    currentStreak,
    longestStreak,
    activeToday,
    dailyActivity,
    leaderboards,
    reviewQueue,
    profile,
    weeklyStats,
    challengeStatus,
    enrolledCourseCount,
    allowance,
    flaggedWords,
    isAdmin,
    reviewQueueDebug,
    badges,
    weeklyBadges: badges.earned.filter(
      (badge) => badge.awardedAt >= badgeWeekStart,
    ),
  };
}

export default async function CourseHomePage({ params }: PageProps) {
  const { slug } = await params;
  const [
    {
      course,
      decks,
      activeDeckIds,
      currentStreak,
      longestStreak,
      activeToday,
      dailyActivity,
      leaderboards,
      reviewQueue,
      profile,
      weeklyStats,
      challengeStatus,
      enrolledCourseCount,
      allowance,
      flaggedWords,
      isAdmin,
      reviewQueueDebug,
      badges,
      weeklyBadges,
    },
    { t },
    courseGreeting,
  ] = await Promise.all([loadCourseHome(slug), getTranslator(), getCourseGreeting(slug)]);

  // Mirrors the learn queue: an active deck with any word not yet started.
  // No active decks at all counts as nothing to learn too.
  const activeDeckSet = new Set(activeDeckIds);
  const hasNewWords = decks.some(
    (deck) => activeDeckSet.has(deck.id) && deck.learntWords < deck.totalWords,
  );
  const noActiveDecks = !decks.some((deck) => activeDeckSet.has(deck.id));
  const challengesLeft = Math.max(
    challengeStatus.maxAttemptsPerDay - challengeStatus.attemptsToday,
    0,
  );

  // Free words all used up (see lib/access.ts): the Learn card is locked,
  // like the review and daily challenge cards — guests to sign up, free
  // accounts to membership.
  const learnLocked =
    allowance.remaining.total === 0 ||
    (allowance.remaining.vocab === 0 && allowance.remaining.grammar === 0);

  const learnCardClassName =
    "group cursor-pointer relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-card-border bg-cover bg-center p-5 sm:min-h-[240px] sm:p-6 shadow-sm transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.015] hover:brightness-105 hover:shadow-md";
  const learnCardContent = (
    <>
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100/95 text-2xl font-bold leading-none text-blue-700 shadow-sm backdrop-blur-sm">
            学
          </div>

          <span className="text-sm font-bold uppercase tracking-[0.2em] text-ink-on-dark/90">
            {t("course_home.learn_label", "Learn")}
          </span>
        </div>

        <h2 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl text-ink-on-dark">
          {hasNewWords
            ? t("course_home.learn_title", "Learn new words")
            : noActiveDecks
              ? t("course_home.learn_no_decks_title", "Pick a deck to start")
              : t("course_home.learn_empty_title", "Ready for more?")}
        </h2>

        <p className="mt-2 max-w-[65%] text-sm leading-relaxed sm:max-w-[60%] text-ink-on-dark/85">
          {hasNewWords
            ? t(
                "course_home.learn_subtitle_three",
                "Learn 3 new words or grammar patterns from your active decks.",
              )
            : noActiveDecks
              ? t(
                  "course_home.learn_no_decks_subtitle",
                  "You don't have any active decks yet. Browse decks and activate one to start learning new words.",
                )
              : t(
                  "course_home.learn_empty_subtitle",
                  "You've learnt every word in your active decks. Browse decks to find something new.",
                )}
        </p>
      </div>

      <div className="relative z-10 mt-auto pt-5">
        <FakeButton className="bg-blue-100/95 text-blue-700">
          {hasNewWords
            ? t("course_home.learn_cta", "Learn 3 new words")
            : t("course_home.learn_browse_cta", "Browse decks")}
        </FakeButton>
      </div>

      {/* <img
        src="/images/rabbit-reading.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 right-2 z-0 h-28 select-none object-contain transition-transform duration-300 group-hover:-translate-y-1"
      /> */}
      <ReadingRabbit className="pointer-events-none absolute bottom-3 -right-95 z-0 h-28 select-none object-contain transition-transform duration-300 group-hover:-translate-y-1" />
    </>
  );

  // The daily challenge is for members only (see lib/access.ts) — everyone
  // else sees it locked, pointing at sign-up (guests) or membership.
  const challengeLocked = profile.tier !== "member";
  const challengeLockedHref = profile.tier === "guest" ? "/signup" : "/dashboard/billing";
  const challengesDone = !challengeLocked && challengesLeft === 0;
  const challengeCardContent = (
    <>
      <div className="relative z-10 flex max-w-[65%] items-center gap-3 sm:max-w-none">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100/95 text-2xl font-bold leading-none text-green-700 shadow-sm backdrop-blur-sm">
          挑
          {challengeLocked ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sumi text-washi shadow-sm">
              <Lock aria-hidden className="h-3 w-3" strokeWidth={2.5} />
            </span>
          ) : (
            <CountBadge count={challengesLeft} />
          )}
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-ink-on-dark/90">
            {t("course_home.challenge_label", "Daily Challenge")}
          </span>

          <h2 className="mt-0.5 text-lg font-bold leading-tight text-ink-on-dark">
            {challengeLocked
              ? t("course_home.challenge_locked_title", "Chat with Charles Duck")
              : challengesDone
              ? t("course_home.challenge_done_title", "All done for today")
              : challengesLeft === 1
                ? t(
                    "course_home.challenge_title_singular",
                    "{{count}} challenge left",
                    { count: challengesLeft },
                  )
                : t(
                    "course_home.challenge_title",
                    "{{count}} challenges left",
                    { count: challengesLeft },
                  )}
          </h2>

          {challengesDone && (
            <p className="mt-0.5 text-sm leading-snug text-ink-on-dark/85">
              {t(
                "course_home.challenge_done_subtitle",
                "Come back tomorrow for more challenges.",
              )}
            </p>
          )}
          {challengeLocked && (
            <p className="mt-0.5 text-sm leading-snug text-ink-on-dark/85">
              {t("course_home.challenge_locked_subtitle", "For members — use what you've learnt in a real chat.")}
            </p>
          )}
        </div>
      </div>

      {/* Charles is asleep once today's challenges are used up. */}
      {challengesDone ? (
        <SleepingDuck className="pointer-events-none absolute bottom-2 right-5 z-0 h-[92%] w-auto select-none" />
      ) : (
        <img
          src="/images/charles.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 right-20 z-0 h-[92%] select-none object-contain transition-transform duration-300 group-hover:-translate-y-1 sm:right-56"
        />
      )}

      {!challengesDone && (
        <div className="absolute right-5 top-1/2 z-20 -translate-y-1/2">
          <FakeButton
            className="bg-green-100/95 text-green-700"
            labelClassName="hidden sm:inline"
          >
            {challengeLocked
              ? t("course_home.challenge_locked_cta", "Unlock")
              : t("course_home.challenge_cta", "Start challenge")}
          </FakeButton>
        </div>
      )}
    </>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <DeckCompleteCelebration slug={slug} decks={decks} />
      {/* A guest who's used their free words is asked — not sent — to sign
          up; the banner and locked cards still lead there once it's closed. */}
      {profile.tier === "guest" && learnLocked && <GuestLimitModal />}
      {/* After the deck card in the DOM, so a badge earned alongside a
          finished deck is celebrated first, on top. */}
      <BadgeCelebration />
      {/* After badges in the DOM, so a level-up shows on top, first. */}
      <LevelUpCelebration />

      <main className="flex min-w-0 flex-col gap-6 sm:gap-8">
        <div>
          {/* In more than one course: the way back to the dashboard's course
              cards — styled like the review page's back link. */}
          {enrolledCourseCount > 1 && (
            <Link
              href="/dashboard"
              prefetch
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-sumi-soft transition hover:text-sumi"
            >
              <ArrowLeft aria-hidden className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {t("course_home.back_to_my_courses", "Back to my courses")}
            </Link>
          )}
          {/* Guests (see lib/access.ts) get straight to the cards — no
              greeting by name, and no badges to collect yet. */}
          {!profile.is_guest && (
            <Greeting
              firstName={profile.first_name ?? profile.email}
              greetings={courseGreeting.greetings}
              motivations={courseGreeting.motivations}
            >
              <CourseBadges earned={badges.earned} locked={badges.locked} />
            </Greeting>
          )}

          {/* Dev mode's automatic reset — draws nothing. The manual reset is
              in the header's Admin menu. */}
          {isAdmin && (
            <DailyChallengeDevReset
              courseSlug={slug}
              attemptsToday={challengeStatus.attemptsToday}
            />
          )}

          {isAdmin && reviewQueueDebug && (
            <div className="mt-4">
              <ReviewQueueDevPanel entries={reviewQueueDebug} />
            </div>
          )}
        </div>

        {/* Primary learning actions */}
        <section className="rounded-3xl border border-card-border bg-washi-soft p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* REVIEW */}
            {/* Live: the count goes up the moment each word comes due
                (see ReviewCard). Re-keyed so a fresh server count resets it. */}
            <ReviewCard
              key={`${reviewQueue.dueCount}:${reviewQueue.upcomingDue[0]?.getTime() ?? 0}`}
              courseSlug={slug}
              dueCount={reviewQueue.dueCount}
              upcomingDue={reviewQueue.upcomingDue}
              nextDueAt={reviewQueue.nextDueAt}
              locked={profile.is_guest}
            />

            {/* LEARN — turns into a browse-decks prompt once the active
                decks have nothing new left (or none are active), and is
                locked once the free words are used up. */}
            {learnLocked && profile.tier !== "guest" ? (
              // A free account that's used its allowance: the card keeps its
              // colour, with a Donguri Pro pitch over it.
              <Link
                href="/dashboard/billing"
                className={`${learnCardClassName} items-center justify-center`}
                style={{ backgroundImage: "url(/images/blue-bg2.webp)" }}
              >
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-sumi/20" />
                <div className="relative z-10 mx-auto flex max-w-xs flex-col items-center rounded-2xl bg-raised px-6 py-5 text-center shadow-lg">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-kin/25 text-sumi">
                    <Sparkles aria-hidden className="h-5 w-5" strokeWidth={2.25} />
                  </span>
                  <h2 className="mt-3 font-nunito text-xl font-extrabold leading-tight text-sumi">
                    {t("course_home.pro_title", "Get Donguri Pro")}
                  </h2>
                  <p className="mt-1.5 text-sm leading-snug text-sumi-soft">
                    {t("course_home.pro_body", "Unlock thousands of words and decks with a Donguri Pro membership.")}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ai px-5 py-2 text-sm font-semibold text-washi transition group-hover:bg-ai-dark">
                    {t("course_home.pro_cta", "See membership")}
                    <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ) : learnLocked ? (
              <Link
                href="/signup"
                className="relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-card-border bg-cover bg-center p-5 opacity-60 shadow-sm grayscale transition hover:opacity-75 sm:min-h-[240px] sm:p-6"
                style={{ backgroundImage: "url(/images/blue-bg2.webp)" }}
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100/95 text-2xl font-bold leading-none text-blue-700 shadow-sm">
                      学
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sumi text-washi shadow-sm">
                        <Lock aria-hidden className="h-3 w-3" strokeWidth={2.5} />
                      </span>
                    </div>
                    <span className="text-sm font-bold uppercase tracking-[0.2em] text-ink-on-dark/90">
                      {t("course_home.learn_label", "Learn")}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl text-ink-on-dark">
                    {t("course_home.learn_locked_guest_title", "Sign up to learn more")}
                  </h2>
                  <p className="mt-2 max-w-[65%] text-sm leading-relaxed sm:max-w-[60%] text-ink-on-dark/85">
                    {t(
                      "course_home.learn_locked_guest_subtitle",
                      "You've used your free words. Create a free account to keep them and unlock 40 words and 20 grammar points.",
                    )}
                  </p>
                </div>
                <ReadingRabbit className="pointer-events-none absolute bottom-3 -right-95 z-0 h-28 select-none object-contain" />
              </Link>
            ) : hasNewWords ? (
              <Link
                href={`/dashboard/courses/${slug}/learn`}
                className={learnCardClassName}
                style={{ backgroundImage: "url(/images/blue-bg2.webp)" }}
              >
                {learnCardContent}
              </Link>
            ) : (
              <BrowseDecksTrigger
                className={`${learnCardClassName} text-left`}
                style={{ backgroundImage: "url(/images/blue-bg2.webp)" }}
              >
                {learnCardContent}
              </BrowseDecksTrigger>
            )}

            {/* DAILY CHALLENGE */}
            {challengesDone ? (
              <div
                aria-disabled="true"
                className="pointer-events-none relative flex min-h-[112px] select-none items-center overflow-hidden rounded-2xl border border-card-border bg-cover bg-center px-5 py-4 shadow-sm saturate-75 sm:px-6 lg:col-span-2"
                style={{ backgroundImage: "url(/images/green-bg.webp)" }}
              >
                {challengeCardContent}
              </div>
            ) : (
              <Link
                href={challengeLocked ? challengeLockedHref : `/dashboard/courses/${slug}/daily-challenge`}
                className={cn(
                  // Guests see it clearly greyed out, like the review card.
                  profile.is_guest && "opacity-60 grayscale",
                  "group relative flex min-h-[112px] items-center overflow-hidden rounded-2xl border border-card-border bg-cover bg-center px-5 py-4 shadow-sm transition sm:px-6 duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.015] hover:brightness-105 hover:shadow-md lg:col-span-2",
                )}
                style={{ backgroundImage: "url(/images/green-bg.webp)" }}
              >
                {challengeCardContent}
              </Link>
            )}
          </div>
        </section>

        {/* Lessons flagged during a review — only drawn when there are some. */}
        <FlaggedLessons courseSlug={slug} words={flaggedWords} />

        <ActivityOverviewCard
          dailyActivity={dailyActivity}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          activeToday={activeToday}
          weeklyStats={weeklyStats}
          weeklyBadges={weeklyBadges}
          hasBadges={badges.earned.length + badges.locked.length > 0}
        />
      </main>

      <aside className="flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-1 lg:row-span-2">
        <FindDeckModal
          slug={slug}
          decks={decks}
          activeDeckIds={activeDeckIds}
        />

        <LeaderboardTabs
          topEntries={leaderboards.top}
          initialFriends={leaderboards.friends}
        />
      </aside>

      <div className="flex flex-col gap-4 rounded-2xl border border-card-border bg-washi-soft p-5 sm:p-6 lg:col-start-1 lg:row-start-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-sumi">
            {t("course_home.start_over", "Start over")}
          </h2>

          <p className="mt-1 text-sm text-sumi-soft">
            {t(
              "course_home.start_over_subtitle",
              "Clears course progress and streaks, plus your account XP and accessory unlocks.",
            )}
          </p>
        </div>

        <ResetProgressButton courseId={course.id} />
      </div>
    </div>
  );
}

