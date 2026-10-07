"use client";

import Image from "next/image";
import { MotionConfig, motion, type Variants } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { BookOpen, Flame, Sparkles, Target } from "lucide-react";
import { StreakChart } from "@/components/vocab/streak-chart";
import { LeaderboardList } from "@/components/leaderboard/leaderboard-row";
import type { AccessoryId } from "@/lib/levels";
import type { DailyActivityCount, LeaderboardEntry } from "@/lib/definitions";

export type ProgressLabels = {
  eyebrow: string;
  heading: string;
  body: string;
  wordsLearnt: string;
  accuracy: string;
  xpEarned: string;
  dayStreak: string;
  streakSticker: string;
  you: string;
  outfitsTitle: string;
  outfitsBody: string;
  level: string;
  nextLevel: string;
};

// Two weeks of made-up activity for the real dashboard chart — fixed
// dates, so the server and browser renders agree.
const ACTIVITY: DailyActivityCount[] = [
  [3, 0, 4, 1],
  [6, 1, 8, 2],
  [0, 0, 5, 0],
  [3, 2, 10, 3],
  [6, 0, 7, 1],
  [9, 3, 12, 3],
  [3, 1, 6, 2],
  [6, 2, 9, 3],
  [3, 0, 11, 1],
  [9, 1, 8, 3],
  [6, 3, 14, 2],
  [3, 1, 10, 3],
  [9, 2, 13, 3],
  [6, 1, 9, 2],
].map(([vocab, grammar, review, challenge], index) => ({
  date: `2026-09-${String(17 + index).padStart(2, "0")}`,
  vocab,
  grammar,
  review,
  challenge,
}));

// Made-up learners, each a Donguri in a different outfit.
function leaderboard(you: string): LeaderboardEntry[] {
  const rows: [string, number, number, AccessoryId | null, boolean][] = [
    ["yuki_t", 1840, 214, "viking", false],
    [you, 1622, 198, "pirate", true],
    ["haru.eng", 2310, 176, "dinosaur", false],
    ["mika_k", 960, 141, "flower", false],
    ["ken.s", 1205, 118, "shark", false],
  ];
  return rows.map(([name, xp, weeklyXp, equippedAccessory, isSelf]) => ({
    id: name,
    name,
    xp,
    weeklyXp,
    equippedAccessory,
    isSelf,
    profileHref: null,
  }));
}

const OUTFITS: { id: string; image: string }[] = [
  { id: "mohawk", image: "/costumes/mohawk.webp" },
  { id: "viking", image: "/costumes/viking.webp" },
  { id: "dinosaur", image: "/costumes/dinosaur.webp" },
  { id: "pirate", image: "/costumes/pirate.webp" },
  { id: "shark", image: "/costumes/shark.webp" },
];

// Cards pop up and settle as they scroll into view, each with its own
// slight tilt.
const pop = (rotate: number): Variants => ({
  hidden: { opacity: 0, y: 60, rotate: rotate * 3, scale: 0.92 },
  shown: {
    opacity: 1,
    y: 0,
    rotate,
    scale: 1,
    transition: { type: "spring", stiffness: 140, damping: 16 },
  },
});

