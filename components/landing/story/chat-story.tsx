"use client";

import Image from "next/image";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { ScrollStory, useStep, type StoryCopy } from "@/components/landing/story/scroll-story";

export type ChatLabels = {
  hello: string;
  todaysWord: string;
  online: string;
  complete: string;
  try: string;
  scores: { label: string; score: number }[];
};

// Step 4: meeting Charles. He pops up big with a hello, then settles into
// the chat's header while the conversation plays out — his question, the
// "typing" dots, the learner's reply using today's word, his answer — and
// the result comes in: challenge complete, a more natural way to say it,
// and the four scores. Styled after the real chat
// (components/vocab/daily-challenge-chat.tsx).
export function ChatStory({ copy, labels }: { copy: StoryCopy; labels: ChatLabels }) {
  return (
    <ScrollStory id="daily-challenge" copy={copy} accent="matcha" tone="washi-soft" screens={3}>
      {(progress) => <ChatScene progress={progress} labels={labels} />}
    </ScrollStory>
  );
}

function ChatScene({ progress, labels }: { progress: MotionValue<number>; labels: ChatLabels }) {
  // Charles's entrance: in big and wobbly, saying hello…
  const charlesScale = useTransform(progress, [0.02, 0.1, 0.13, 0.24, 0.32], [0, 1.15, 1, 1, 0], { clamp: true });
  const charlesRotate = useTransform(progress, [0.02, 0.1, 0.16, 0.2], [-30, 8, -4, 0], { clamp: true });
  const helloOpacity = useTransform(progress, [0.1, 0.14, 0.24, 0.28], [0, 1, 1, 0], { clamp: true });
  const helloScale = useTransform(progress, [0.1, 0.14], [0.5, 1], { clamp: true });

  // …then the chat window takes over.
  const chatOpacity = useStep(progress, 0.28, 0.34);
  const chatScale = useTransform(progress, [0.28, 0.34], [0.85, 1], { clamp: true });

  return (
    <div className="relative min-h-[28rem]">
      <motion.div
        style={{ scale: charlesScale, rotate: charlesRotate }}
        className="absolute inset-x-0 top-6 z-20 mx-auto flex w-56 flex-col items-center"
      >
        <motion.p
          style={{ opacity: helloOpacity, scale: helloScale }}
          className="relative mb-3 rounded-3xl bg-raised px-5 py-3 font-nunito text-xl font-black text-sumi shadow-lg"
        >
          {labels.hello}
          <span aria-hidden className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-raised" />
        </motion.p>
        <Image src="/images/charles.webp" alt="" width={1254} height={1254} className="h-44 w-44 drop-shadow-lg" />
        <span className="-mt-3 rounded-full bg-matcha px-4 py-1 font-nunito text-sm font-black text-washi shadow-md">
          Charles Duck
        </span>
      </motion.div>

      <motion.div
        style={{ opacity: chatOpacity, scale: chatScale }}
        className="relative z-10 overflow-hidden rounded-4xl border border-card-border bg-raised shadow-xl"
      >
        <div className="flex items-center gap-3 border-b border-card-border bg-washi px-4 py-3">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-acorn-soft">
            <Image src="/images/charles.webp" alt="" width={1254} height={1254} className="h-9 w-9" />
            <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-matcha ring-2 ring-washi" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sumi">Charles Duck</p>
            <p className="text-xs text-sumi-soft">{labels.online}</p>
          </div>
          <span className="rounded-full bg-matcha-soft px-2.5 py-1 text-[11px] font-semibold text-matcha-dark">
            {labels.todaysWord} <strong>because</strong>
          </span>
        </div>

        <div className="flex flex-col gap-2.5 bg-washi-soft/50 px-4 py-4">
          <Bubble progress={progress} at={0.36} from="charles">
            Hi Yuki! Did you do anything fun this weekend?
          </Bubble>
          <Typing progress={progress} start={0.42} end={0.48} />
          <Bubble progress={progress} at={0.48} from="you">
            Yes! I went to a cafe{" "}
            <mark className="rounded bg-washi/25 px-0.5 font-bold text-washi">because</mark> it was raining.
          </Bubble>
          <Bubble progress={progress} at={0.56} from="charles">
            Smart move! Cafes are the best on rainy days ☕
          </Bubble>

          <Result progress={progress} labels={labels} />
        </div>
      </motion.div>
    </div>
  );
}

