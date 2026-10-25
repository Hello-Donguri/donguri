"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { learnWord, skipWord } from "@/lib/actions/vocab";
import { announceReviewQueueChanged } from "@/lib/review-sync";
import type { RevealWord } from "@/lib/definitions";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  ProgressSegments,
  reducedSessionCardVariants,
  sessionCardVariants,
  useEnterToContinue,
} from "@/components/vocab/session-ui";
import { WordLesson, lessonAccent } from "@/components/vocab/word-lesson";
import { LinkedWordsDebug } from "@/components/vocab/linked-words-debug";
import { Button } from "@/components/ui/button";
import { LearnComplete } from "@/components/vocab/learn-complete";
import { useTranslations } from "@/components/i18n/locale-provider";

type LearnSessionProps = {
  // Pooled from every active deck, vocab and grammar together (see
  // `getLearnQueueForCourse` in lib/dal.ts) — each word carries its own
  // `path`, since a batch can mix the two. For grammar, `path` drops the
  // image panel (grammar points don't have one) and adjusts copy —
  // otherwise identical: a grammar point is just a `Word` row whose
  // term/translation/explanation/examples happen to hold a structure, its
  // Japanese meaning, its English meaning, and a few instantiated example
  // sentences instead of a vocabulary word's usual content (see the note on
  // `LanguageDeck.path` in lib/dal.ts). Batched in threes just like vocab
  // (see SET_SIZE in lib/srs.ts) — one languageDeck just happens to be one
  // structure instead of one word.
  words: RevealWord[];
  courseSlug: string;
};

export const LearnSession = ({ words, courseSlug }: LearnSessionProps) => {
  const t = useTranslations();
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [refreshing, startRefresh] = useTransition();
  const [started, setStarted] = useState(false);
  // Each "Got it" saves in the background so the next card comes up
  // straight away; the quiz waits for all of them (see `finish`).
  const saves = useRef<Promise<unknown>[]>([]);

  // The learn page only *picks* this batch (it's read-only so it can be
  // prefetched, and refreshing it learns nothing) — a word counts as
  // learnt only once the learner clicks "Got it" on it: progress row,
  // first review due, streak.
  const finish = () => {
    setDone(true);
    Promise.allSettled(saves.current).then(() => setStarted(true));
  };

  const advance = () => {
    if (index + 1 < words.length) {
      setIndex((current) => current + 1);
    } else {
      finish();
    }
  };

  const handleGotIt = () => {
    saves.current.push(
      learnWord(courseSlug, words[index].id)
        // Its first review is now scheduled — other tabs' counts catch up.
        .then(() => announceReviewQueueChanged(courseSlug))
        .catch((error) => console.error("Failed to save learnt word:", error)),
    );
    advance();
  };

  // Enter is "Got it" on each card (the finished screen has its own — see
  // LearnComplete).
  useEnterToContinue(!done && !pending, handleGotIt);

  const handleSkip = async (wordId: string) => {
    setPending(true);

    try {
      await skipWord(wordId);
      setSkippedIds((current) => [...current, wordId]);
      advance();
    } finally {
      setPending(false);
    }
  };

  // The "learn more" href is this same /learn URL — a plain <Link> to a
  // route you're already on is a no-op in Next.js (it never re-fetches),
  // so clicking it would silently do nothing. `router.refresh()` forces a
  // fresh request instead, re-running getLearnQueue server-side for the
  // next batch; the parent page passes the result back down as a new
  // `words` array, keyed so this component remounts with fresh state (see
  // the `key` on <LearnSession> in learn/page.tsx).
  const handleLearnMore = () => {
    startRefresh(() => {
      router.refresh();
    });
  };

  if (done) {
    return (
      <LearnComplete
        words={words}
        skippedIds={skippedIds}
        courseSlug={courseSlug}
        started={started}
        refreshing={refreshing}
        onLearnMore={handleLearnMore}
      />
    );
  }

  const word = words[index];
  const isGrammar = word.path === "grammar";

  const progressLabel = isGrammar
    ? t("learn_session.point_progress", "Point {{current}} of {{total}}", {
        current: index + 1,
        total: words.length,
      })
    : t("learn_session.word_progress", "Word {{current}} of {{total}}", {
        current: index + 1,
        total: words.length,
      });

  // Skip / Got it, in a bar fixed to the bottom of the screen — so the
  // next word is always a click away however far down the examples go.
  const gotItLabel =
    index + 1 < words.length
      ? isGrammar
        ? t("learn_session.got_it_next_point", "Got it — next point")
        : t("learn_session.got_it_next_word", "Got it — next word")
      : t("learn_session.got_it_done", "Got it — done for now");

  // Where the word's from, top left of the card (its category goes top
  // right — see WordLesson).
  const deckPill = (
    <span
      className={`rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
        isGrammar ? "bg-matcha-soft text-matcha-dark" : "bg-ai-soft text-ai-dark"
      }`}
    >
      {word.deckTitle}
    </span>
  );

  return (
    <section
      // Room at the bottom for the action bar.
      className={`mx-auto w-full overflow-x-clip pb-32 sm:pb-28 ${isGrammar ? "max-w-2xl" : ""}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={word.id}
          variants={reduceMotion ? reducedSessionCardVariants : sessionCardVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className={`relative mt-4 rounded-4xl border-[1.5px] bg-raised-bright p-4 pt-6 shadow-sm sm:p-6 sm:pt-7 dark:border ${lessonAccent(word.path).card}`}
        >
          {/* How far through the batch, in a pill sitting across the card's
              top border. */}
          <div
            className={`absolute top-0 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full border-[1.5px] bg-raised-bright px-4 py-1.5 whitespace-nowrap shadow-sm dark:border ${lessonAccent(word.path).card}`}
          >
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sumi-soft">{progressLabel}</p>
            <div className="w-16 sm:w-24">
              <ProgressSegments current={index + 1} total={words.length} />
            </div>
          </div>
          <WordLesson word={word} header={deckPill} />
        </motion.div>
      </AnimatePresence>

      <LinkedWordsDebug linkedWords={word.linkedWords} />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-card-border bg-washi/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgb(0_0_0/0.06)] backdrop-blur sm:px-6">
        {/* Back to course on the left, a quiet text link; skip and Got it on
            the right. Phones: Got it full width, the two links under it. */}
        <div className="mx-auto flex max-w-360 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <Button
            variant="green"
            disabled={pending}
            onClick={handleGotIt}
            size="lg"
            className="h-12 w-full text-lg shadow-sm hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 sm:order-last sm:h-13 sm:w-auto sm:px-8"
          >
            {gotItLabel}
            <ArrowRight aria-hidden className="h-5 w-5" />
          </Button>
          <div className="flex items-center justify-between sm:contents">
            <Link
              href={`/dashboard/courses/${courseSlug}`}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-sumi-soft transition hover:text-sumi sm:mr-auto"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              {t("learn_session.back_to_course", "Back to course")}
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleSkip(word.id)}
              className="rounded-full px-3 py-1.5 text-sm text-sumi-soft transition hover:text-sumi disabled:opacity-60"
            >
              {t("learn_session.skip", "I already know this — skip it")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
