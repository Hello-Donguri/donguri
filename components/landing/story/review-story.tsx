"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { Check, Clock, Trophy } from "lucide-react";
import { ScrollStory, useStep, type StoryCopy } from "@/components/landing/story/scroll-story";
import { cn } from "@/lib/utils";

export type ReviewLabels = {
  stages: { name: string; wait: string }[];
  mastered: string;
};

// When the word card starts and finishes its trip down the stages.
const TRIP_START = 0.14;
const TRIP_END = 0.82;
// One row's height plus the gap below it (h-9 + gap-1.5), in px — how far
// the word moves per stage.
const ROW_PITCH = 42;

// Step 3: the review ladder — the word hops down the stages as you scroll,
// each one ticking off and the wait growing (15 minutes, 4 hours, 1 day…),
// until it lands on Mastered with a trophy. The stages and waits are the
// real ones (STAGES in lib/srs.ts).
export function ReviewStory({ copy, labels }: { copy: StoryCopy; labels: ReviewLabels }) {
  return (
    <ScrollStory id="reviews" copy={copy} accent="kin" screens={3}>
      {(progress) => <ReviewLadder progress={progress} labels={labels} />}
    </ScrollStory>
  );
}

function ReviewLadder({ progress, labels }: { progress: MotionValue<number>; labels: ReviewLabels }) {
  const rows = labels.stages.length + 1;
  const [reached, setReached] = useState(-1);

  // Which row the word has reached — drives each row's ticked/active look.
  const position = useTransform(progress, [TRIP_START, TRIP_END], [0, rows - 1], { clamp: true });
  useMotionValueEvent(position, "change", (value) => setReached(progress.get() < TRIP_START ? -1 : Math.round(value)));

  const cardOpacity = useStep(progress, 0.02, 0.1);
  const cardY = useStep(progress, 0.02, 0.14, 120, 0);
  const cardRotate = useStep(progress, 0.02, 0.14, -8, 1);

  // The word chip travels down the rows, with a little hop between each.
  const chipTop = useTransform(position, (value) => value * ROW_PITCH + 4);
  const hop = useTransform(position, (value) => -Math.abs(Math.sin(value * Math.PI)) * 14);
  const railFill = useTransform(position, [0, rows - 1], [0, 1]);
  const chipOpacity = useStep(progress, TRIP_START - 0.04, TRIP_START);

  const mastered = reached >= rows - 1;
  const trophyScale = useTransform(progress, [TRIP_END, TRIP_END + 0.05, TRIP_END + 0.08], [0, 1.4, 1], { clamp: true });

  return (
    <motion.div
      style={{ opacity: cardOpacity, y: cardY, rotate: cardRotate }}
      className="rounded-4xl border border-card-border bg-raised p-5 shadow-xl sm:p-6"
    >
      <div className="relative">
        {/* The rail the word travels down. */}
        <span aria-hidden className="absolute top-4 bottom-4 left-[1.05rem] w-1 rounded-full bg-sumi/10" />
        <motion.span
          aria-hidden
          style={{ scaleY: railFill }}
          className="absolute top-4 bottom-4 left-[1.05rem] w-1 origin-top rounded-full bg-kin"
        />

        <ol className="relative flex flex-col gap-1.5">
          {labels.stages.map((stage, index) => (
            <li
              key={index}
              className={cn(
                "flex h-9 items-center gap-3 rounded-xl pr-3 transition-colors duration-300",
                index === reached && "bg-kin/15",
              )}
            >
              <span
                className={cn(
                  "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300",
                  index < reached
                    ? "border-kin bg-kin text-ink-on-light"
                    : index === reached
                      ? "border-kin bg-raised text-acorn"
                      : "border-sumi/10 bg-raised text-sumi-soft",
                )}
              >
                {index < reached ? (
                  <Check aria-hidden className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </span>
              <span className={cn("flex-1 text-sm font-semibold", index <= reached ? "text-sumi" : "text-sumi-soft")}>
                {stage.name}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-sumi-soft">
                <Clock aria-hidden className="h-3 w-3" />
                {stage.wait}
              </span>
            </li>
          ))}

          <li
            className={cn(
              "flex h-11 items-center gap-3 rounded-xl pr-3 transition-colors duration-300",
              mastered && "bg-kin/25",
            )}
          >
            <motion.span
              style={{ scale: mastered ? trophyScale : 1 }}
              className={cn(
                "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                mastered ? "bg-kin text-ink-on-light shadow-md" : "border-2 border-sumi/10 bg-raised text-sumi-soft",
              )}
            >
              <Trophy aria-hidden className="h-4 w-4" />
            </motion.span>
            <span className={cn("font-nunito text-base font-black", mastered ? "text-sumi" : "text-sumi-soft")}>
              {labels.mastered}
              {mastered && " 🎉"}
            </span>
          </li>
        </ol>

        {/* The word itself, riding down the rail. */}
        <motion.span
          aria-hidden
          style={{ top: chipTop, y: hop, opacity: chipOpacity }}
          className="absolute right-20 rounded-full border-2 border-raised bg-ai px-3 py-1 font-nunito text-sm font-black text-washi shadow-lg"
        >
          noodles
        </motion.span>
      </div>
    </motion.div>
  );
}
