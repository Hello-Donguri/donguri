import type { TFunction } from "@/lib/i18n/translate";
import { ProgressShowcase } from "@/components/landing/progress-showcase";

// The landing page's progress section — translated here on the server and
// handed to the animated showcase as plain strings.
export function Progress({ t }: { t: TFunction }) {
  return (
    <ProgressShowcase
      labels={{
        eyebrow: t("home.progress.eyebrow", "Progress"),
        heading: t("home.progress.heading", "Watch your English grow."),
        body: t(
          "home.progress.body",
          "Earn XP, keep your streak going, dress up Donguri and climb the leaderboard with friends.",
        ),
        wordsLearnt: t("weekly_stats.words_learnt", "Words learnt"),
        accuracy: t("weekly_stats.review_accuracy", "Review accuracy"),
        xpEarned: t("weekly_stats.xp_earned", "XP earned"),
        dayStreak: t("weekly_stats.day_streak", "Day streak"),
        streakSticker: t("home.progress.streak_sticker", "12 days!"),
        you: t("home.progress.you", "You"),
        outfitsTitle: t("home.progress.outfits_title", "Level up, dress up"),
        outfitsBody: t(
          "home.progress.outfits_body",
          "Every level unlocks a new outfit for your Donguri — from a mohawk to a full dinosaur suit.",
        ),
        level: t("home.progress.level", "Level 7"),
        nextLevel: t("home.progress.next_level", "Level 8"),
      }}
    />
  );
}
