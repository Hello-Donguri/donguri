import "server-only";

import { prisma } from "@/lib/prisma";
import { scheduleWeeklyCrownCheck } from "@/lib/weekly-crown";
import { Prisma } from "@/generated/prisma/client";
import { imageUrl } from "@/lib/bunny";
import { longestStreakForUser } from "@/lib/dal";
import { MAX_STAGE, addDays, startOfUTCDay } from "@/lib/srs";
import {
  isBadgeMetric,
  isBadgeTimescale,
  type BadgeMetric,
  type BadgeTimescale,
} from "@/lib/badge-metrics";

// Badges: admin-made, each earned by reaching `threshold` on one metric
// (see BADGE_METRICS) — optionally within one course, and optionally within
// one day or week (a badge's "scope"). They're awarded lazily, whenever the
// learner lands on the dashboard or a course page (see claimBadges in
// lib/actions/badges.ts), which is where every learn, review and daily
// challenge session ends up, and each one is celebrated once there.

// What a badge measures: which metric, in which course (null: all of them),
// over what window (null: all time).
type BadgeScope = {
  metric: BadgeMetric;
  courseId: string | null;
  timescale: BadgeTimescale | null;
};

// A badge as the learner sees it.
export type BadgeView = {
  id: string;
  name: string;
  imageUrl: string;
  metric: BadgeMetric;
  threshold: number;
  timescale: BadgeTimescale | null;
  courseId: string | null;
  // Extra XP for earning it (0 for none).
  xpReward: number;
};

type BadgeRow = {
  id: string;
  name: string;
  imageKey: string;
  metric: string;
  threshold: number;
  timescale: string | null;
  courseId: string | null;
  xpReward: number;
};

function toView(badge: BadgeRow): BadgeView | null {
  if (!isBadgeMetric(badge.metric)) return null;
  return {
    id: badge.id,
    name: badge.name,
    imageUrl: imageUrl(badge.imageKey),
    metric: badge.metric,
    threshold: badge.threshold,
    timescale: isBadgeTimescale(badge.timescale) ? badge.timescale : null,
    courseId: badge.courseId,
    xpReward: badge.xpReward,
  };
}

function scopeOf(badge: BadgeView): BadgeScope {
  return { metric: badge.metric, courseId: badge.courseId, timescale: badge.timescale };
}

function scopeKey(scope: BadgeScope): string {
  return `${scope.metric}:${scope.courseId ?? "all"}:${scope.timescale ?? "all"}`;
}

// The rows a metric counts, as (user, when, how much) — words learnt,
// reviews, XP and so on — narrowed to one course when the scope has one.
// Skipped words ("I already know this") never count as learnt.
function metricEvents(scope: BadgeScope): Prisma.Sql {
  const inCourse = scope.courseId
    ? Prisma.sql`and d.course_id = ${scope.courseId}::uuid`
    : Prisma.empty;

  switch (scope.metric) {
    case "xp":
      // XP isn't recorded per course, so an XP scope never has one.
      return Prisma.sql`select user_id, created_at as at, amount::float8 as amount from xp_events`;
    case "words_learnt":
      return Prisma.sql`
        select p.user_id, p.introduced_at as at, 1::float8 as amount
        from user_word_progress p
        join words w on w.id = p.word_id
        join language_decks d on d.id = w.language_deck_id
        where p.skipped = false ${inCourse}`;
    case "words_mastered":
      return Prisma.sql`
        select p.user_id, p.introduced_at as at, 1::float8 as amount
        from user_word_progress p
        join words w on w.id = p.word_id
        join language_decks d on d.id = w.language_deck_id
        where p.skipped = false and p.stage >= ${MAX_STAGE} ${inCourse}`;
    case "reviews_done":
      return Prisma.sql`
        select r.user_id, r.created_at as at, 1::float8 as amount
        from review_events r
        join words w on w.id = r.word_id
        join language_decks d on d.id = w.language_deck_id
        where true ${inCourse}`;
    case "challenges_done":
      return Prisma.sql`
        select a.user_id, (a.challenge_date::timestamp at time zone 'UTC') as at, 1::float8 as amount
        from daily_challenge_attempts a
        where a.skipped = false
        ${scope.courseId ? Prisma.sql`and a.course_id = ${scope.courseId}::uuid` : Prisma.empty}`;
    case "challenge_xp":
      // Always scoped to a day (see fixedTimescale), so this sums to the
      // best single day's daily challenge XP.
      return Prisma.sql`
        select a.user_id, (a.challenge_date::timestamp at time zone 'UTC') as at, a.xp_earned::float8 as amount
        from daily_challenge_attempts a
        where a.xp_earned > 0
        ${scope.courseId ? Prisma.sql`and a.course_id = ${scope.courseId}::uuid` : Prisma.empty}`;
    case "streak_days":
      throw new Error("Streaks aren't counted from events — see scopedValues.");
  }
}

