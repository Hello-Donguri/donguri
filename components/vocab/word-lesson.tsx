"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useAnimate } from "framer-motion";
import { BookOpen, MessageSquareQuote } from "lucide-react";
import type { RevealWord } from "@/lib/definitions";
import { getWordLesson } from "@/lib/actions/vocab";
import { ListenButton, SpeakButton } from "@/components/vocab/session-ui";
import { Jyutping } from "@/components/vocab/jyutping";
import { syllableRanges } from "@/lib/cloze";
import {
  highlightEnglish,
  highlightJapanese,
  type HighlightSegment,
} from "@/lib/highlight-term";
import { WordImage } from "@/components/ui/word-image";
import { useTranslations } from "@/components/i18n/locale-provider";

// Dark mode keys the card's accents to the word's path — blue for vocab,
// green for grammar, the same split as the course page — instead of the
// brand red, which on a dark background read too close to a competitor's
// look. Light mode keeps the red.
export function lessonAccent(path: RevealWord["path"]) {
  return path === "grammar"
    ? {
        highlight: "dark:rounded dark:bg-matcha-soft dark:px-1 dark:text-matcha-dark",
        panel: "dark:bg-matcha-soft/50 dark:ring-1 dark:ring-matcha/25",
        label: "dark:bg-matcha-soft dark:text-matcha-dark",
        card: "dark:border-matcha/40",
      }
    : {
        highlight: "dark:rounded dark:bg-ai-soft dark:px-1 dark:text-ai-dark",
        panel: "dark:bg-ai-soft/50 dark:ring-1 dark:ring-ai/25",
        label: "dark:bg-ai-soft dark:text-ai-dark",
        card: "dark:border-ai/40",
      };
}

