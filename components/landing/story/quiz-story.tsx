"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { ScrollStory, useStep, type StoryCopy } from "@/components/landing/story/scroll-story";
import { cn } from "@/lib/utils";

export type QuizLabels = {
  quiz: string;
  typeYourAnswer: string;
  check: string;
  whatDoesThisMean: string;
  fillBlank: string;
  greatJob: string;
};

const OPTIONS = ["皿", "麺", "箸", "スープ"];
const RIGHT = 1;
const ANSWER = "noodles";

// Little dots that burst out of the right answer, in the app's colours.
const CONFETTI = [
  { x: -70, y: -50, className: "bg-sakura" },
  { x: 60, y: -60, className: "bg-kin" },
  { x: -50, y: 40, className: "bg-ai" },
  { x: 80, y: 30, className: "bg-matcha" },
  { x: 0, y: -80, className: "bg-sakura" },
  { x: 20, y: 60, className: "bg-kin" },
];

// Step 2: a quiz playing out as you scroll — the options fly in, the right
// one is tapped and goes green with a burst and +1 XP, then the card flips
// to a fill-in-the-blank that's typed in and marked right. Styled after
// the quiz screens (components/vocab/test-session.tsx, session-ui.tsx).
export function QuizStory({ copy, labels }: { copy: StoryCopy; labels: QuizLabels }) {
  return (
    <ScrollStory id="quizzes" copy={copy} accent="sakura" tone="washi-soft">
      {(progress) => <QuizCard progress={progress} labels={labels} />}
    </ScrollStory>
  );
}