// Every user's value for a scope (or just `userId`'s), by user id. For a
// timescale it's their best single UTC day or week; all time, their total.
// Users with nothing to count aren't in the map (read as 0).
async function scopedValues(scope: BadgeScope, userId?: string): Promise<Map<string, number>> {
  if (scope.metric === "streak_days") {
    // No single query for a streak — worked out from each user's activity.
    const userIds = userId
      ? [userId]
      : (
          await prisma.courseEnrollment.findMany({
            where: scope.courseId ? { courseId: scope.courseId } : {},
            distinct: ["userId"],
            select: { userId: true },
          })
        ).map((row) => row.userId);
    const streaks = await Promise.all(
      userIds.map(async (id) => [id, await longestStreakForUser(id, scope.courseId)] as const),
    );
    return new Map(streaks);
  }

  if (scope.metric === "xp" && !scope.timescale) {
    // All-time XP is the profile's running total: the XP log only goes back
    // to when it was added (see section 34 of supabase/schema.sql).
    const profiles = await prisma.profile.findMany({
      where: userId ? { id: userId } : {},
      select: { id: true, xp: true },
    });
    return new Map(profiles.map((profile) => [profile.id, profile.xp]));
  }

  const onlyUser = userId ? Prisma.sql`where e.user_id = ${userId}::uuid` : Prisma.empty;
  const events = metricEvents(scope);
  const query = scope.timescale
    ? Prisma.sql`
        select user_id, max(total) as value from (
          select e.user_id,
            date_trunc(${scope.timescale}, e.at at time zone 'UTC') as bucket,
            sum(e.amount) as total
          from (${events}) e ${onlyUser}
          group by 1, 2
        ) buckets
        group by user_id`
    : Prisma.sql`select e.user_id, sum(e.amount) as value from (${events}) e ${onlyUser} group by 1`;

  const rows = await prisma.$queryRaw<{ user_id: string; value: number }[]>(query);
  return new Map(rows.map((row) => [row.user_id, Number(row.value)]));
}

// Gives the learner every active badge they've now reached and don't have
// yet, along with each one's XP reward. Badges they were skipped for (see
// recordUsersAlreadyQualifying) already have a row, so they're never
// awarded. Each distinct scope is measured once, however many badges share
// it.
export async function awardEarnedBadges(userId: string): Promise<void> {
  const [badges, held] = await Promise.all([
    prisma.badge.findMany({ where: { active: true } }),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
  ]);

  const heldIds = new Set(held.map((row) => row.badgeId));
  const pending = badges
    .filter((badge) => !heldIds.has(badge.id))
    .flatMap((badge) => {
      const view = toView(badge);
      return view ? [view] : [];
    });
  if (pending.length === 0) return;

  const values = await valuesByScope(pending.map(scopeOf), userId);
  const earned = pending.filter(
    (badge) => (values.get(scopeKey(scopeOf(badge)))?.get(userId) ?? 0) >= badge.threshold,
  );
  if (earned.length === 0) return;

  // One badge at a time, so XP is only given for a row this call actually
  // created — a second tab claiming at the same moment skips the duplicate
  // and gives nothing.
  const rewarded = await prisma.$transaction(async (tx) => {
    let xp = 0;
    for (const badge of earned) {
      const { count } = await tx.userBadge.createMany({
        data: [{ userId, badgeId: badge.id, xpAwarded: badge.xpReward }],
        skipDuplicates: true,
      });
      if (count > 0) xp += badge.xpReward;
    }
    if (xp === 0) return 0;
    // Logged like any other XP, so it counts towards "XP this week".
    await tx.profile.update({ where: { id: userId }, data: { xp: { increment: xp } } });
    await tx.xpEvent.create({ data: { userId, amount: xp } });
    return xp;
  });
  if (rewarded > 0) scheduleWeeklyCrownCheck();
}

async function valuesByScope(scopes: BadgeScope[], userId: string) {
  const unique = new Map(scopes.map((scope) => [scopeKey(scope), scope]));
  const entries = await Promise.all(
    [...unique].map(async ([key, scope]) => [key, await scopedValues(scope, userId)] as const),
  );
  return new Map(entries);
}

