"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CircleCheck } from "lucide-react";
import { useTranslations } from "@/components/i18n/locale-provider";

// The running score during a review — "7 / 9 correct · 78%" — in the same
// soft info pill as the profile page's "Last active" and "Member since":
// cream, a thin sage ring, a matcha icon, darker values with a muted
// percentage. Nothing until the first answer, then it fades in; after that
// it gives a small nudge each time it changes.
export function LiveScore({ correct, answered }: { correct: number; answered: number }) {
  const t = useTranslations();
  const reduceMotion = useReducedMotion();
  if (answered === 0) return null;

  const percent = Math.round((correct / answered) * 100);

  return (
    <motion.div
      // Mounts with the first answer, so this runs once: a fade (and a small
      // drift down, unless motion is reduced) into place.
      initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      aria-live="polite"
    >
      <motion.div
        // Re-keyed on every answer, so each one gets its own nudge — not on
        // the first, which the fade-in covers.
        key={answered}
        initial={reduceMotion || answered === 1 ? false : { scale: 0.94 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
        className="inline-flex items-center gap-2 rounded-full bg-washi/80 px-3 py-1.5 text-sm font-semibold text-sumi shadow-sm ring-1 ring-card-border"
      >
        <CircleCheck aria-hidden className="h-4 w-4 text-matcha" />
        <span className="tabular-nums">
          {t("live_score.correct", "{{correct}} / {{answered}} correct", { correct, answered })}
        </span>
        <span aria-hidden className="text-sumi-soft/50">
          ·
        </span>
        <span className="tabular-nums text-sumi-soft">{percent}%</span>
      </motion.div>
    </motion.div>
  );
}
