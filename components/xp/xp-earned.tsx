"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { useTranslations } from "@/components/i18n/locale-provider";

const COUNT_SECONDS = 1.4;
// A beat after the results appear before counting starts.
const START_DELAY_SECONDS = 0.6;

// "+12 XP" on a results screen, ticking up from zero — and on again if the
// total grows after (e.g. the perfect and streak bonuses landing a moment
// later). Laid out so nothing shifts as it counts: the whole number sits in
// a box as wide as the final value, and when halves are involved a ".5"
// slot after it always keeps its space, only shown on a half.
export function XpEarned({ value }: { value: number }) {
  const t = useTranslations();
  const reduceMotion = useReducedMotion();
  const [counted, setCounted] = useState(0);
  const shown = useRef(0);
  const started = useRef(false);
  // With reduced motion there's no count: just the number.
  const display = reduceMotion ? value : counted;

  useEffect(() => {
    if (reduceMotion) return;
    const controls = animate(shown.current, value, {
      duration: COUNT_SECONDS,
      delay: started.current ? 0 : START_DELAY_SECONDS,
      ease: "easeOut",
      onUpdate: (latest) => {
        shown.current = latest;
        setCounted(Math.round(latest * 2) / 2);
      },
    });
    started.current = true;
    return () => controls.stop();
  }, [value, reduceMotion]);

  const halves = !Number.isInteger(value);
  const whole = Math.trunc(display);
  const onHalf = display - whole >= 0.25;

  return (
    <p className="flex items-baseline justify-center font-nunito text-5xl font-extrabold text-matcha-dark">
      <span>+</span>
      <span className="inline-block text-right tabular-nums" style={{ minWidth: `${String(Math.trunc(value)).length}ch` }}>
        {whole}
      </span>
      {halves && (
        <span aria-hidden={!onHalf} className={`tabular-nums ${onHalf ? "" : "invisible"}`}>
          .5
        </span>
      )}
      <span className="ml-2 text-2xl">{t("xp_counter.xp", "XP")}</span>
    </p>
  );
}
