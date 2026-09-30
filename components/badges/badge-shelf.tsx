import { BadgeTile } from "@/components/badges/badge-tile";
import type { EarnedBadge, LockedBadge } from "@/lib/badges";
import type { TFunction } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";

type BadgeShelfProps = {
  earned: EarnedBadge[];
  locked: LockedBadge[];
  t: TFunction;
  locale: Locale;
};

// The dashboard's badges, across every course: earned ones in full colour,
// newest first, then the ones still to earn, greyed out with how close the
// learner is. Nothing at all until an admin has made a badge.
export function BadgeShelf({ earned, locked, t, locale }: BadgeShelfProps) {
  if (earned.length === 0 && locked.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-sumi-soft">
          {t("badges.your_badges", "Your badges")}
        </h2>
        <p className="text-sm text-sumi-soft">
          {t("badges.earned_of", "{{earned}} of {{total}} earned", {
            earned: earned.length,
            total: earned.length + locked.length,
          })}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {earned.map((badge) => (
          <li key={badge.id}>
            <BadgeTile badge={badge} awardedAt={badge.awardedAt} t={t} locale={locale} />
          </li>
        ))}
        {locked.map((badge) => (
          <li key={badge.id}>
            <BadgeTile badge={badge} progress={badge.progress} t={t} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}