// The progress section: the real dashboard pieces — this week's stats, the
// activity chart and the leaderboard — filled with made-up data, plus
// Donguri's outfits and a level bar filling up. Fun, but recognisably the
// app.
export function ProgressShowcase({ labels }: { labels: ProgressLabels }) {
  const reduceMotion = usePrefersReducedMotion();
  const from = reduceMotion ? "shown" : "hidden";

  return (
    // reducedMotion="user": for anyone who's asked for less motion, cards
    // just fade in rather than flying.
    <MotionConfig reducedMotion="user">
      <section id="progress" className="bg-washi px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={from}
            whileInView="shown"
            viewport={{ once: true, amount: 0.6 }}
            variants={pop(0)}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="font-nunito text-sm font-extrabold uppercase tracking-[0.16em] text-acorn">
              {labels.eyebrow}
            </p>
            <h2 className="mt-3 font-nunito text-4xl font-black tracking-tight text-sumi text-balance sm:text-5xl">
              {labels.heading}
            </h2>
            <p className="mt-3 text-lg text-sumi-soft text-pretty">
              {labels.body}
            </p>
          </motion.div>

          <div className="mt-14 grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            {/* This week + the activity chart, as on the course page. */}
            <motion.div
              initial={from}
              whileInView="shown"
              viewport={{ once: true, amount: 0.3 }}
              variants={pop(-1)}
              className="relative"
            >
              <div
                aria-hidden
                className="absolute -inset-2 -z-10 rotate-1 rounded-[2rem] bg-ai-soft"
              />
              <div className="overflow-hidden rounded-3xl border border-card-border bg-washi-soft shadow-lg">
                <div className="grid grid-cols-2 gap-3 p-5">
                  <StatTile
                    icon={<BookOpen className="h-5 w-5 fill-ai/20 text-ai" />}
                    tileClass="bg-ai-soft"
                    iconClass="bg-ai/10"
                    value="18"
                    label={labels.wordsLearnt}
                  />
                  <StatTile
                    icon={<Target className="h-5 w-5 text-matcha-dark" />}
                    tileClass="bg-matcha-soft"
                    iconClass="bg-matcha/15"
                    value="92%"
                    label={labels.accuracy}
                  />
                  <StatTile
                    icon={
                      <Sparkles className="h-5 w-5 fill-sakura/20 text-sakura" />
                    }
                    tileClass="bg-sakura-soft"
                    iconClass="bg-sakura/10"
                    value="146"
                    label={labels.xpEarned}
                  />
                  <StatTile
                    icon={<Flame className="h-5 w-5 fill-kin text-kin" />}
                    tileClass="bg-kin/15"
                    iconClass="bg-kin/20"
                    value="12"
                    label={labels.dayStreak}
                  />
                </div>
                <div className="border-t border-card-border">
                  <StreakChart
                    data={ACTIVITY}
                    currentStreak={12}
                    longestStreak={21}
                    activeToday
                  />
                </div>
              </div>

              <motion.span
                aria-hidden
                initial={reduceMotion ? false : { scale: 0, rotate: -60 }}
                whileInView={{ scale: 1, rotate: -10 }}
                viewport={{ once: true }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 10,
                  delay: 0.4,
                }}
                className="absolute -top-6 -left-4 flex h-20 w-20 flex-col items-center justify-center rounded-full border-4 border-raised bg-kin text-center font-nunito leading-none text-ink-on-light shadow-lg sm:-left-6"
              >
                <Flame className="h-5 w-5 fill-current" />
                <span className="mt-0.5 px-1 text-[11px] font-black">
                  {labels.streakSticker}
                </span>
              </motion.span>
            </motion.div>

            {/* The leaderboard, as on the course page. */}
            <motion.div
              initial={from}
              whileInView="shown"
              viewport={{ once: true, amount: 0.3 }}
              variants={pop(1.5)}
              className="relative"
            >
              <div
                aria-hidden
                className="absolute -inset-2 -z-10 -rotate-2 rounded-[2rem] bg-matcha-soft"
              />
              <div className="rounded-3xl border border-card-border bg-washi p-4 shadow-lg sm:p-5 [&>section]:mt-0">
                <LeaderboardList
                  entries={leaderboard(labels.you)}
                  selfTotalXp={null}
                  emptyMessage=""
                />
              </div>
            </motion.div>
          </div>

          {/* Levels and outfits. */}
          <motion.div
            initial={from}
            whileInView="shown"
            viewport={{ once: true, amount: 0.4 }}
            variants={pop(-0.5)}
            className="relative mt-10"
          >
            <div
              aria-hidden
              className="absolute -inset-2 -z-10 rotate-[0.6deg] rounded-[2rem] bg-sakura-soft"
            />
            <div className="flex flex-col gap-6 rounded-3xl border border-card-border bg-raised p-6 shadow-lg sm:p-8 md:flex-row md:items-center">
              <div className="md:max-w-xs">
                <h3 className="font-nunito text-2xl font-black text-sumi">
                  {labels.outfitsTitle}
                </h3>
                <p className="mt-2 text-sm text-sumi-soft text-pretty">
                  {labels.outfitsBody}
                </p>

                <div className="mt-5">
                  <div className="flex justify-between text-xs font-bold text-sumi-soft">
                    <span>{labels.level}</span>
                    <span>{labels.nextLevel}</span>
                  </div>
                  <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-sumi/10">
                    <motion.div
                      initial={reduceMotion ? false : { width: "8%" }}
                      whileInView={{ width: "78%" }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 1.4,
                        ease: "easeOut",
                        delay: 0.3,
                      }}
                      className="h-full rounded-full bg-sakura"
                      style={{ width: "78%" }}
                    />
                  </div>
                </div>
              </div>

              <ul className="grid flex-1 grid-cols-5 gap-2 sm:gap-3">
                {OUTFITS.map((outfit, index) => (
                  <motion.li
                    key={outfit.id}
                    initial={
                      reduceMotion
                        ? false
                        : { opacity: 0, y: 40, rotate: index % 2 ? 12 : -12 }
                    }
                    whileInView={{
                      opacity: 1,
                      y: 0,
                      rotate: index % 2 ? 3 : -3,
                    }}
                    whileHover={{ rotate: 0, y: -8, scale: 1.08 }}
                    viewport={{ once: true }}
                    transition={{
                      type: "spring",
                      stiffness: 180,
                      damping: 12,
                      delay: 0.15 * index,
                    }}
                    className="rounded-2xl bg-washi-soft p-1.5 sm:p-2"
                  >
                    <Image
                      src={outfit.image}
                      alt=""
                      width={1224}
                      height={1285}
                      sizes="140px"
                      className="h-auto w-full"
                    />
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  );
}

// The course page's stat tile (see ActivityOverviewCard), in its wide
// layout: icon on the left, value and label stacked beside it.
function StatTile({
  icon,
  tileClass,
  iconClass,
  value,
  label,
}: {
  icon: React.ReactNode;
  tileClass: string;
  iconClass: string;
  value: string;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${tileClass}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconClass}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tabular-nums text-sumi">
          {value}
        </p>
        <p className="mt-1 text-xs leading-tight text-sumi-soft">{label}</p>
      </div>
    </div>
  );
}
