"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Flame, Star } from "lucide-react";
import { Confetti } from "@/components/ui/confetti";
import { Button } from "@/components/ui/button";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { XpEarned } from "@/components/xp/xp-earned";
import { XpCounter } from "@/components/xp/xp-counter";

export type ResultTile = {
  image: string;
  count: number;
  label: string;
  // Written out in full by the caller, so Tailwind finds them.
  tile: string;
  text: string;
};

// The end of a quiz or a review, as a celebration: confetti (a shower for
// a perfect score, a sprinkle otherwise), the badge bouncing in on a
// spinning sunburst, the XP earned spun up like a fruit machine with the
// running total under it, any bonuses slapped on as stickers once the
// reels stop, and two tiles with their mascots bobbing — on a raised card
// with a tilted backing, like the home page. Shared by the test and review
// sessions so the two always match. `children` is for the level-up modal.
// With reduced motion, there's no confetti, sunburst or bobbing.
export function SessionResults({
  perfect,
  title,
  subtitle,
  earned,
  earnedLabel,
  xp,
  perfectBonus,
  streakBonus,
  tiles,
  backHref,
  backLabel,
  children,
}: {
  perfect: boolean;
  title: string;
  subtitle: string;
  earned: number;
  earnedLabel: string;
  xp: number;
  // The bonus stickers' text — null when there's no such bonus.
  perfectBonus: string | null;
  streakBonus: string | null;
  tiles: [ResultTile, ResultTile];
  backHref: string;
  backLabel: string;
  children?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate mx-auto w-full max-w-lg">
      <div aria-hidden className="absolute -inset-2 -z-10 -rotate-1 rounded-[2rem] bg-matcha-soft" />
      <div className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-card-border bg-raised px-6 py-14 text-center shadow-lg sm:px-10">
        {!reduceMotion && <Confetti pieces={perfect ? 48 : 18} delay={0.2} />}

        <span className="relative flex h-24 w-24 items-center justify-center">
          {/* A slowly turning sunburst behind the badge. */}
          {!reduceMotion && (
            <motion.span
              aria-hidden
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, rotate: 360 }}
              transition={{
                scale: { type: "spring", stiffness: 200, damping: 12, delay: 0.1 },
                opacity: { duration: 0.3, delay: 0.1 },
                rotate: { duration: 14, ease: "linear", repeat: Infinity },
              }}
              className="absolute inset-0"
            >
              {Array.from({ length: 8 }, (_, ray) => (
                <span
                  key={ray}
                  className={`absolute top-1/2 left-1/2 h-3 w-12 -translate-y-1/2 origin-left rounded-full ${
                    perfect ? "bg-kin/40" : "bg-matcha/25"
                  }`}
                  style={{ rotate: `${ray * 45}deg` }}
                />
              ))}
            </motion.span>
          )}
          <motion.span
            initial={reduceMotion ? false : { scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 10 }}
            className={`relative flex h-16 w-16 items-center justify-center rounded-full shadow-md ${
              perfect ? "bg-kin text-ink-on-light" : "bg-matcha text-washi"
            }`}
          >
            {perfect ? (
              <Star aria-hidden className="h-8 w-8 fill-current" />
            ) : (
              <Check aria-hidden className="h-8 w-8" strokeWidth={3} />
            )}
          </motion.span>
        </span>

        <motion.div
          initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.15 }}
        >
          <PageTitle className="mt-3">{title}</PageTitle>
        </motion.div>

        <PageSubtitle className="mt-2 max-w-sm">{subtitle}</PageSubtitle>

        {/* What this session earned, spun up — then the running total. */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <XpEarned value={Math.max(0, earned)} />
          <p className="text-sm font-medium text-sumi-soft">{earnedLabel}</p>
          <XpCounter value={xp} className="mt-2" />

          {/* The bonuses, slapped on like stickers once the XP has spun up. */}
          {(perfectBonus || streakBonus) && (
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {perfectBonus && (
                <motion.span
                  initial={reduceMotion ? false : { scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: -4 }}
                  transition={{ type: "spring", stiffness: 380, damping: 11, delay: 2 }}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-raised bg-kin px-3.5 py-1.5 font-nunito text-sm font-black text-ink-on-light shadow-md"
                >
                  <Star aria-hidden className="h-4 w-4 fill-current" />
                  {perfectBonus}
                </motion.span>
              )}
              {streakBonus && (
                <motion.span
                  initial={reduceMotion ? false : { scale: 0, rotate: 30 }}
                  animate={{ scale: 1, rotate: 3 }}
                  transition={{ type: "spring", stiffness: 380, damping: 11, delay: 2.25 }}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-raised bg-sakura px-3.5 py-1.5 font-nunito text-sm font-black text-washi shadow-md"
                >
                  <Flame aria-hidden className="h-4 w-4 fill-current" />
                  {streakBonus}
                </motion.span>
              )}
            </div>
          )}
        </div>

        {/* Each tile pops in with its mascot, just after the XP count. */}
        <div className="mt-7 grid w-full grid-cols-2 gap-3">
          {tiles.map((item, index) => (
            <motion.div
              key={item.label}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.85, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.9 + index * 0.15 }}
              className={`flex flex-col items-center rounded-2xl px-4 pb-5 pt-4 ${item.tile}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a decorative mascot, sized by CSS. */}
              <img
                src={item.image}
                alt=""
                aria-hidden
                className={`h-20 w-auto object-contain drop-shadow-sm ${reduceMotion ? "" : "profile-bob"}`}
                style={{ animationDelay: `${index * -1.4}s` }}
              />
              <p className={`mt-2 font-nunito text-3xl font-extrabold ${item.text}`}>{item.count}</p>
              <p className={`mt-0.5 text-sm font-medium ${item.text} opacity-80`}>{item.label}</p>
            </motion.div>
          ))}
        </div>

        <Button
          href={backHref}
          prefetch
          size="lg"
          fullWidth
          className="mt-8 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
        >
          {backLabel}
        </Button>
      </div>

      {children}
    </section>
  );
}