// Everything the learn card shows about one word — term, romanization,
// meaning, explanation, examples, forms — without the card around it or
// the session's controls, so the learn session and the quiz's lesson
// modal render the same thing. `header` sits above the term (the learn
// session's progress).
export const WordLesson = ({ word, header }: { word: RevealWord; header?: ReactNode }) => {
  const t = useTranslations();
  const isGrammar = word.path === "grammar";
  const [mainExample, ...moreExamples] = word.examples;
  const accent = lessonAccent(word.path);

  // What to pick out in the examples. A grammar "term" is a structure
  // ("X 係 Y", "can + verb") that never appears in a sentence as written,
  // so grammar highlights its forms instead — the key word itself (係,
  // "can"). Vocab highlights the word, its meaning and its forms.
  const formValues = word.forms.map((form) => form.value);
  const highlightCandidates = isGrammar
    ? formValues
    : [word.term, word.translation, ...formValues];
  // The same words' syllables in each example's romanization.
  const targetValues = isGrammar ? formValues : [word.term, ...formValues];
  const syllableHighlights = (example: RevealWord["examples"][number]) =>
    example.romanization
      ? targetValues.flatMap(
          (value) => syllableRanges(example.ja, value, example.romanization!),
        )
      : [];

  // `en` is always the English sentence and `ja` the other language's —
  // which, outside English-target courses, is the one being learnt (e.g.
  // Cantonese), so it goes first, with its romanization, and the English
  // becomes the translation underneath.
  const englishIsTarget = word.targetLanguage === "en";
  const otherLang = englishIsTarget ? "ja" : word.targetLanguage;

  const renderExample = (example: RevealWord["examples"][number], featured = false) => {
    const primaryClass = featured ? "text-xl leading-snug text-sumi" : "leading-snug text-sumi";
    const secondaryClass = `mt-1.5 text-sumi-soft ${featured ? "" : "text-sm"}`;

    const english = (className: string) => (
      <p lang="en" className={className}>
        <Highlighted
          segments={highlightEnglish(example.en, highlightCandidates)}
          className={accent.highlight}
        />
      </p>
    );
    const other = (className: string) => (
      <p lang={otherLang} className={className}>
        <Highlighted
          segments={highlightJapanese(example.ja, highlightCandidates)}
          className={accent.highlight}
        />
      </p>
    );
    const romanization = example.romanization && (
      <p className={`mt-0.5 text-sumi-soft ${featured ? "text-sm" : "text-xs"}`}>
        <Jyutping text={example.romanization} highlight={syllableHighlights(example)} />
      </p>
    );

    return (
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {englishIsTarget ? (
            <>
              {english(primaryClass)}
              {other(secondaryClass)}
              {romanization}
            </>
          ) : (
            <>
              {other(primaryClass)}
              {romanization}
              {english(secondaryClass)}
            </>
          )}
        </div>
        <SpeakButton
          text={englishIsTarget ? example.en : example.ja}
          language={word.targetLanguage}
        />
      </div>
    );
  };

  // What "Listen" reads out. A vocab word is its term; a grammar pattern
  // ("X 係 Y", "can + verb") would be read as nonsense, so it's the key
  // word(s) instead — or, failing those, the first example.
  const listenText = !isGrammar
    ? word.term
    : formValues.length > 0
      ? formValues.join(englishIsTarget ? ", " : "，")
      : mainExample
        ? englishIsTarget
          ? mainExample.en
          : mainExample.ja
        : null;

  const wordPanel = (
    <div className="flex flex-col items-center text-center">
      {header}

      <p
        className={`${header ? "mt-8" : "mt-2"} font-extrabold tracking-tight text-sumi ${
          isGrammar ? "text-4xl sm:text-5xl" : "text-6xl sm:text-7xl"
        }`}
      >
        {word.term}
      </p>

      {word.romanization && (
        <p className="mt-2 text-lg text-sumi-soft">
          <Jyutping text={word.romanization} chart={!isGrammar} />
        </p>
      )}

      {listenText && (
        <div className="mt-6">
          <ListenButton text={listenText} language={word.targetLanguage} />
        </div>
      )}

      <p className="mt-6 text-2xl font-medium text-sumi">{word.translation}</p>

      {(word.explanation || word.explanationJa) && (
        <div className="mt-3 space-y-1 text-sm text-sumi-soft">
          {word.explanation && <p>{word.explanation}</p>}
          {word.explanationJa && <p>{word.explanationJa}</p>}
        </div>
      )}

      {mainExample && (
        <>
          <div className="mt-6 h-px w-10 bg-sumi/10" />
          <div
            className={`mt-6 w-full rounded-2xl bg-washi-soft px-6 py-5 text-left ${accent.panel}`}
          >
            <p
              className={`mb-3 inline-flex items-center gap-1.5 rounded-full text-xs font-medium uppercase tracking-[0.14em] text-sumi-soft dark:px-2.5 dark:py-1 ${accent.label}`}
            >
              <MessageSquareQuote aria-hidden className="h-3.5 w-3.5" />
              {t("learn_session.example", "Example")}
            </p>
            {renderExample(mainExample, true)}
          </div>
        </>
      )}
    </div>
  );

  const hasForms = !isGrammar && word.forms.length > 0;
  const hasMoreExamples = moreExamples.length > 0;

  return (
    <>
      {isGrammar ? (
        <div className="px-2 pt-4 sm:px-6">{wordPanel}</div>
      ) : (
        <div className="grid items-center gap-6 md:grid-cols-[1.15fr_1fr] md:gap-8">
          <div className="flex aspect-[7/6] items-center justify-center overflow-hidden rounded-3xl bg-ai-soft/60">
            <WordImage src={word.image} alt={word.term} className="h-full w-full object-cover" />
          </div>
          <div className="py-2 md:pr-2">{wordPanel}</div>
        </div>
      )}

      {(hasForms || hasMoreExamples) && (
        <div
          className={`mt-6 grid gap-6 border-t border-card-border pt-6 ${
            hasForms && hasMoreExamples ? "md:grid-cols-[0.85fr_1.15fr]" : ""
          }`}
        >
          {hasForms && (
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-sumi-soft">
                {t("learn_session.forms", "Forms")}
              </p>
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {word.forms.map((form) => (
                  <div key={form.id} className="rounded-xl bg-washi-soft px-4 py-3">
                    <dt className="text-xs text-sumi-soft">
                      {form.labelEn}
                      <span className="opacity-70"> / {form.labelJa}</span>
                    </dt>
                    <dd className="mt-0.5 text-lg font-semibold text-sumi">{form.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {hasMoreExamples && (
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-sumi-soft">
                {t("learn_session.more_examples", "More examples")}
              </p>
              <ul className="flex flex-col divide-y divide-card-border/70">
                {moreExamples.map((example) => (
                  <li key={example.id} className="py-3 first:pt-0 last:pb-0">
                    {renderExample(example)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
};

const Highlighted = ({
  segments,
  className,
}: {
  segments: HighlightSegment[];
  className: string;
}) =>
  segments.map((segment, index) =>
    segment.match ? (
      <strong key={index} className={`font-bold text-shu ${className}`}>
        {segment.text}
      </strong>
    ) : (
      segment.text
    ),
  );

// "See the lesson" for the question just answered: reopens the word's
// learn card in a dialog, loaded on first open (and kept for re-opens of
// the same word). The native <dialog> handles focus trapping and Escape.
export const LessonButton = ({ courseSlug, wordId }: { courseSlug: string; wordId: string }) => {
  const t = useTranslations();
  const [dialogRef, animate] = useAnimate<HTMLDialogElement>();
  const [lesson, setLesson] = useState<RevealWord | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, startLoading] = useTransition();
  const loadedFor = useRef<string | null>(null);

  const open = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    if (loadedFor.current !== wordId) {
      loadedFor.current = wordId;
      setLesson(null);
      setFailed(false);
      startLoading(async () => {
        const result = await getWordLesson(courseSlug, wordId).catch(() => null);
        if (loadedFor.current !== wordId) return;
        setLesson(result);
        setFailed(result === null);
      });
    }

    dialog.style.opacity = "0";
    dialog.style.transform = "translateY(8px) scale(0.97)";
    dialog.showModal();
    animate(dialog, { opacity: 1, scale: 1, y: 0 }, { duration: 0.2, ease: "easeOut" });
  };

  const close = async () => {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    await animate(dialog, { opacity: 0, scale: 0.97, y: 8 }, { duration: 0.15, ease: "easeIn" });
    dialog.close();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-sumi-soft transition hover:bg-sumi/5 hover:text-sumi"
      >
        <BookOpen aria-hidden className="h-4 w-4" />
        {t("lesson_modal.open", "See the lesson")}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(event) => {
          // A click on the backdrop lands on the <dialog> element itself.
          if (event.target === event.currentTarget) close();
        }}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        className={`m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-[2rem] border border-card-border bg-washi p-0 shadow-2xl backdrop:bg-sumi/40 backdrop:backdrop-blur-[2px] ${
          lesson ? lessonAccent(lesson.path).card : ""
        }`}
      >
        <div className="relative p-4 sm:p-6">
          <button
            type="button"
            onClick={close}
            aria-label={t("common.close", "Close")}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-sumi/5 text-sumi-soft transition hover:bg-sumi/10 hover:text-sumi"
          >
            ✕
          </button>

          {lesson ? (
            <WordLesson word={lesson} />
          ) : (
            <p className="py-16 text-center text-sm text-sumi-soft">
              {failed && !loading
                ? t("lesson_modal.failed", "Couldn't load this lesson. Please try again.")
                : t("lesson_modal.loading", "Loading the lesson…")}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
};
