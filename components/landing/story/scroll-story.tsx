"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

export type StoryAccent = "ai" | "sakura" | "kin" | "matcha";

// Each step's colours, written out in full so Tailwind finds them: the
// big backdrop disc that swells behind the mock-up, the step number badge,
// and the eyebrow text.
const ACCENTS: Record<StoryAccent, { disc: string; badge: string; eyebrow: string }> = {
  ai: { disc: "bg-ai-soft", badge: "bg-ai text-washi", eyebrow: "text-ai-dark" },
  sakura: { disc: "bg-sakura-soft", badge: "bg-sakura text-washi", eyebrow: "text-sakura-dark" },
  kin: { disc: "bg-kin/20", badge: "bg-kin text-ink-on-light", eyebrow: "text-acorn" },
  matcha: { disc: "bg-matcha-soft", badge: "bg-matcha text-washi", eyebrow: "text-matcha-dark" },
};

export type StoryCopy = {
  step: number;
  eyebrow: string;
  heading: string;
  body: string;
};

// One step of the landing page's story, pinned while you scroll past it:
// the section is several screens tall, its content sticks to the viewport,
// and `progress` runs 0 → 1 as you scroll through — the mock-up (the
// `children` render prop) plays out in step with it. Scrolling stays
// native, so a swipe or a trackpad works as normal; it's the animation
// that follows the scroll, not the other way round.
//
// With reduced motion asked for, it's an ordinary section at its normal
// height and `progress` is fixed at 1, so every mock-up shows finished.
export function ScrollStory({
  id,
  copy,
  accent,
  tone = "washi",
  screens = 2.6,
  children,
}: {
  id: string;
  copy: StoryCopy;
  accent: StoryAccent;
  tone?: "washi" | "washi-soft";
  // How tall the section is, in screens — more is a slower story.
  screens?: number;
  children: (progress: MotionValue<number>) => ReactNode;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // One value every mock-up animates from, for the life of the section:
  // it follows the scroll, or sits at 1 (finished) once reduced motion is
  // known to be on — which is only after hydration (see
  // usePrefersReducedMotion), so it can't be picked at first render.
  const progress = useMotionValue(0);
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (!reduceMotion) progress.set(value);
  });
  useEffect(() => {
    progress.set(reduceMotion ? 1 : scrollYProgress.get());
  }, [reduceMotion, progress, scrollYProgress]);
  const colours = ACCENTS[accent];

  // The text arrives first, and the disc swells behind the mock-up as the
  // step gets going.
  const textOpacity = useTransform(progress, [0, 0.1], [0, 1]);
  const textY = useTransform(progress, [0, 0.12], [60, 0]);
  const discScale = useTransform(progress, [0, 0.35], [0.15, 1]);
  const numberY = useTransform(progress, [0, 1], ["20%", "-20%"]);

  return (
    <section
      id={id}
      ref={ref}
      className={cn("relative scroll-mt-0", tone === "washi-soft" ? "bg-washi-soft" : "bg-washi")}
      style={{ height: reduceMotion ? undefined : `${screens * 100}svh` }}
    >
      <div
        className={cn(
          "relative overflow-hidden",
          reduceMotion ? "py-20" : "sticky top-0 flex h-svh items-center",
        )}
      >
        {/* The step's giant number, drifting up behind everything. */}
        <motion.span
          aria-hidden
          style={{ y: numberY }}
          className="pointer-events-none absolute -left-4 top-1/2 -translate-y-1/2 select-none font-nunito text-[18rem] font-black leading-none text-sumi/[0.04] sm:text-[26rem]"
        >
          {copy.step}
        </motion.span>

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 px-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-14">
          <motion.div style={{ opacity: textOpacity, y: textY }} className="text-center md:text-left">
            <p
              className={cn(
                "inline-flex items-center gap-2.5 font-nunito text-sm font-extrabold uppercase tracking-[0.16em]",
                colours.eyebrow,
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 -rotate-6 items-center justify-center rounded-xl text-lg shadow-sm",
                  colours.badge,
                )}
              >
                {copy.step}
              </span>
              {copy.eyebrow}
            </p>
            <h2 className="mt-4 font-nunito text-4xl font-black leading-[1.05] tracking-tight text-sumi text-balance sm:text-5xl lg:text-6xl">
              {copy.heading}
            </h2>
            {/* Dropped on short phone screens, so the pinned scene still fits. */}
            <p className="mx-auto mt-4 max-w-md text-base text-sumi-soft text-pretty max-md:[@media(max-height:760px)]:hidden sm:text-lg md:mx-0">
              {copy.body}
            </p>
          </motion.div>

          <div className="relative flex justify-center">
            {/* A solid disc in the step's colour, swelling behind the mock-up. */}
            <motion.span
              aria-hidden
              style={{ scale: discScale }}
              className={cn(
                "absolute top-1/2 left-1/2 -z-0 aspect-square w-[115%] -translate-x-1/2 -translate-y-1/2 rounded-full",
                colours.disc,
              )}
            />
            <div className="relative w-full max-w-sm origin-top max-md:[@media(max-height:760px)]:scale-90">
              {children(progress)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// A motion value that's `from` before `start`, `to` after `end`, and
// eases between — the building block every mock-up uses.
export function useStep(
  progress: MotionValue<number>,
  start: number,
  end: number,
  from = 0,
  to = 1,
) {
  return useTransform(progress, [start, end], [from, to], { clamp: true });
}
