"use client";

import Image from "next/image";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { Check, MessageSquareQuote, Volume2 } from "lucide-react";
import { ScrollStory, useStep, type StoryCopy } from "@/components/landing/story/scroll-story";

export type LearnLabels = {
  vocabulary: string;
  listen: string;
  example: string;
  gotIt: string;
};

const WORD = "noodles";

// Step 1: a learn card building itself as you scroll — the picture bounces
// in, the word types out, its meaning and an example slide up (the word
// highlighted in both languages), and "Got it" gets pressed. Styled after
// the real learn card (components/vocab/word-lesson.tsx).
export function LearnStory({ copy, labels }: { copy: StoryCopy; labels: LearnLabels }) {
  return (
    <ScrollStory id="lessons" copy={copy} accent="ai">
      {(progress) => <LearnCard progress={progress} labels={labels} />}
    </ScrollStory>
  );
}

function LearnCard({ progress, labels }: { progress: MotionValue<number>; labels: LearnLabels }) {
  const cardY = useStep(progress, 0.02, 0.16, 220, 0);
  const cardRotate = useStep(progress, 0.02, 0.16, 12, -2);
  const cardOpacity = useStep(progress, 0.02, 0.1);

  const pictureScale = useTransform(progress, [0.14, 0.22, 0.26], [0, 1.15, 1], { clamp: true });
  const pictureRotate = useStep(progress, 0.14, 0.26, -25, 0);

  const typed = useTransform(progress, [0.24, 0.38], [0, WORD.length], { clamp: true });
  const word = useTransform(typed, (count) => WORD.slice(0, Math.round(count)) || " ");

  const listenOpacity = useStep(progress, 0.36, 0.42);
  const listenScale = useTransform(progress, [0.36, 0.4, 0.44], [0.6, 1.1, 1], { clamp: true });

  const meaningOpacity = useStep(progress, 0.42, 0.5);
  const meaningY = useStep(progress, 0.42, 0.5, 20, 0);

  const exampleOpacity = useStep(progress, 0.52, 0.6);
  const exampleY = useStep(progress, 0.52, 0.62, 40, 0);
  const sweep = useStep(progress, 0.62, 0.72);

  const buttonOpacity = useStep(progress, 0.74, 0.8);
  const buttonScale = useTransform(progress, [0.8, 0.84, 0.88], [1, 0.92, 1], { clamp: true });
  const tickScale = useTransform(progress, [0.86, 0.9, 0.93], [0, 1.3, 1], { clamp: true });
  const dotFill = useStep(progress, 0.88, 0.95);

  return (
    <motion.div
      style={{ y: cardY, rotate: cardRotate, opacity: cardOpacity }}
      className="rounded-4xl border border-card-border bg-raised p-5 shadow-xl sm:p-6"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-ai-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ai-dark">
          {labels.vocabulary}
        </span>
        <div aria-hidden className="flex items-center gap-1.5">
          <span className="h-2 w-7 rounded-full bg-ai" />
          <span className="relative h-2 w-7 overflow-hidden rounded-full bg-sumi/10">
            <motion.span style={{ scaleX: dotFill }} className="absolute inset-0 origin-left rounded-full bg-ai" />
          </span>
          <span className="h-2 w-7 rounded-full bg-sumi/10" />
        </div>
      </div>

      <motion.div
        style={{ scale: pictureScale, rotate: pictureRotate }}
        className="mt-4 flex h-28 items-center justify-center rounded-3xl bg-ai-soft/60 sm:h-32"
      >
        <Image src="/vocab-images/noodles.webp" alt="" width={1254} height={1254} className="h-full w-auto py-1" />
      </motion.div>

      <div className="mt-4 flex flex-col items-center text-center">
        <motion.p className="font-nunito text-5xl font-extrabold tracking-tight text-sumi">{word}</motion.p>

        <motion.span
          style={{ opacity: listenOpacity, scale: listenScale }}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-ai-soft px-4 py-1.5 text-sm font-semibold text-ai"
        >
          <Volume2 aria-hidden className="h-4 w-4" />
          {labels.listen}
        </motion.span>

        <motion.p
          lang="ja"
          style={{ opacity: meaningOpacity, y: meaningY }}
          className="mt-4 w-full border-t border-sumi/10 pt-4 text-2xl font-bold text-sumi"
        >
          麺、ヌードル
        </motion.p>
      </div>

      <motion.div
        style={{ opacity: exampleOpacity, y: exampleY }}
        className="mt-4 rounded-2xl bg-matcha-soft/80 px-4 py-3.5 text-left ring-1 ring-matcha/60"
      >
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-matcha/20 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-matcha-dark">
          <MessageSquareQuote aria-hidden className="h-3 w-3" />
          {labels.example}
        </p>
        <p className="text-lg leading-snug text-sumi">
          I had <Highlight sweep={sweep}>noodles</Highlight> for lunch today.
        </p>
        <p lang="ja" className="mt-1 text-sm text-sumi-soft">
          今日はお昼に<Highlight sweep={sweep}>麺</Highlight>を食べました。
        </p>
      </motion.div>

      <motion.div
        style={{ opacity: buttonOpacity, scale: buttonScale }}
        className="relative mt-4 flex h-12 items-center justify-center rounded-full bg-ai font-semibold text-washi shadow-sm"
      >
        {labels.gotIt}
        <motion.span
          style={{ scale: tickScale }}
          className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-raised bg-matcha text-washi shadow-md"
        >
          <Check aria-hidden className="h-4 w-4" strokeWidth={3} />
        </motion.span>
      </motion.div>
    </motion.div>
  );
}

// The highlighted word, its green marker swept on from the left.
function Highlight({ sweep, children }: { sweep: MotionValue<number>; children: string }) {
  return (
    <span className="relative inline-block px-0.5 font-semibold text-matcha-dark">
      <motion.span
        aria-hidden
        style={{ scaleX: sweep }}
        className="absolute inset-0 origin-left rounded bg-matcha/25"
      />
      <span className="relative">{children}</span>
    </span>
  );
}
