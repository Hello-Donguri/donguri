"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "@/components/i18n/locale-provider";

// A beat after the results appear before the reels start.
const START_DELAY_SECONDS = 0.6;
// How long the first reel spins; each reel to its right spins a little
// longer, so they stop one after another, left to right.
const SPIN_SECONDS = 1.1;
const STAGGER_SECONDS = 0.3;
// Full turns of 0-9 a reel makes before landing on its digit.
const TURNS = 2;
// Eases out with a little overshoot, so each reel settles with a bump.
const REEL_EASE = [0.15, 0.85, 0.35, 1.08] as const;

// "+12 XP" on a results screen, spun up like a fruit machine: each digit
// of the whole number is its own reel, spinning through 0-9 and landing
// one after another; once they've all stopped, a ".5" pops in after them
// if there's a half. When the total grows after (the perfect and streak
// bonuses landing a moment later), the reels spin again to the new total.
// With reduced motion there's no spin: just the number.
export function XpEarned({ value }: { value: number }) {
  const t = useTranslations();
  const reduceMotion = useReducedMotion();

  const whole = Math.trunc(value);
  const digits = String(whole).split("").map(Number);
  const half = !Number.isInteger(value);
  const lastReelStops = START_DELAY_SECONDS + SPIN_SECONDS + (digits.length - 1) * STAGGER_SECONDS;

  return (
    <p className="flex items-baseline justify-center font-nunito text-5xl font-extrabold text-matcha-dark">
      <span className="sr-only">{t("xp_counter.earned_aria", "+{{xp}} XP", { xp: value })}</span>
      <span aria-hidden className="flex items-baseline">
        <span>+</span>
        {reduceMotion ? (
          <span className="tabular-nums">
            {whole}
            {half && ".5"}
          </span>
        ) : (
          <>
            {/* Keyed by the total, so a new total spins the reels again. */}
            <span key={value} className="flex tabular-nums">
              {digits.map((digit, index) => (
                <Reel key={index} digit={digit} index={index} />
              ))}
            </span>
            {half && (
              <motion.span
                key={`half-${value}`}
                initial={{ opacity: 0, scale: 0.4, y: -12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: lastReelStops, type: "spring", stiffness: 500, damping: 14 }}
                className="inline-block origin-bottom-left tabular-nums"
              >
                .5
              </motion.span>
            )}
          </>
        )}
        <span className="ml-2 text-2xl">{t("xp_counter.xp", "XP")}</span>
      </span>
    </p>
  );
}

// One digit as a fruit-machine reel: a column of 0-9, a few times over,
// in a window one digit tall, spun down to land on `digit`.
function Reel({ digit, index }: { digit: number; index: number }) {
  const strip = Array.from({ length: TURNS * 10 + digit + 1 }, (_, position) => position % 10);

  return (
    <span className="relative inline-block h-[1.1em] overflow-hidden leading-[1.1em]">
      <motion.span
        className="flex flex-col"
        initial={{ y: "0em" }}
        animate={{ y: `-${(strip.length - 1) * 1.1}em` }}
        transition={{
          delay: START_DELAY_SECONDS,
          duration: SPIN_SECONDS + index * STAGGER_SECONDS,
          ease: REEL_EASE,
        }}
      >
        {strip.map((number, position) => (
          <span key={position} className="block h-[1.1em] text-center">
            {number}
          </span>
        ))}
      </motion.span>
    </span>
  );
}