// For a badge made with "give to existing users" off: everyone who already
// qualifies is recorded as skipped, so awardEarnedBadges never gives it to
// them — only learners who reach it from now on earn it. (With it on,
// nothing's needed here: they'll be awarded it on their next visit.)
export async function recordUsersAlreadyQualifying(
  badgeId: string,
  scope: BadgeScope,
  threshold: number,
): Promise<number> {
  const values = await scopedValues(scope);
  const userIds = [...values].filter(([, value]) => value >= threshold).map(([id]) => id);
  if (userIds.length === 0) return 0;
  const { count } = await prisma.userBadge.createMany({
    data: userIds.map((userId) => ({ userId, badgeId, status: "skipped" })),
    skipDuplicates: true,
  });
  return count;
}

// Every badge for the admin page, hidden ones included, with its course's
// title and how many learners have earned it.
export async function adminBadgeList() {
  const badges = await prisma.badge.findMany({
    orderBy: [{ courseId: "asc" }, { metric: "asc" }, { threshold: "asc" }],
    include: {
      course: { select: { title: true } },
      _count: { select: { userBadges: { where: { status: "awarded" } } } },
    },
  });
  return badges.flatMap((badge) => {
    const view = toView(badge);
    return view
      ? [
          {
            ...view,
            courseTitle: badge.course?.title ?? null,
            active: badge.active,
            awardExisting: badge.awardExisting,
            earnedCount: badge._count.userBadges,
          },
        ]
      : [];
  });
}

export type UnseenBadge = BadgeView & { awardId: string; xpAwarded: number };

// Awarded badges whose celebration hasn't been shown yet, oldest first.
// `awardId` is what markBadgesSeen takes; `xpAwarded` is the XP the learner
// got for it, which may differ from the badge's current reward.
export async function unseenBadges(userId: string): Promise<UnseenBadge[]> {
  const rows = await prisma.userBadge.findMany({
    where: { userId, status: "awarded", seenAt: null, badge: { active: true } },
    orderBy: { awardedAt: "asc" },
    select: { id: true, xpAwarded: true, badge: true },
  });
  return rows.flatMap((row) => {
    const view = toView(row.badge);
    return view ? [{ ...view, awardId: row.id, xpAwarded: row.xpAwarded }] : [];
  });
}

export type EarnedBadge = BadgeView & { awardedAt: Date };
export type LockedBadge = BadgeView & { progress: number };

// A learner's badges: earned ones (newest first), and the ones they can
// still earn with their progress — their best day or week for a timed one.
// Badges they were skipped for are left out, since they can't earn them.
// With `courseId`, just that course's badges plus the every-course ones.
export async function badgeShelf(
  userId: string,
  courseId: string | null = null,
): Promise<{ earned: EarnedBadge[]; locked: LockedBadge[] }> {
  const [badges, held] = await Promise.all([
    prisma.badge.findMany({
      where: { active: true, ...(courseId ? { OR: [{ courseId }, { courseId: null }] } : {}) },
      orderBy: [{ metric: "asc" }, { threshold: "asc" }],
    }),
    prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true, status: true, awardedAt: true },
    }),
  ]);
  const heldById = new Map(held.map((row) => [row.badgeId, row]));
  const views = badges.flatMap((badge) => {
    const view = toView(badge);
    return view ? [view] : [];
  });

  const earned = views
    .flatMap((view) => {
      const row = heldById.get(view.id);
      return row?.status === "awarded" ? [{ ...view, awardedAt: row.awardedAt }] : [];
    })
    .sort((a, b) => b.awardedAt.getTime() - a.awardedAt.getTime());

  const lockedViews = views.filter((view) => !heldById.has(view.id));
  const values = await valuesByScope(lockedViews.map(scopeOf), userId);
  const locked = lockedViews.map((view) => ({
    ...view,
    progress: Math.min(values.get(scopeKey(scopeOf(view)))?.get(userId) ?? 0, view.threshold),
  }));

  return { earned, locked };
}

// Just the badges a learner has earned, across every course, newest first —
// for their profile page, where others see them (no progress on the rest).
export async function earnedBadges(userId: string): Promise<EarnedBadge[]> {
  const rows = await prisma.userBadge.findMany({
    where: { userId, status: "awarded", badge: { active: true } },
    orderBy: { awardedAt: "desc" },
    select: { awardedAt: true, badge: true },
  });
  return rows.flatMap((row) => {
    const view = toView(row.badge);
    return view ? [{ ...view, awardedAt: row.awardedAt }] : [];
  });
}

// The start of "this week" on the course page — the trailing 7 UTC days,
// today included, as the weekly stats use.
export function startOfBadgeWeek(): Date {
  return addDays(startOfUTCDay(new Date()), -6);
}
