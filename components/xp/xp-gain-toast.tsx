"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { formatXp, levelForXp } from "@/lib/levels";
import { useTranslations } from "@/components/i18n/locale-provider";

// How long the pill stays up, counting included, before it drops away —
// long enough to read the new total after the count finishes.
const VISIBLE_MS = 3500;
const COUNT_SECONDS = 1.2;
// A beat after it appears before counting starts, so the old total is seen.
const COUNT_DELAY_SECONDS = 0.5;

export type XpGain = {
  from: number;
  to: number;
  // A fresh id per gain, so two in a row each get their own pill.
  id: number;
};

// A small XP pill for a correct answer, in place of a counter that's always
// on screen: it fades in, counts up from the old total to the new one, then
// drops away. Floats over the page, so nothing around it moves.
export function XpGainToast({ gain }: { gain: XpGain | null }) {
  const [shown, setShown] = useState<XpGain | null>(gain);

  useEffect(() => {
    if (!gain) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- each new gain restarts the pill's show-then-hide cycle.
    setShown(gain);
    const timer = setTimeout(() => setShown(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [gain]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center sm:top-24">
      <AnimatePresence>
        {shown && (
          <motion.div
            key={shown.id}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <XpGainPill gain={shown} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// The pill itself, for places that show it in their own spot (the badge
// celebration). `delay` is how long after mounting the count starts.
export function XpGainPill({
  gain,
  delay = COUNT_DELAY_SECONDS,
}: {
  gain: Pick<XpGain, "from" | "to">;
  delay?: number;
}) {
  const t = useTranslations();
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(gain.from);
  const [display, setDisplay] = useState(reduceMotion ? gain.to : gain.from);
  // Count in halves only when a half is involved — a whole gain (41 → 42)
  // never passes through "41.5" on the way.
  const step = Number.isInteger(gain.from) && Number.isInteger(gain.to) ? 1 : 0.5;
  // The widest the number gets ("100" after "99", "41.5" when there's a
  // half), reserved up front so the pill never grows or shrinks as it
  // counts. Monospace digits, so character widths are exact.
  const numberWidth = `${String(Math.trunc(gain.to)).length + (step < 1 ? 2 : 0)}ch`;

  useEffect(() => {
    if (reduceMotion) return;
    // A short beat after it appears, so the count-up is seen.
    const controls = animate(count, gain.to, {
      duration: COUNT_SECONDS,
      delay,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest / step) * step),
    });
    return () => controls.stop();
  }, [count, delay, gain.to, reduceMotion, step]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-pill px-3 py-1.5 text-pill-foreground shadow-lg">
      <span className="rounded-full bg-pill-accent px-1.5 py-0.5 text-[10px] font-bold text-pill-accent-foreground">
        {t("xp_counter.level", "Lv {{level}}", { level: levelForXp(display) })}
      </span>
      <span
        className="inline-block text-right font-mono text-sm font-bold tabular-nums"
        style={{ minWidth: numberWidth }}
      >
        {formatXp(display)}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-pill-foreground/70">
        {t("xp_counter.xp", "XP")}
      </span>
      <span className="text-xs font-bold text-matcha">
        {t("xp_gain.plus", "+{{amount}}", { amount: formatXp(gain.to - gain.from) })}
      </span>
    </div>
  );
}
