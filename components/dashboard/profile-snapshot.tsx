import Link from "next/link";
import { BookOpen, Flame, Sparkles, TrendingUp } from "lucide-react";
import { DonguriAvatar } from "@/components/icons/DonguriAvatar";
import { levelRingClass } from "@/components/donguri/level-ring";
import type { AccessoryId } from "@/lib/levels";
import { cn } from "@/lib/utils";

type Stat = { key: string; label: string; value: string };

const STAT_ICONS: Record<string, React.ReactNode> = {
  words: <BookOpen aria-hidden className="h-3.5 w-3.5 text-ai" strokeWidth={2.5} />,
  streak: <Flame aria-hidden className="h-3.5 w-3.5 fill-kin text-kin" strokeWidth={2.5} />,
  xp: <Sparkles aria-hidden className="h-3.5 w-3.5 text-sakura" strokeWidth={2.5} />,
  weekly: <TrendingUp aria-hidden className="h-3.5 w-3.5 text-matcha" strokeWidth={2.5} />,
};

// Beside the course page's greeting: the learner's Donguri, in their
// outfit and level ring with its level underneath, and four of the stats
// their profile shows, then their latest badges (`badges`) — kept compact
// so the action cards start near the top of the page. Donguri itself opens
// the full profile.
export function ProfileSnapshot({
  equippedAccessory,
  level,
  levelLabel,
  stats,
  profileHref,
  profileLabel,
  badges,
  today,
}: {
  equippedAccessory: AccessoryId | null;
  level: number;
  levelLabel: string;
  // Words, streak, XP, XP this week — keyed for their icons.
  stats: Stat[];
  profileHref: string;
  profileLabel: string;
  badges?: React.ReactNode;
  // Today's activity pills — hung over the card's bottom-right border once
  // there's room, inside the card below that.
  today?: React.ReactNode;
}) {
  return (
    // Badges below the stats when narrow, to their right once there's room
    // — sized by Greeting's `hero` container.
    <div
      className={cn(
        "relative flex w-full flex-col gap-4 rounded-3xl border border-card-border bg-washi-soft p-4 @xl/hero:flex-row @xl/hero:items-center @4xl/hero:w-auto",
        // Room under the card for the hanging pills, and inside it for the
        // badges to clear them.
        today && "@xl/hero:mb-3 @xl/hero:pb-6",
      )}
    >
      <div className="flex min-w-0 items-center gap-4 @xl/hero:flex-1 @4xl/hero:flex-none">
        <Link
          href={profileHref}
          prefetch
          aria-label={profileLabel}
          title={profileLabel}
          className="group relative shrink-0 rounded-full"
        >
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full bg-raised transition group-hover:scale-105",
              levelRingClass(level),
            )}
          >
            {/* The bob on a wrapper, so it never fights the plain mascot's
                own animation. */}
            <div className="profile-bob">
              <DonguriAvatar equippedAccessory={equippedAccessory} className="h-16 w-16" />
            </div>
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 -rotate-3 rounded-full bg-acorn px-2 py-0.5 font-nunito text-xs font-extrabold whitespace-nowrap text-ink-on-dark ring-2 ring-washi-soft">
            {levelLabel}
          </span>
        </Link>

        <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2.5">
          {stats.map((stat) => (
            <div key={stat.key} className="flex min-w-0 flex-col-reverse">
              <dt className="flex items-center gap-1 truncate text-[11px] font-semibold text-sumi-soft">
                {STAT_ICONS[stat.key]}
                {stat.label}
              </dt>
              <dd className="font-nunito text-xl leading-tight font-black tabular-nums text-sumi">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {badges && (
        <div className="border-t border-card-border pt-3 empty:hidden @xl/hero:self-stretch @xl/hero:border-t-0 @xl/hero:border-l @xl/hero:pt-0 @xl/hero:pl-4">
          {badges}
        </div>
      )}

      {today && (
        <div className="empty:hidden @xl/hero:absolute @xl/hero:right-5 @xl/hero:bottom-0 @xl/hero:translate-y-1/2">
          {today}
        </div>
      )}
    </div>
  );
}
