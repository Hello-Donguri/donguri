import Image from "next/image";
import { ChartColumn, Flame, Shirt, Trophy, Users } from "lucide-react";
import { Section, SectionHeading, ICON_CHIP } from "@/components/landing/section";
import { cn } from "@/lib/utils";
import type { TFunction } from "@/lib/i18n/translate";

const OUTFITS = ["mohawk", "viking", "dinosaur", "pirate"];

export function Progress({ t }: { t: TFunction }) {
  // Illustrative activity for the mini chart — heights as a share of the
  // tallest day.
  const week = [40, 65, 30, 80, 55, 100, 70];

  return (
    <Section>
      <SectionHeading
        accent="kin"
        eyebrow={t("home.progress.eyebrow", "Progress")}
        heading={t("home.progress.heading", "Small steps that visibly add up.")}
        subtext={t(
          "home.progress.subtext",
          "Everything you do earns XP, keeps your streak alive, and shows up on your dashboard.",
        )}
      />

      <div className="mt-12 grid gap-4 md:grid-cols-6">
        {/* Levels + outfits: the widest card, with the costumed Donguri. */}
        <div className="flex flex-col overflow-hidden rounded-3xl border border-card-border bg-washi-soft md:col-span-4">
          <div className="p-6 sm:p-7">
            <Chip icon={<Shirt aria-hidden className="h-5 w-5" />} accent="sakura" />
            <h3 className="mt-4 text-lg font-semibold text-sumi">
              {t("home.progress.levels_title", "Level up, and dress up Donguri")}
            </h3>
            <p className="mt-1.5 max-w-md text-sm text-sumi-soft text-pretty">
              {t(
                "home.progress.levels_body",
                "XP builds towards your next level, and each level unlocks new outfits for your Donguri, from a mohawk to a full dinosaur suit.",
              )}
            </p>
          </div>
          {/* A few of the real unlockable costumes (ACCESSORIES in lib/levels.ts). */}
          <ul className="mt-auto grid grid-cols-4 gap-2 px-6 pb-6">
            {OUTFITS.map((outfit) => (
              <li key={outfit} className="rounded-2xl bg-washi p-2">
                <Image
                  src={`/costumes/${outfit}.webp`}
                  alt=""
                  width={1224}
                  height={1285}
                  sizes="160px"
                  className="h-auto w-full"
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Streak */}
        <div className="flex flex-col rounded-3xl border border-card-border bg-washi-soft p-6 sm:p-7 md:col-span-2">
          <Chip icon={<Flame aria-hidden className="h-5 w-5" />} accent="kin" />
          <h3 className="mt-4 text-lg font-semibold text-sumi">
            {t("home.progress.streak_title", "Keep your streak going")}
          </h3>
          <p className="mt-1.5 text-sm text-sumi-soft text-pretty">
            {t(
              "home.progress.streak_body",
              "Learn, review or chat once a day. The longer your streak, the bigger your daily XP bonus.",
            )}
          </p>
          <div className="mt-auto flex items-baseline gap-2 pt-6">
            <span className="font-nunito text-5xl font-extrabold text-sumi">12</span>
            <span className="text-sm font-medium text-sumi-soft">
              {t("home.progress.streak_days", "day streak")}
            </span>
          </div>
        </div>

        {/* Activity chart */}
        <div className="flex flex-col rounded-3xl border border-card-border bg-washi-soft p-6 sm:p-7 md:col-span-3">
          <Chip icon={<ChartColumn aria-hidden className="h-5 w-5" />} accent="ai" />
          <h3 className="mt-4 text-lg font-semibold text-sumi">
            {t("home.progress.activity_title", "See every day's work")}
          </h3>
          <p className="mt-1.5 text-sm text-sumi-soft text-pretty">
            {t(
              "home.progress.activity_body",
              "Words and grammar learnt, reviews done and challenges finished, day by day, plus your weekly accuracy.",
            )}
          </p>
          <div aria-hidden="true" className="mt-6 flex h-24 items-end gap-2">
            {week.map((height, index) => (
              <span
                key={index}
                className="flex-1 rounded-t-md bg-chart-vocab"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        {/* Leaderboards */}
        <div className="flex flex-col rounded-3xl border border-card-border bg-washi-soft p-6 sm:p-7 md:col-span-3">
          <div className="flex gap-2">
            <Chip icon={<Trophy aria-hidden className="h-5 w-5" />} accent="matcha" />
            <Chip icon={<Users aria-hidden className="h-5 w-5" />} accent="matcha" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-sumi">
            {t("home.progress.leaderboard_title", "Learn alongside friends")}
          </h3>
          <p className="mt-1.5 text-sm text-sumi-soft text-pretty">
            {t(
              "home.progress.leaderboard_body",
              "See this week's top learners, add friends by username, and compare your XP on your own friends board.",
            )}
          </p>
          <ol className="mt-5 flex flex-col gap-2 text-sm">
            {[
              { name: "yuki_t", xp: 214 },
              { name: t("home.progress.you", "You"), xp: 198, you: true },
              { name: "haru.eng", xp: 176 },
            ].map((row, index) => (
              <li
                key={row.name}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2",
                  row.you ? "bg-ai-soft font-semibold text-ai-dark" : "bg-washi text-sumi",
                )}
              >
                <span className="w-4 text-center font-bold">{index + 1}</span>
                <span className="flex-1">{row.name}</span>
                <span>{row.xp} XP</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}

function Chip({
  icon,
  accent,
}: {
  icon: React.ReactNode;
  accent: "ai" | "matcha" | "sakura" | "kin";
}) {
  return (
    <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", ICON_CHIP[accent])}>
      {icon}
    </span>
  );
}
