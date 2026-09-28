"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Volume2 } from "lucide-react";
import type { RevealWord } from "@/lib/definitions";
import { useSpeech } from "@/lib/speech";
import { WordImage } from "@/components/ui/word-image";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n/locale-provider";

type LearnCompleteProps = {
  words: RevealWord[];
  skippedIds: string[];
  courseSlug: string;
  // Whether every "Got it" has finished saving (see `learnWord`) — the
  // quiz reads those progress rows, so the button waits on it.
  started: boolean;
  refreshing: boolean;
  onLearnMore: () => void;
};

// The end of a learn batch: a recap of every word just seen (tap one to
// hear it again) and the jump into the quiz on exactly those words.
export function LearnComplete({
  words,
  skippedIds,
  courseSlug,
  started,
  refreshing,
  onLearnMore,
}: LearnCompleteProps) {
  const t = useTranslations();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  // The quiz covers exactly this batch — minus anything skipped, which
  // goes straight to Mastered — not every learnt-but-unquizzed word (see
  // `wordIds` on `getTestQueueForCourse` in lib/dal.ts).
  const learnt = words.filter((word) => !skippedIds.includes(word.id));
  const learntCount = learnt.length;
  const skippedCount = words.length - learntCount;
  const allGrammar = words.every((word) => word.path === "grammar");
  const quizHref = `/dashboard/courses/${courseSlug}/test?words=${learnt.map((word) => word.id).join(",")}`;
  const canQuiz = learntCount > 0 && started;

  // Enter starts the quiz — the learner's hand is already on the keyboard
  // if they were tabbing through "Got it".
  useEffect(() => {
    if (!canQuiz) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.repeat && event.target === document.body) {
        router.push(quizHref);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canQuiz, quizHref, router]);

  const title =
    learntCount === 0
      ? t("learn_session.nicely_done", "Nicely done!")
      : allGrammar
        ? learntCount === 1
          ? t("learn_session.learnt_points_one", "You've learnt a new grammar point!")
          : t("learn_session.learnt_points_other", "You've learnt {{count}} new grammar points!", {
              count: learntCount,
            })
        : learntCount === 1
          ? t("learn_session.learnt_words_one", "You've learnt a new word!")
          : t("learn_session.learnt_words_other", "You've learnt {{count}} new words!", {
              count: learntCount,
            });

  const rise = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, delay, ease: "easeOut" as const },
        };

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="relative overflow-hidden rounded-[2rem] border border-card-border bg-washi px-5 py-10 text-center shadow-sm sm:px-10 sm:py-12">
        {/* Soft glow behind the badge */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-matcha/15 blur-3xl"
        />

        <SuccessBadge reduceMotion={Boolean(reduceMotion)} />

        <motion.h1
          {...rise(0.15)}
          className="relative mt-6 font-nunito text-3xl font-extrabold tracking-tight text-sumi sm:text-4xl"
        >
          {title}
        </motion.h1>

        {/* Three across (a full batch); a shorter one stays tile-sized and centred. */}
        <div
          className="relative mx-auto mt-8 grid gap-3 sm:gap-4"
          style={{
            gridTemplateColumns: `repeat(${words.length}, minmax(0, 1fr))`,
            maxWidth: `${Math.min(words.length / 3, 1) * 100}%`,
          }}
        >
          {words.map((word, index) => (
            <WordTile
              key={word.id}
              word={word}
              skipped={skippedIds.includes(word.id)}
              delay={reduceMotion ? 0 : 0.3 + index * 0.08}
              animate={!reduceMotion}
            />
          ))}
        </div>

        <motion.p {...rise(0.3 + words.length * 0.08)} className="relative mt-7 text-sumi-soft">
          {learntCount > 0
            ? t("learn_session.ready_for_quiz", "Now let's see how well they stuck.")
            : t("learn_session.all_skipped", "You skipped them all — nothing to quiz this time.")}
          {learntCount > 0 && skippedCount > 0 && (
            <span className="mt-1 block text-sm">
              {skippedCount === 1
                ? t("learn_session.skipped_one", "1 you already knew is marked as mastered.")
                : t("learn_session.skipped_other", "{{count}} you already knew are marked as mastered.", {
                    count: skippedCount,
                  })}
            </span>
          )}
        </motion.p>

        <motion.div
          {...rise(0.4 + words.length * 0.08)}
          className="relative mx-auto mt-6 flex w-full max-w-md flex-col items-center gap-2"
        >
          {learntCount > 0 ? (
            canQuiz ? (
              <Button
                href={quizHref}
                variant="secondary"
                size="lg"
                fullWidth
                className="group h-14 text-lg shadow-sm hover:-translate-y-0.5 hover:shadow-md"
              >
                {t("learn_session.start_quiz", "Start quiz")}
                <ArrowRight
                  aria-hidden
                  className="h-5 w-5 transition-transform group-hover:translate-x-0.5"
                />
              </Button>
            ) : (
              <Button disabled variant="secondary" size="lg" fullWidth className="h-14 text-lg">
                {t("common.loading", "Loading…")}
              </Button>
            )
          ) : (
            <Button
              disabled={refreshing}
              onClick={onLearnMore}
              size="lg"
              fullWidth
              className="h-14 text-lg shadow-sm hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0"
            >
              {refreshing
                ? t("common.loading", "Loading…")
                : t("learn_session.learn_more", "Learn more")}
            </Button>
          )}

          {canQuiz && (
            <p className="hidden text-xs text-sumi-soft/80 sm:block">
              {t("learn_session.enter_hint", "or press Enter")}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function SuccessBadge({ reduceMotion }: { reduceMotion: boolean }) {
  // Little burst lines either side of the tick.
  const rays = [-35, 0, 35, 145, 180, 215];

  return (
    <div className="relative mx-auto flex h-20 w-40 items-center justify-center">
      {rays.map((angle, index) => (
        // Outer span points the ray; inner one slides it out along that line.
        <span
          key={angle}
          aria-hidden
          className="absolute top-1/2 left-1/2 h-0 w-0"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <motion.span
            className="absolute -top-0.5 left-0 h-1 w-3.5 rounded-full bg-matcha"
            initial={reduceMotion ? false : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 54 }}
            transition={{ duration: 0.4, delay: 0.2 + (index % 3) * 0.05, ease: "easeOut" }}
          />
        </span>
      ))}

      <motion.span
        initial={reduceMotion ? false : { scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 16 }}
        className="relative flex h-20 w-20 items-center justify-center rounded-full bg-matcha-soft ring-8 ring-matcha/10"
      >
        <Check aria-hidden className="h-10 w-10 text-matcha-dark" strokeWidth={3.5} />
      </motion.span>
    </div>
  );
}

function WordTile({
  word,
  skipped,
  delay,
  animate,
}: {
  word: RevealWord;
  skipped: boolean;
  delay: number;
  animate: boolean;
}) {
  const t = useTranslations();
  const { speak, speaking } = useSpeech();
  const isGrammar = word.path === "grammar";

  const initialLetter = (
    <span className="flex h-full w-full items-center justify-center font-nunito text-4xl font-bold text-ai-dark">
      {word.term.charAt(0)}
    </span>
  );

  return (
    <motion.button
      type="button"
      onClick={() => speak(word.term, word.targetLanguage)}
      disabled={speaking}
      aria-label={t("session_ui.listen_to", "Listen to {{text}}", { text: word.term })}
      initial={animate ? { opacity: 0, y: 16, scale: 0.94 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      whileHover={animate ? { y: -3 } : undefined}
      whileTap={animate ? { scale: 0.97 } : undefined}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-card-border bg-washi-soft p-2 text-center shadow-sm transition-shadow hover:shadow-md ${
        skipped ? "opacity-60" : ""
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-ai-soft/60">
        {isGrammar ? (
          <span className="flex h-full w-full items-center justify-center px-3 font-nunito text-xl font-bold leading-tight text-matcha-dark">
            {word.term}
          </span>
        ) : (
          <WordImage
            src={word.image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            fallback={initialLetter}
          />
        )}

        <span className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-washi/90 text-ai opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Volume2 aria-hidden className="h-4 w-4" />
        </span>

        {skipped && (
          <span className="absolute top-2 left-2 rounded-full bg-washi/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sumi-soft">
            {t("learn_session.skipped_badge", "Known")}
          </span>
        )}
      </div>

      <span className="mt-2 block truncate px-1 font-nunito text-lg font-bold text-sumi">
        {isGrammar ? word.translation : word.term}
      </span>
      {!isGrammar && (
        <span className="mb-1 block truncate px-1 text-xs text-sumi-soft">{word.translation}</span>
      )}
    </motion.button>
  );
}
