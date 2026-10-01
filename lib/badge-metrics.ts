import type { TFunction } from "@/lib/i18n/translate";

// The milestones a badge can be for — each one a number the learner's
// progress is measured by (see badgeMetricsForUser in lib/badges.ts). Kept
// in step with the `badges_metric_check` constraint in supabase/schema.sql.
// No server imports, so the admin form and the dashboard can share it.
export const BADGE_METRICS = [
  "xp",
  "words_learnt",
  "words_mastered",
  "streak_days",
  "reviews_done",
  "challenges_done",
  "challenge_xp",
] as const;

export type BadgeMetric = (typeof BADGE_METRICS)[number];

export function isBadgeMetric(value: string): value is BadgeMetric {
  return (BADGE_METRICS as readonly string[]).includes(value);
}

// An optional window the target has to be reached within: one UTC day, or
// one Monday-to-Sunday UTC week. None means all time.
export const BADGE_TIMESCALES = ["day", "week"] as const;
export type BadgeTimescale = (typeof BADGE_TIMESCALES)[number];

export function isBadgeTimescale(value: string | null): value is BadgeTimescale {
  return value !== null && (BADGE_TIMESCALES as readonly string[]).includes(value);
}

// Streaks are already about days, and when a word was mastered isn't kept,
// so neither can be "in a day/week". Daily challenge XP is always counted
// within one day (see fixedTimescale), so there's nothing to pick.
export function metricAllowsTimescale(metric: BadgeMetric): boolean {
  return metric !== "streak_days" && metric !== "words_mastered" && metric !== "challenge_xp";
}

// A metric that only makes sense over one window: daily challenge XP is
// about one day's three chats (6 XP each at most, so 18 a day per course).
// Saved as the badge's timescale when it's made.
export function fixedTimescale(metric: BadgeMetric): BadgeTimescale | null {
  return metric === "challenge_xp" ? "day" : null;
}

// XP isn't recorded per course, so an XP badge is always for every course.
export function metricAllowsCourse(metric: BadgeMetric): boolean {
  return metric !== "xp";
}

export function badgeTimescaleLabel(timescale: BadgeTimescale | null, t: TFunction): string {
  switch (timescale) {
    case "day":
      return t("badges.timescale_day", "In one day");
    case "week":
      return t("badges.timescale_week", "In one week");
    default:
      return t("badges.timescale_all", "All time");
  }
}

// The metric's name, for the admin form's picker.
export function badgeMetricLabel(metric: BadgeMetric, t: TFunction): string {
  switch (metric) {
    case "xp":
      return t("badges.metric_xp", "XP earned");
    case "words_learnt":
      return t("badges.metric_words_learnt", "Words learnt");
    case "words_mastered":
      return t("badges.metric_words_mastered", "Words mastered");
    case "streak_days":
      return t("badges.metric_streak_days", "Day streak");
    case "reviews_done":
      return t("badges.metric_reviews_done", "Reviews done");
    case "challenges_done":
      return t("badges.metric_challenges_done", "Daily challenges completed");
    case "challenge_xp":
      return t("badges.metric_challenge_xp", "Daily challenge XP in one day");
  }
}

// What earning it takes, in a sentence — "Learn 100 words", or with a
// timescale "Learn 10 words in a day".
export function badgeGoal(
  metric: BadgeMetric,
  threshold: number,
  t: TFunction,
  timescale: BadgeTimescale | null = null,
): string {
  const goal = allTimeGoal(metric, threshold, t);
  if (timescale === "day") return t("badges.goal_in_a_day", "{{goal}} in a day", { goal });
  if (timescale === "week") return t("badges.goal_in_a_week", "{{goal}} in a week", { goal });
  return goal;
}

function allTimeGoal(metric: BadgeMetric, threshold: number, t: TFunction): string {
  const params = { count: threshold };
  switch (metric) {
    case "xp":
      return t("badges.goal_xp", "Earn {{count}} XP", params);
    case "words_learnt":
      return t("badges.goal_words_learnt", "Learn {{count}} words", params);
    case "words_mastered":
      return t("badges.goal_words_mastered", "Master {{count}} words", params);
    case "streak_days":
      return t("badges.goal_streak_days", "Keep a {{count}}-day streak", params);
    case "reviews_done":
      return t("badges.goal_reviews_done", "Do {{count}} reviews", params);
    case "challenges_done":
      return t("badges.goal_challenges_done", "Complete {{count}} daily challenges", params);
    case "challenge_xp":
      return t("badges.goal_challenge_xp", "Earn {{count}} XP from daily challenges", params);
  }
}
