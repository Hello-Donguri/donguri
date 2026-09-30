import { Lock } from "lucide-react";
import { badgeGoal } from "@/lib/badge-metrics";
import type { BadgeView } from "@/lib/badges";
import type { TFunction } from "@/lib/i18n/translate";

// One badge card — earned in full colour, or locked: greyed out with the
// learner's progress (their best day or week, for a timed badge). Shared by
// the dashboard shelf and the course page's badge modal, so takes `t`
// rather than choosing a server or client translator itself.
export function BadgeTile({
  badge,
  progress,
  t,
}: {
  badge: BadgeView;
  // Set for a locked badge; left out for an earned one.
  progress?: number;
  t: TFunction;
}) {
  const locked = progress !== undefined;
  const goal = badgeGoal(badge.metric, badge.threshold, t, badge.timescale);

  if (!locked) {
    return (
      <div className="flex h-full flex-col items-center rounded-2xl border border-card-border bg-raised p-4 text-center shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element -- an admin-uploaded bunny.net image. */}
        <img src={badge.imageUrl} alt="" className="h-20 w-20 object-contain drop-shadow" />
        <p className="mt-2 font-semibold leading-snug text-sumi">{badge.name}</p>
        <p className="mt-0.5 text-xs text-sumi-soft">{goal}</p>
      </div>
    );
  }

  const percent = Math.round((progress / badge.threshold) * 100);
  return (
    <div className="flex h-full flex-col items-center rounded-2xl border border-dashed border-card-border bg-washi-soft/60 p-4 text-center">
      <span className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element -- an admin-uploaded bunny.net image. */}
        <img src={badge.imageUrl} alt="" className="h-20 w-20 object-contain opacity-35 grayscale" />
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-washi text-sumi-soft shadow-sm ring-1 ring-card-border">
          <Lock aria-hidden className="h-3.5 w-3.5" />
        </span>
      </span>
      <p className="mt-2 font-semibold leading-snug text-sumi-soft">{badge.name}</p>
      <p className="mt-0.5 text-xs text-sumi-soft">{goal}</p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={badge.threshold}
        aria-valuenow={progress}
        aria-label={t("badges.progress_label", "Progress to {{name}}", { name: badge.name })}
        className="mt-auto h-1.5 w-full translate-y-2 overflow-hidden rounded-full bg-sumi/10"
      >
        <span className="block h-full rounded-full bg-matcha" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-[11px] tabular-nums text-sumi-soft">
        {badge.timescale === "day"
          ? t("badges.best_day", "Best day: {{progress}} / {{target}}", {
              progress,
              target: badge.threshold,
            })
          : badge.timescale === "week"
            ? t("badges.best_week", "Best week: {{progress}} / {{target}}", {
                progress,
                target: badge.threshold,
              })
            : `${progress} / ${badge.threshold}`}
      </p>
    </div>
  );
}
