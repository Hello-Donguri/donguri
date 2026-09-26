"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { skipWord, startLearnSession } from "@/lib/actions/vocab";
import type { RevealWord } from "@/lib/definitions";
import { ArrowRight } from "lucide-react";
import { ProgressSegments } from "@/components/vocab/session-ui";
import { WordLesson, lessonAccent } from "@/components/vocab/word-lesson";
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

// Each card pops out to the left and the next springs in from the right —
// a quick shrink-and-slide out, then a slight overshoot on the way in.
const cardVariants: Variants = {
  enter: { opacity: 0, x: 96, scale: 0.9, rotate: 1.5 },
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    rotate: 0,
    transition: { type: "spring", stiffness: 380, damping: 24, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    x: -96,
    scale: 0.9,
    rotate: -1.5,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

const reducedCardVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
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

  // The learn page only *picks* this batch (it's read-only so it can be
  // prefetched) — mounting is what commits it: progress rows, first review
  // due, streak. The quiz reads those rows, so "Start quiz" waits on this.
  useEffect(() => {
    let cancelled = false;

    startLearnSession(
      courseSlug,
      words.map((word) => word.id),
    )
      .catch((error) => console.error("Failed to start learn session:", error))
      .finally(() => {
        if (!cancelled) {
          setStarted(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [courseSlug, words]);

  const advance = () => {
    if (index + 1 < words.length) {
      setIndex((current) => current + 1);
    } else {
      setDone(true);
    }
  };

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

  return (
    <section
      className={`mx-auto w-full overflow-x-clip ${isGrammar ? "max-w-2xl" : "max-w-5xl"}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={word.id}
          variants={reduceMotion ? reducedCardVariants : cardVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className={`rounded-[2rem] border border-card-border bg-washi p-4 shadow-sm sm:p-6 ${lessonAccent(word.path).card}`}
        >
          <WordLesson
            word={word}
            header={
              <>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-sumi-soft">
                  {progressLabel}
                </p>
                <div className="mt-3">
                  <ProgressSegments current={index + 1} total={words.length} />
                </div>
              </>
            }
          />
        </motion.div>
      </AnimatePresence>

      <div className="mx-auto mt-8 flex w-full max-w-md flex-col items-center gap-2">
        <Button
          disabled={pending}
          onClick={advance}
          size="lg"
          fullWidth
          className="h-14 text-lg shadow-sm hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0"
        >
          {index + 1 < words.length
            ? isGrammar
              ? t("learn_session.got_it_next_point", "Got it — next point")
              : t("learn_session.got_it_next_word", "Got it — next word")
            : t("learn_session.got_it_done", "Got it — done for now")}
          <ArrowRight aria-hidden className="h-5 w-5" />
        </Button>

        <button
          type="button"
          disabled={pending}
          onClick={() => handleSkip(word.id)}
          className="rounded-full px-4 py-2 text-sm text-sumi-soft transition hover:text-sumi disabled:opacity-60"
        >
          {t("learn_session.skip", "I already know this — skip it")}
        </button>
      </div>
    </section>
  );
};