function Bubble({
  progress,
  at,
  from,
  children,
}: {
  progress: MotionValue<number>;
  at: number;
  from: "charles" | "you";
  children: React.ReactNode;
}) {
  const opacity = useStep(progress, at, at + 0.04);
  const y = useStep(progress, at, at + 0.05, 24, 0);
  const scale = useTransform(progress, [at, at + 0.04, at + 0.06], [0.6, 1.05, 1], { clamp: true });

  return (
    <motion.p
      style={{ opacity, y, scale, transformOrigin: from === "you" ? "right bottom" : "left bottom" }}
      className={
        from === "you"
          ? "max-w-[85%] self-end rounded-3xl rounded-br-md bg-ai px-4 py-2.5 text-sm text-washi shadow-sm"
          : "max-w-[85%] self-start rounded-3xl rounded-bl-md border border-card-border bg-raised px-4 py-2.5 text-sm text-sumi shadow-sm"
      }
    >
      {children}
    </motion.p>
  );
}

// The "…" while the learner is typing — there, then gone.
function Typing({ progress, start, end }: { progress: MotionValue<number>; start: number; end: number }) {
  const opacity = useTransform(progress, [start, start + 0.01, end - 0.01, end], [0, 1, 1, 0], { clamp: true });
  const height = useTransform(progress, [start, start + 0.01, end - 0.01, end], [0, 36, 36, 0], { clamp: true });

  return (
    <motion.div style={{ opacity, height }} className="self-end overflow-hidden">
      <span className="inline-flex gap-1 rounded-3xl rounded-br-md bg-ai-soft px-4 py-3">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="h-2 w-2 animate-bounce rounded-full bg-ai"
            style={{ animationDelay: `${dot * 120}ms` }}
          />
        ))}
      </span>
    </motion.div>
  );
}

// Challenge complete: the green banner, the "Try" rewrite and the scores,
// each landing in turn, and an XP sticker slapped on top.
function Result({ progress, labels }: { progress: MotionValue<number>; labels: ChatLabels }) {
  const bannerOpacity = useStep(progress, 0.64, 0.68);
  const bannerScale = useTransform(progress, [0.64, 0.68, 0.7], [0.7, 1.05, 1], { clamp: true });
  const tryOpacity = useStep(progress, 0.7, 0.75);
  const tryY = useStep(progress, 0.7, 0.75, 20, 0);
  const xpScale = useTransform(progress, [0.86, 0.9, 0.93], [0, 1.4, 1], { clamp: true });
  const xpRotate = useStep(progress, 0.86, 0.93, -40, 12);

  return (
    <div className="relative mt-1 flex flex-col gap-2">
      <motion.p
        style={{ opacity: bannerOpacity, scale: bannerScale }}
        className="flex items-center gap-2 rounded-2xl bg-matcha-soft px-3 py-2 text-xs font-bold uppercase tracking-wide text-matcha-dark"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-matcha text-washi">
          <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
        {labels.complete}
      </motion.p>

      <motion.div style={{ opacity: tryOpacity, y: tryY }} className="rounded-2xl bg-ai-soft/70 px-3 py-2">
        <p className="text-[11px] font-semibold text-ai">{labels.try}</p>
        <p className="text-sm font-semibold text-ai">I went to a café because it was raining.</p>
      </motion.div>

      <dl className="grid grid-cols-4 gap-1.5">
        {labels.scores.map(({ label, score }, index) => (
          <Score key={label} progress={progress} index={index} label={label} score={score} />
        ))}
      </dl>

      <motion.span
        aria-hidden
        style={{ scale: xpScale, rotate: xpRotate }}
        className="absolute -top-4 -right-2 flex h-16 w-16 flex-col items-center justify-center rounded-full border-4 border-raised bg-kin font-nunito leading-none text-ink-on-light shadow-lg"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="text-lg font-black">+6</span>
        <span className="text-[10px] font-bold">XP</span>
      </motion.span>
    </div>
  );
}

function Score({
  progress,
  index,
  label,
  score,
}: {
  progress: MotionValue<number>;
  index: number;
  label: string;
  score: number;
}) {
  const start = 0.76 + index * 0.025;
  const opacity = useStep(progress, start, start + 0.03);
  const y = useStep(progress, start, start + 0.04, 16, 0);
  const counted = useTransform(progress, [start, start + 0.05], [0, score], { clamp: true });
  const shown = useTransform(counted, (value) => String(Math.round(value)));

  return (
    <motion.div style={{ opacity, y }} className="rounded-xl bg-raised px-1.5 py-1.5 text-center ring-1 ring-card-border">
      <dt className="truncate text-[10px] text-sumi-soft">{label}</dt>
      <dd className="font-nunito text-base font-extrabold text-sumi">
        <motion.span>{shown}</motion.span>
        <span className="text-[10px] font-semibold text-sumi-soft">/10</span>
      </dd>
    </motion.div>
  );
}