function QuizCard({ progress, labels }: { progress: MotionValue<number>; labels: QuizLabels }) {
  const cardScale = useTransform(progress, [0.02, 0.12, 0.16], [0.4, 1.06, 1], { clamp: true });
  const cardRotate = useStep(progress, 0.02, 0.16, -14, 2);
  const cardOpacity = useStep(progress, 0.02, 0.08);

  // First half: multiple choice. Second half: the cloze, flipped in.
  const choiceOpacity = useStep(progress, 0.56, 0.62, 1, 0);
  const clozeOpacity = useStep(progress, 0.6, 0.66);
  const flip = useTransform(progress, [0.56, 0.66], [0, 360], { clamp: true });

  const picked = useStep(progress, 0.4, 0.44);
  const xpY = useStep(progress, 0.44, 0.56, 0, -90);
  const xpOpacity = useTransform(progress, [0.44, 0.47, 0.54, 0.56], [0, 1, 1, 0], { clamp: true });
  const burst = useStep(progress, 0.43, 0.52);
  const burstOpacity = useTransform(progress, [0.43, 0.46, 0.52], [0, 1, 0], { clamp: true });

  // Typed into the answer box, as in the real quiz — the blank in the
  // sentence stays empty until Check is pressed, then fills in green.
  const typed = useTransform(progress, [0.7, 0.8], [0, ANSWER.length], { clamp: true });
  const typedText = useTransform(typed, (count) => ANSWER.slice(0, Math.round(count)));
  const placeholderOpacity = useTransform(typed, (count) => (count < 0.5 ? 1 : 0));
  const checkScale = useTransform(progress, [0.82, 0.84, 0.86], [1, 0.92, 1], { clamp: true });
  const checkOpacity = useStep(progress, 0.87, 0.89, 1, 0);
  const correct = useStep(progress, 0.86, 0.89);
  const answerScale = useTransform(progress, [0.86, 0.89, 0.91], [0.4, 1.15, 1], { clamp: true });
  const bannerOpacity = useStep(progress, 0.88, 0.92);
  const bannerScale = useTransform(progress, [0.88, 0.92, 0.94], [0.96, 1.04, 1], { clamp: true });

  return (
    <motion.div
      style={{ scale: cardScale, rotate: cardRotate, opacity: cardOpacity }}
      className="relative rounded-4xl border border-card-border bg-raised p-5 shadow-xl sm:p-6"
    >
      <motion.div style={{ rotateY: flip }} className="relative min-h-[23rem] [transform-style:preserve-3d]">
        {/* Multiple choice */}
        <motion.div style={{ opacity: choiceOpacity }} className="absolute inset-0">
          <span className="rounded-full bg-sakura-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sakura-dark">
            {labels.quiz}
          </span>
          <div className="mt-4 rounded-3xl border border-card-border bg-washi-soft p-5 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-sumi-soft">{labels.whatDoesThisMean}</p>
            <p className="mt-2 font-nunito text-4xl font-extrabold text-sumi">noodles</p>
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-2.5">
            {OPTIONS.map((option, index) => (
              <Option
                key={option}
                progress={progress}
                index={index}
                picked={picked}
                right={index === RIGHT}
              >
                {option}
              </Option>
            ))}

            {/* The burst and the XP, from the right answer. */}
            <div aria-hidden className="pointer-events-none absolute top-6 left-[75%]">
              {CONFETTI.map((dot, index) => (
                <Confetti key={index} burst={burst} opacity={burstOpacity} {...dot} />
              ))}
              <motion.span
                style={{ y: xpY, opacity: xpOpacity }}
                className="absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-kin px-3 py-1 font-nunito text-sm font-black text-ink-on-light shadow-md"
              >
                <Sparkles aria-hidden className="mr-1 inline h-3.5 w-3.5" />
                +1 XP
              </motion.span>
            </div>
          </div>
        </motion.div>

        {/* Fill in the blank — swapped in mid-spin, so the card comes
            round the right way with the new question on it. */}
        <motion.div style={{ opacity: clozeOpacity }} className="absolute inset-0">
          <span className="rounded-full bg-sakura-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sakura-dark">
            {labels.quiz}
          </span>

          {/* As ClozeCard (components/vocab/session-ui.tsx) draws it. */}
          <div className="mt-4 rounded-3xl border border-card-border bg-washi-soft p-5 text-center shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-sumi-soft">{labels.fillBlank}</p>
            <p lang="ja" className="mt-2 text-sumi-soft">
              今日はお昼に<mark className="rounded-md bg-ai-soft px-1 font-semibold text-ai-dark">麺</mark>を食べました。
            </p>
            <p className="mt-2 text-xl font-semibold leading-relaxed text-sumi">
              I had
              <span className="relative mx-1.5 inline-block min-w-[2.5em] rounded-lg bg-ai-soft px-2 align-baseline text-ai-dark ring-2 ring-ai/50">
                <motion.span
                  aria-hidden
                  style={{ opacity: correct }}
                  className="absolute inset-0 rounded-lg bg-matcha-soft ring-2 ring-matcha"
                />
                <motion.span
                  style={{ opacity: correct, scale: answerScale }}
                  className="relative inline-block text-matcha-dark"
                >
                  {ANSWER}
                </motion.span>
              </span>
              for lunch today.
            </p>
          </div>

          {/* The answer box, focused — the test session's input. */}
          <div className="relative mt-4 flex h-14 items-center rounded-2xl border-2 border-ai/60 bg-washi px-6 text-xl text-sumi ring-4 ring-ai/10">
            <motion.span
              aria-hidden
              style={{ opacity: placeholderOpacity }}
              className="absolute left-6 text-sumi-soft/70"
            >
              {labels.typeYourAnswer}
            </motion.span>
            <motion.span className="relative">{typedText}</motion.span>
            <span className="relative ml-0.5 h-6 w-0.5 animate-pulse bg-ai" />
          </div>

          {/* Check, pressed — then the result banner in its place. */}
          <div className="relative mt-4 h-16">
            <motion.span
              style={{ scale: checkScale, opacity: checkOpacity }}
              className="absolute inset-x-0 top-1 flex h-14 items-center justify-center rounded-full bg-ai text-lg font-medium text-washi shadow-sm"
            >
              {labels.check}
            </motion.span>
            <motion.div
              style={{ opacity: bannerOpacity, scale: bannerScale }}
              className="absolute inset-0 flex items-center gap-3 rounded-3xl bg-matcha-soft px-4 text-matcha-dark ring-2 ring-matcha/30"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-matcha text-washi shadow-sm">
                <Check aria-hidden className="h-6 w-6" strokeWidth={3} />
              </span>
              <p className="text-lg font-bold">{labels.greatJob}</p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// One answer button: flies in on its own beat, and — once picked — the
// right one goes green with a tick while the rest fade back.
function Option({
  progress,
  index,
  picked,
  right,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  picked: MotionValue<number>;
  right: boolean;
  children: string;
}) {
  const start = 0.16 + index * 0.05;
  const x = useStep(progress, start, start + 0.08, index % 2 === 0 ? -160 : 160, 0);
  const opacity = useStep(progress, start, start + 0.06);
  const fade = useTransform(picked, [0, 1], [1, right ? 1 : 0.4]);
  const press = useTransform(progress, [0.38, 0.4, 0.43], [1, 0.9, 1.05], { clamp: true });

  return (
    <motion.div
      style={{ x, opacity }}
      className="relative"
    >
      <motion.div
        style={{ opacity: fade, scale: right ? press : 1 }}
        className="relative flex h-14 items-center justify-center overflow-hidden rounded-2xl border-2 border-card-border bg-raised text-xl font-semibold text-sumi"
        lang="ja"
      >
        {right && (
          <motion.span
            aria-hidden
            style={{ opacity: picked }}
            className="absolute inset-0 rounded-2xl bg-matcha-soft ring-2 ring-inset ring-matcha"
          />
        )}
        <span className={cn("relative flex items-center gap-1.5", right && "text-sumi")}>
          {right && (
            <motion.span style={{ scale: picked }} className="text-matcha">
              <Check aria-hidden className="h-5 w-5" strokeWidth={3} />
            </motion.span>
          )}
          {children}
        </span>
      </motion.div>
    </motion.div>
  );
}

function Confetti({
  burst,
  opacity,
  x,
  y,
  className,
}: {
  burst: MotionValue<number>;
  opacity: MotionValue<number>;
  x: number;
  y: number;
  className: string;
}) {
  const dx = useTransform(burst, [0, 1], [0, x]);
  const dy = useTransform(burst, [0, 1], [0, y]);
  return (
    <motion.span
      style={{ x: dx, y: dy, opacity }}
      className={cn("absolute h-2.5 w-2.5 rounded-full", className)}
    />
  );
}
