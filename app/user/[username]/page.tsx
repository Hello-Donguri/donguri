import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { Award, BookOpen, CalendarHeart, EyeOff, Flame, Sparkles } from "lucide-react";
import { getPublicProfile } from "@/lib/dal";
import { earnedBadges } from "@/lib/badges";
import { formatXp, levelForXp } from "@/lib/levels";
import { Button } from "@/components/ui/button";
import { DonguriAvatar } from "@/components/icons/DonguriAvatar";
import { BadgeTile } from "@/components/badges/badge-tile";
import { getTranslator } from "@/lib/i18n/server";
import type { TFunction } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";

type PageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username.toLowerCase()} — Donguri` };
}

// Private cache scope, like loadCourseHome on the course page: the session
// read checks token expiry against `Date.now()`, and "last active" reads the
// clock too, which Cache Components only allows inside a cache scope during
// a (runtime) prerender. The settings page's visibility switch
// revalidates this page, which clears it.
async function loadPublicProfile(username: string) {
  "use cache: private";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });

  const profile = await getPublicProfile(username);
  if (!profile) return null;

  return {
    profile,
    badges: await earnedBadges(profile.id),
    // Worked out here rather than while rendering, so it reads the clock
    // inside the cache scope.
    lastActiveAgoMs: profile.lastActiveAt
      ? Date.now() - profile.lastActiveAt.getTime()
      : null,
  };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// There's no presence tracking — activity is only recorded as a learner
// answers or learns something, which happens every few seconds mid-session —
// so anything this recent counts as using the app right now.
const NOW_WINDOW = 5 * MINUTE;

// "Now", then the largest whole unit: minutes, hours, days, weeks, months,
// years ago. Intl handles the wording and plurals ("1 hour ago", "3時間前").
function lastActiveLabel(agoMs: number | null, t: TFunction, locale: Locale): string {
  if (agoMs === null) return t("user_profile.never_active", "Not yet");
  if (agoMs < NOW_WINDOW) return t("user_profile.active_now", "Now");

  const format = new Intl.RelativeTimeFormat(locale, { numeric: "always" });
  const days = Math.floor(agoMs / DAY);
  if (agoMs < HOUR) return format.format(-Math.floor(agoMs / MINUTE), "minute");
  if (agoMs < DAY) return format.format(-Math.floor(agoMs / HOUR), "hour");
  if (days < 7) return format.format(-days, "day");
  if (days < 30) return format.format(-Math.floor(days / 7), "week");
  if (days < 365) return format.format(-Math.floor(days / 30), "month");
  return format.format(-Math.floor(days / 365), "year");
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const [data, { t, locale }] = await Promise.all([
    loadPublicProfile(username),
    getTranslator(),
  ]);

  // Hidden profiles 404 for everyone but their owner, the same as a
  // username nobody has — so hiding doesn't reveal the account exists.
  if (!data) notFound();
  const { profile, badges, lastActiveAgoMs } = data;

  const memberSince = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(profile.memberSince);
  const activeNow = lastActiveAgoMs !== null && lastActiveAgoMs < NOW_WINDOW;
  const activeToday = lastActiveAgoMs !== null && lastActiveAgoMs < DAY;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:gap-8">
      {profile.hidden && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-card-border bg-washi-soft px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-sumi-soft">
            <EyeOff aria-hidden className="h-4 w-4 shrink-0" />
            {t("user_profile.hidden_notice", "Your profile is hidden — only you can see this page.")}
          </p>
          <Button href="/dashboard/settings" variant="outline" size="sm">
            {t("user_profile.change_in_settings", "Change in settings")}
          </Button>
        </div>
      )}

      <section className="relative overflow-hidden rounded-3xl border border-card-border bg-acorn-soft/50 px-6 py-8 shadow-sm sm:px-10 sm:py-10 dark:bg-kin/10">
        {/* Confetti specks, purely decorative. */}
        <span aria-hidden className="pointer-events-none absolute right-8 top-6 h-3 w-3 rotate-12 rounded-sm bg-sakura/60" />
        <span aria-hidden className="pointer-events-none absolute right-24 top-16 h-2 w-2 rounded-full bg-ai/50" />
        <span aria-hidden className="pointer-events-none absolute bottom-8 left-1/2 h-2.5 w-2.5 -rotate-12 rounded-sm bg-kin/70" />

        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:gap-10 sm:text-left">
          <div className="group relative shrink-0">
            <div className="flex h-44 w-44 items-center justify-center rounded-full bg-washi/80 shadow-inner ring-4 ring-washi sm:h-56 sm:w-56">
              <DonguriAvatar
                equippedAccessory={profile.equippedAccessory}
                className="profile-bob h-36 w-36 drop-shadow-md sm:h-48 sm:w-48"
              />
            </div>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 -rotate-3 rounded-full bg-acorn px-3 py-1 font-nunito text-sm font-extrabold text-ink-on-dark shadow-md ring-2 ring-washi">
              {t("xp_counter.level", "Lv {{level}}", { level: levelForXp(profile.xp) })}
            </span>
          </div>

          <div className="flex min-w-0 flex-col items-center gap-4 sm:items-start">
            <h1 className="max-w-full font-nunito text-4xl font-extrabold leading-tight text-sumi wrap-anywhere sm:text-5xl">
              <span className="text-acorn">@</span>
              {profile.username}
            </h1>

            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full bg-washi/80 px-3 py-1.5 text-sm font-semibold text-sumi shadow-sm ring-1 ring-card-border">
                <span className="relative flex h-2.5 w-2.5">
                  {activeNow && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-matcha opacity-60 motion-reduce:hidden" />
                  )}
                  <span
                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${activeToday ? "bg-matcha" : "bg-sumi/25"}`}
                  />
                </span>
                <span className="text-sumi-soft">{t("user_profile.last_active", "Last active")}</span>
                {lastActiveLabel(lastActiveAgoMs, t, locale)}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-washi/80 px-3 py-1.5 text-sm font-semibold text-sumi shadow-sm ring-1 ring-card-border">
                <CalendarHeart aria-hidden className="h-4 w-4 text-sakura" />
                <span className="text-sumi-soft">{t("user_profile.member_since", "Member since")}</span>
                {memberSince}
              </span>
            </div>
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          icon={<Sparkles aria-hidden className="h-5 w-5 fill-sakura/20 text-sakura" />}
          tileClass="bg-sakura-soft"
          iconClass="bg-sakura/10"
          label={t("user_profile.total_xp", "Total XP")}
          value={formatXp(profile.xp)}
        />
        <StatTile
          icon={<Flame aria-hidden className="h-5 w-5 fill-kin text-kin" />}
          tileClass="bg-kin/15"
          iconClass="bg-kin/20"
          label={t("user_profile.weekly_xp", "XP this week")}
          value={formatXp(profile.weeklyXp)}
        />
        <StatTile
          icon={<BookOpen aria-hidden className="h-5 w-5 fill-ai/20 text-ai" />}
          tileClass="bg-ai-soft"
          iconClass="bg-ai/10"
          label={t("user_profile.words_learnt", "Words learnt")}
          value={String(profile.wordsLearnt)}
        />
        <StatTile
          icon={<Award aria-hidden className="h-5 w-5 text-matcha-dark" />}
          tileClass="bg-matcha-soft"
          iconClass="bg-matcha/15"
          label={t("user_profile.badges_earned", "Badges earned")}
          value={String(badges.length)}
        />
      </dl>

      <section className="rounded-3xl border border-card-border bg-washi-soft p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-nunito text-xl font-extrabold text-sumi">
          <Award aria-hidden className="h-5 w-5 text-acorn" />
          {t("user_profile.badges", "Badges")}
        </h2>
        {badges.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-card-border py-8 text-center text-sm text-sumi-soft">
            {t("user_profile.no_badges", "No badges yet — the first one is just around the corner!")}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {badges.map((badge, index) => (
              <li
                key={badge.id}
                className={`transition-transform duration-200 hover:-translate-y-1 motion-reduce:transition-none ${
                  index % 2 === 0 ? "hover:-rotate-2" : "hover:rotate-2"
                }`}
              >
                <BadgeTile badge={badge} awardedAt={badge.awardedAt} t={t} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatTile({
  icon,
  tileClass,
  iconClass,
  label,
  value,
}: {
  icon: ReactNode;
  tileClass: string;
  iconClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-4 py-4 sm:px-5 ${tileClass}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        {icon}
      </span>
      <div className="flex min-w-0 flex-col-reverse">
        <dt className="text-xs text-sumi-soft">{label}</dt>
        <dd className="text-2xl font-bold leading-tight tabular-nums text-sumi">{value}</dd>
      </div>
    </div>
  );
}
