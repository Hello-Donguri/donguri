"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useAnimate } from "framer-motion";
import { BookOpen, MessageSquareQuote } from "lucide-react";
import type { RevealWord, WordType } from "@/lib/definitions";
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

// The card's accents. Light mode uses the theme's sage green for every
// card — green border, sage example panel, green highlights — on cream.
// Dark mode follows the word's path: blue for vocab, green for grammar,
// the same split as the course page. Neither uses the brand red, which
// read too close to a competitor's look. `card` carries the border colour
// in full, so callers shouldn't add their own.
export function lessonAccent(path: RevealWord["path"]) {
  const light = {
    highlight: "rounded bg-matcha/20 px-1 text-matcha-dark",
    panel: "bg-matcha-soft/80 ring-1 ring-matcha/60",
    label: "bg-matcha/20 text-matcha-dark",
    card: "border-matcha/80",
  };

  return path === "grammar"
    ? {
        highlight: `${light.highlight} dark:bg-matcha-soft`,
        panel: `${light.panel} dark:bg-matcha-soft/50 dark:ring-matcha/25`,
        label: `${light.label} dark:bg-matcha-soft`,
        card: `${light.card} dark:border-matcha/40`,
      }
    : {
        highlight: `${light.highlight} dark:bg-ai-soft dark:text-ai-dark`,
        panel: `${light.panel} dark:bg-ai-soft/50 dark:ring-ai/25`,
        label: `${light.label} dark:bg-ai-soft dark:text-ai-dark`,
        card: `${light.card} dark:border-ai/40`,
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
        <Jyutping text={example.romanization} highlight={syllableHighlights(example)} explain={false} />
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

      {isGrammar && parsePattern(word.term) ? (
        <div className={header ? "mt-8" : "mt-2"}>
          <PatternChart term={word.term} />
        </div>
      ) : (
        <p
          className={`${header ? "mt-8" : "mt-2"} font-extrabold tracking-tight text-sumi ${
            isGrammar ? "text-4xl sm:text-5xl" : "text-6xl sm:text-7xl"
          }`}
        >
          {word.term}
        </p>
      )}

      {word.romanization && (
        <p className="mt-2 text-lg text-sumi-soft">
          <Jyutping text={word.romanization} />
        </p>
      )}

      {/* Belongs to the pronunciation above, so it sits tight under it. */}
      {listenText && (
        <div className="mt-3">
          <ListenButton text={listenText} language={word.targetLanguage} />
        </div>
      )}

      {/* The meaning, set apart from the word and its sound so it reads as the
          answer — the biggest thing on the card after the word itself. */}
      <div className="mt-7 flex w-full flex-col items-center border-t border-sumi/10 pt-6">
        {word.wordType && (
          <span className="rounded-full bg-sumi/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sumi-soft">
            {wordTypeLabel(word.wordType, t)}
          </span>
        )}

        <p
          lang={englishIsTarget ? otherLang : "en"}
          className={`${word.wordType ? "mt-3" : ""} text-3xl font-bold leading-tight tracking-tight text-sumi sm:text-4xl`}
        >
          {word.translation}
        </p>

        {(word.explanation || word.explanationJa) && (
          <div className="mt-3 space-y-1 text-sm text-sumi-soft">
            {word.explanation && <p>{word.explanation}</p>}
            {word.explanationJa && <p>{word.explanationJa}</p>}
          </div>
        )}
      </div>

      {mainExample && (
        <>
          <div
            className={`mt-7 w-full rounded-2xl px-6 py-5 text-left ${accent.panel}`}
          >
            <p
              className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-[0.14em] ${accent.label}`}
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

// The words in a grammar pattern that stand for something the learner
// fills in ("noun", "base verb", "X") rather than words they actually say.
const PLACEHOLDER_WORDS = new Set([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "subject",
  "object",
  "number",
  "classifier",
  "base",
  "singular",
  "plural",
  "x",
  "y",
]);

type PatternSlot = { alternatives: string[]; placeholder: boolean };

// "There is / There are + noun" → two slots, the first with two
// alternatives. Only for patterns built with " + " — anything else ("X 係
// Y") stays as plain text. A trailing "...?" (question patterns) comes back
// as `ending` to show after the last slot.
function parsePattern(term: string): { slots: PatternSlot[]; ending: string } | null {
  if (!term.includes(" + ")) return null;

  let body = term.trim();
  let ending = "";
  if (body.endsWith("?")) {
    ending = "?";
    body = body.slice(0, -1);
  }
  body = body.replace(/\.{3}$/, "").trim();

  const slots = body.split(/\s+\+\s+/).map((slot) => {
    const alternatives = slot.split(/\s*\/\s*/).filter(Boolean);
    // Placeholder only if nothing's left once its placeholder words are
    // taken out — "X 想" still has 想 to say, so it's a word slot.
    const placeholder = alternatives.every((alternative) => {
      let sawPlaceholder = false;
      const rest = alternative.toLowerCase().replace(/[a-z]+/g, (word) => {
        if (!PLACEHOLDER_WORDS.has(word)) return word;
        sawPlaceholder = true;
        return "";
      });
      return sawPlaceholder && rest.replace(/[\s-]/g, "") === "";
    });
    return { alternatives, placeholder };
  });

  return slots.length > 1 ? { slots, ending } : null;
}

// A grammar pattern drawn as a chart: each slot a box, alternatives stacked
// inside it, "+" between. Words the learner says sit in solid green boxes;
// the parts they fill in ("noun") in dashed ones. The pattern as written is
// kept for screen readers.
const PatternChart = ({ term }: { term: string }) => {
  const pattern = parsePattern(term);
  if (!pattern) return null;

  return (
    <>
      <p className="sr-only">{term}</p>
      <div
        aria-hidden
        className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 sm:gap-x-3"
      >
        {pattern.slots.map((slot, index) => (
          <div key={index} className="flex items-center gap-x-2 sm:gap-x-3">
            {index > 0 && <span className="text-3xl font-bold text-sumi-soft">+</span>}
            <div
              className={`flex flex-col divide-y rounded-2xl border-2 text-2xl font-bold sm:text-3xl ${
                slot.placeholder
                  ? "divide-dashed divide-sumi/15 border-dashed border-sumi/25 bg-washi/60 italic text-sumi-soft dark:bg-transparent"
                  : "divide-matcha/40 border-matcha/80 bg-matcha-soft text-sumi dark:divide-matcha/25 dark:border-matcha/40 dark:bg-matcha-soft/60"
              }`}
            >
              {slot.alternatives.map((alternative) => (
                <span key={alternative} className="px-4 py-1.5 sm:px-5">
                  {alternative}
                </span>
              ))}
            </div>
            {index === pattern.slots.length - 1 && pattern.ending && (
              <span className="text-3xl font-bold text-sumi">{pattern.ending}</span>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

// Part-of-speech labels in the learner's UI language. Written out one by
// one (not built from the type) so the i18n extractor can find each key.
function wordTypeLabel(type: WordType, t: ReturnType<typeof useTranslations>): string {
  switch (type) {
    case "noun":
      return t("word_type.noun", "Noun");
    case "verb":
      return t("word_type.verb", "Verb");
    case "adjective":
      return t("word_type.adjective", "Adjective");
    case "adverb":
      return t("word_type.adverb", "Adverb");
    case "pronoun":
      return t("word_type.pronoun", "Pronoun");
    case "preposition":
      return t("word_type.preposition", "Preposition");
    case "conjunction":
      return t("word_type.conjunction", "Conjunction");
    case "interjection":
      return t("word_type.interjection", "Interjection");
    case "phrase":
      return t("word_type.phrase", "Phrase");
    case "numeral":
      return t("word_type.numeral", "Numeral");
    case "particle":
      return t("word_type.particle", "Particle");
  }
}

const Highlighted = ({
  segments,
  className,
}: {
  segments: HighlightSegment[];
  className: string;
}) =>
  segments.map((segment, index) =>
    segment.match ? (
      <strong key={index} className={`font-bold ${className}`}>
        {segment.text}
      </strong>
    ) : (
      segment.text
    ),
  );

// Lessons fetched this visit, by course and word — one request per word,
// however many places ask (the review's preload, its inline lesson, the
// modal). Through the /api/lesson route handler rather than a server
// action, so a preload never queues the learner's answer behind it. A
// failed load is forgotten, so asking again retries.
const lessonRequests = new Map<string, Promise<RevealWord | null>>();

export function loadLesson(courseSlug: string, wordId: string): Promise<RevealWord | null> {
  const key = `${courseSlug}:${wordId}`;
  let request = lessonRequests.get(key);
  if (!request) {
    const params = new URLSearchParams({ course: courseSlug, word: wordId });
    request = fetch(`/api/lesson?${params}`, { priority: "low" })
      .then((response) => (response.ok ? (response.json() as Promise<RevealWord | null>) : null))
      .catch(() => null)
      .then((lesson) => {
        if (!lesson) lessonRequests.delete(key);
        return lesson;
      });
    lessonRequests.set(key, request);
  }
  return request;
}

// The lesson for a question the learner just got wrong, shown straight
// under the feedback — usually already loaded, since the review preloads
// each question's lesson while it's on screen (see loadLesson). Nothing is
// shown until it arrives, or if it can't be loaded.
export const InlineLesson = ({ courseSlug, wordId }: { courseSlug: string; wordId: string }) => {
  const t = useTranslations();
  const [lesson, setLesson] = useState<{ wordId: string; word: RevealWord } | null>(null);

  useEffect(() => {
    let current = true;
    loadLesson(courseSlug, wordId).then((word) => {
      if (current && word) setLesson({ wordId, word });
    });
    return () => {
      current = false;
    };
  }, [courseSlug, wordId]);

  // Kept from a previous question only until this one's lesson arrives.
  if (lesson?.wordId !== wordId) return null;

  return (
    <section
      aria-label={t("lesson_modal.inline_label", "Lesson")}
      className={`mt-6 w-full animate-[lesson-in_250ms_ease-out] rounded-4xl border bg-raised p-4 shadow-sm motion-reduce:animate-none sm:p-6 ${lessonAccent(lesson.word.path).card}`}
    >
      <WordLesson word={lesson.word} />
    </section>
  );
};

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
        const result = await loadLesson(courseSlug, wordId);
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
        className={`m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-4xl border bg-raised p-0 shadow-2xl backdrop:bg-sumi/40 backdrop:backdrop-blur-[2px] ${
          lesson ? lessonAccent(lesson.path).card : "border-card-border"
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
