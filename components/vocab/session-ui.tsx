"use client";

import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import { Check, Volume2, X } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useSpeech } from "@/lib/speech";
import { useTranslations } from "@/components/i18n/locale-provider";
import { Jyutping } from "@/components/vocab/jyutping";
import type { MultipleChoiceQuestion, QuizOption } from "@/lib/definitions";
import type { RetryReason } from "@/lib/actions/vocab";

export const SpeakButton = ({
  text,
  language,
}: {
  text: string;
  language: string;
}) => {
  const t = useTranslations();
  const { speak, speaking } = useSpeech();

  return (
    <button
      type="button"
      onClick={() => speak(text, language)}
      aria-label={t("session_ui.listen_to", "Listen to {{text}}", { text })}
      disabled={speaking}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ai-soft text-ai transition hover:scale-105 hover:bg-ai/15 disabled:opacity-60"
    >
      <Volume2
        aria-hidden
        className={`h-5 w-5 ${speaking ? "animate-pulse" : ""}`}
        strokeWidth={2.5}
      />
    </button>
  );
};

// The learn card's labelled take on SpeakButton. Kept small and quiet so it
// reads as "hear the pronunciation above", not as the word's meaning.
export const ListenButton = ({
  text,
  language,
}: {
  text: string;
  language: string;
}) => {
  const t = useTranslations();
  const { speak, speaking } = useSpeech();

  return (
    <button
      type="button"
      onClick={() => speak(text, language)}
      aria-label={t("session_ui.listen_to", "Listen to {{text}}", { text })}
      disabled={speaking}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-ai/25 bg-ai-soft/60 px-4 text-sm font-semibold text-ai transition hover:bg-ai/15 disabled:opacity-60"
    >
      <Volume2 aria-hidden className={`h-4 w-4 ${speaking ? "animate-pulse" : ""}`} strokeWidth={2.5} />
      {t("session_ui.listen", "Listen")}
    </button>
  );
};

// Segmented progress (the learn card) — one bar per word, filled up to the
// current one.
export const ProgressSegments = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => (
  <div
    className="flex w-full max-w-sm items-center justify-center gap-2"
    role="progressbar"
    aria-valuemin={1}
    aria-valuemax={total}
    aria-valuenow={current}
  >
    {/* Full-width bars for a short batch, shrinking to fit a long quiz. */}
    {Array.from({ length: total }).map((_, index) => (
      <span
        key={index}
        className={`h-2 max-w-11 min-w-1.5 flex-1 rounded-full transition-colors ${
          index + 1 <= current ? "bg-ai" : "bg-sumi/10"
        }`}
      />
    ))}
  </div>
);

export const ProgressDots = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => (
  <div
    className="flex items-center justify-center gap-2"
    role="progressbar"
    aria-valuemin={1}
    aria-valuemax={total}
    aria-valuenow={current}
  >
    {Array.from({ length: total }).map((_, index) => (
      <span
        key={index}
        className={`h-2 rounded-full transition-all ${
          index + 1 === current
            ? "w-7 bg-ai"
            : index + 1 < current
              ? "w-2 bg-ai/40"
              : "w-2 bg-sumi/10"
        }`}
      />
    ))}
  </div>
);

// What an answered question shows back — shared by the quiz and review
// sessions and the option grids below.
export type ChoiceFeedback = {
  correct: boolean;
  correctAnswer: string;
  selected: string;
  // Every accepted reading of a typed answer with more than one ("they /
  // them") — see alternativeReadings in lib/actions/vocab.ts.
  alternatives?: string[];
  // The full reading when a correct typed answer left off its bracketed
  // note ("you" for "you (plural)").
  fullAnswer?: string | null;
  // Right on the second go after a near miss (see RetryNote) — correct, but
  // for half XP.
  retried?: RetryReason;
};

// A nearly-right answer waiting to be typed again (see submitTypedAnswer's
// `retry` in lib/actions/vocab.ts): the right answer and why.
export type PendingRetry = { answer: string; reason: RetryReason };

// Pops in when a typed answer was nearly right — a Jyutping answer with a
// tone wrong, or an English answer with a small spelling slip: the correct
// answer, and a prompt to type it in for half XP.
export const RetryNote = ({ retry }: { retry: PendingRetry }) => {
  const t = useTranslations();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      key={`${retry.reason}-${retry.answer}`}
      role="status"
      aria-live="polite"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 420, damping: 18 }}
      className="mt-5 w-full rounded-2xl bg-kin/20 px-5 py-4 text-center text-sumi shadow-sm ring-2 ring-kin/40"
    >
      <p className="font-nunito text-xl font-extrabold">
        {t("test_session.nearly", "Nearly!")}
      </p>
      {retry.reason === "tone" ? (
        <p className="mt-1 font-semibold">
          {t("test_session.tone_miss", "So close — just the tones! It's")}{" "}
          <strong className="text-lg">
            <Jyutping text={retry.answer} chart />
          </strong>
        </p>
      ) : (
        <p className="mt-1 font-semibold">
          {t("test_session.spelling_miss", "The correct spelling is")}{" "}
          <strong className="text-lg">{retry.answer}</strong>
        </p>
      )}
      <p className="mt-1 text-sm text-sumi-soft">
        {retry.reason === "tone"
          ? t("test_session.tone_retry", "Type it again with the right tones for half XP.")
          : t("test_session.spelling_retry", "Type it in correctly for half XP.")}
      </p>
    </motion.div>
  );
};

// The line under a correct answer that took a second go.
export function retriedMessage(reason: RetryReason, t: ReturnType<typeof useTranslations>) {
  return reason === "tone"
    ? t("test_session.tone_fixed", "Tones fixed — +0.5 XP this time.")
    : t("test_session.spelling_fixed", "Spelling fixed — +0.5 XP this time.");
}

function choiceStyle(feedback: ChoiceFeedback | null, option: string): string {
  if (!feedback) {
    return "border-sumi/10 bg-washi hover:-translate-y-0.5 hover:border-ai/40 hover:bg-ai-soft/30 hover:shadow-sm";
  }
  if (option === feedback.correctAnswer) {
    return "border-matcha bg-matcha-soft text-matcha-dark shadow-sm";
  }
  if (option === feedback.selected && !feedback.correct) {
    return "border-shu bg-shu/5 text-shu-dark";
  }
  return "border-sumi/10 bg-washi opacity-60";
}

// Each option's number badge colour, in turn — a splash of the app's
// palette so a page of answers isn't all beige.
const BADGE_COLOURS = [
  "bg-ai-soft text-ai-dark",
  "bg-sakura-soft text-sakura-dark",
  "bg-kin/25 text-sumi",
  "bg-matcha-soft text-matcha-dark",
  "bg-ai-soft text-ai-dark",
  "bg-sakura-soft text-sakura-dark",
];

// An option's number (which is also its keyboard shortcut — see
// useChoiceKeys) until it's answered, then a tick on the right answer and a
// cross on a wrong pick.
function ChoiceBadge({
  index,
  feedback,
  option,
}: {
  index: number;
  feedback: ChoiceFeedback | null;
  option: string;
}) {
  const t = useTranslations();

  if (feedback && option === feedback.correctAnswer) {
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-matcha text-washi shadow-sm"
        aria-label={t("test_session.correct_answer_aria", "Correct answer")}
      >
        <Check aria-hidden className="h-5 w-5" strokeWidth={3} />
      </span>
    );
  }
  if (feedback && option === feedback.selected && !feedback.correct) {
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-shu text-washi shadow-sm"
        aria-label={t("test_session.incorrect_answer_aria", "Incorrect answer")}
      >
        <X aria-hidden className="h-5 w-5" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        BADGE_COLOURS[index % BADGE_COLOURS.length]
      }`}
    >
      {index + 1}
    </span>
  );
}

const NEXT_KEYS = new Set(["ArrowDown", "ArrowRight"]);
const PREVIOUS_KEYS = new Set(["ArrowUp", "ArrowLeft"]);

// Keyboard control for an option list. Pressing 1, 2, 3… picks that option
// (the numbers on the badges). The arrow keys move focus between the
// options, wrapping round, and Enter then picks the focused one — the
// button's own Enter, so useEnterToContinue (which skips a focused button)
// never also fires. Ignored while typing into a field, with the lesson
// modal open, or once answered. Returns the refs to attach to each
// option's button.
function useChoiceKeys(count: number, disabled: boolean, onPick: (index: number) => void) {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pick = useEffectEvent(onPick);

  useEffect(() => {
    if (disabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      if (document.querySelector("dialog[open]")) return;

      if (NEXT_KEYS.has(event.key) || PREVIOUS_KEYS.has(event.key)) {
        event.preventDefault();
        const buttons = optionRefs.current.slice(0, count);
        const current = buttons.findIndex((button) => button === document.activeElement);
        const step = NEXT_KEYS.has(event.key) ? 1 : -1;
        // From nowhere (or the speak button), Down starts at the top and
        // Up at the bottom.
        const next =
          current === -1 ? (step === 1 ? 0 : count - 1) : (current + step + count) % count;
        buttons[next]?.focus();
        return;
      }

      if (event.repeat) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < count) {
        event.preventDefault();
        pick(index);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [count, disabled]);

  return optionRefs;
}

// The focus ring an arrow key leaves on an option.
const FOCUS_RING = "outline-none focus-visible:ring-4 focus-visible:ring-ai/30";

// Short fill-ins (went/gone, 係/喺) — for a `form-choice` cloze, or any
// list of plain text options.
export const FormChoiceOptions = ({
  options,
  feedback,
  disabled,
  onChoose,
}: {
  options: { text: string; romanization: string | null }[];
  feedback: ChoiceFeedback | null;
  disabled: boolean;
  onChoose: (option: string) => void;
}) => {
  const optionRefs = useChoiceKeys(options.length, disabled, (index) =>
    onChoose(options[index].text),
  );

  return (
    <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((option, index) => (
        <button
          key={option.text}
          ref={(element) => {
            optionRefs.current[index] = element;
          }}
          type="button"
          disabled={disabled}
          onClick={() => onChoose(option.text)}
          className={`flex min-h-16 items-center gap-4 rounded-2xl border-2 px-4 py-2.5 text-left text-lg font-semibold transition disabled:cursor-not-allowed ${FOCUS_RING} ${choiceStyle(feedback, option.text)}`}
        >
          <ChoiceBadge index={index} feedback={feedback} option={option.text} />
          <span className="flex min-w-0 flex-col">
            {option.text}
            {option.romanization && (
              <span className="mt-0.5 text-sm font-normal">
                <Jyutping text={option.romanization} />
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
};

// The options for a `multiple-choice` question: whole terms or
// translations, with the term's romanization when it has one.
export const MultipleChoiceOptions = ({
  question,
  feedback,
  disabled,
  onChoose,
  singleColumn = false,
}: {
  question: MultipleChoiceQuestion;
  feedback: ChoiceFeedback | null;
  disabled: boolean;
  onChoose: (option: QuizOption) => void;
  // One option per row — for a narrow column (e.g. beside a picture).
  singleColumn?: boolean;
}) => {
  const t = useTranslations();
  const promptIsTargetLanguage = question.direction === "term-to-translation";
  const optionRefs = useChoiceKeys(question.options.length, disabled, (index) =>
    onChoose(question.options[index]),
  );

  return (
    <div
      className={`mt-6 grid w-full grid-cols-1 gap-3 ${singleColumn ? "" : "md:grid-cols-2"}`}
    >
      {question.options.map((option, index) => (
        <div
          key={option.text}
          // The ring goes on the whole row, since the focusable button is
          // only its middle (the speak button sits beside it).
          className={`flex min-h-16 items-center gap-4 rounded-2xl border-2 px-4 py-2.5 transition has-[[data-option]:focus-visible]:ring-4 has-[[data-option]:focus-visible]:ring-ai/30 ${choiceStyle(feedback, option.text)}`}
        >
          <ChoiceBadge index={index} feedback={feedback} option={option.text} />
          <button
            ref={(element) => {
              optionRefs.current[index] = element;
            }}
            data-option
            type="button"
            disabled={disabled}
            onClick={() => onChoose(option)}
            aria-label={t("test_session.choose_option", "Choose {{option}}", {
              option: option.text,
            })}
            className="flex min-w-0 flex-1 items-center self-stretch text-left text-lg font-semibold outline-none disabled:cursor-not-allowed"
          >
            <span className="capitalize">
              {option.text}
              {option.romanization && (
                <span className="mt-0.5 block text-sm font-normal lowercase">
                  <Jyutping text={option.romanization} />
                </span>
              )}
            </span>
          </button>
          {!promptIsTargetLanguage && (
            <SpeakButton text={option.text} language={question.targetLanguage} />
          )}
        </div>
      ))}
    </div>
  );
};

const BLANK = "___";

// A fill-in-the-blank prompt: the learner's-language translation, the
// target sentence with the blank picked out as a coloured slot (green for
// grammar, blue for vocab), and — when there is one — the romanization
// underneath with the same syllables blanked. Once answered, the slot
// fills in with the correct answer.
export const ClozeCard = ({
  sentence,
  translation,
  highlight,
  romanization,
  path,
  feedback,
}: {
  sentence: string;
  translation: string;
  // The part of `translation` that corresponds to the blank, marked in the
  // blank's own colour — null to show the translation plain.
  highlight: string | null;
  romanization: string | null;
  path: "vocab" | "grammar";
  feedback: ChoiceFeedback | null;
}) => {
  const t = useTranslations();
  const highlightIndex = highlight ? translation.indexOf(highlight) : -1;
  const slotStyle = !feedback
    ? path === "grammar"
      ? "bg-matcha-soft text-matcha-dark ring-matcha/50"
      : "bg-ai-soft text-ai-dark ring-ai/50"
    : feedback.correct
      ? "bg-matcha-soft text-matcha-dark ring-matcha"
      : "bg-shu/10 text-shu-dark ring-shu/60";

  const fill = (
    text: string,
    slot: (key: number) => React.ReactNode,
    renderPart: (part: string, key: number) => React.ReactNode = (part) => part,
  ) =>
    text
      .split(BLANK)
      .flatMap((part, index) =>
        index === 0 ? [renderPart(part, index)] : [slot(index), renderPart(part, -index)],
      );

  return (
    <div className="w-full rounded-3xl border border-card-border bg-washi-soft p-5 text-center shadow-sm sm:p-7">
      <p className="text-xs font-medium uppercase tracking-wide text-sumi-soft">
        {t("test_session.fill_in_the_blank", "Fill in the blank")}
      </p>
      <p className="mt-3 text-lg text-sumi-soft">
        {highlightIndex === -1 ? (
          translation
        ) : (
          <>
            {translation.slice(0, highlightIndex)}
            <mark
              className={`rounded-md px-1 font-semibold ${
                path === "grammar" ? "bg-matcha-soft text-matcha-dark" : "bg-ai-soft text-ai-dark"
              }`}
            >
              {highlight}
            </mark>
            {translation.slice(highlightIndex + (highlight?.length ?? 0))}
          </>
        )}
      </p>
      <p className="mt-2 text-2xl font-semibold leading-relaxed text-sumi">
        {fill(sentence, (key) => (
          <span
            key={key}
            className={`mx-1 inline-block min-w-[2.5em] rounded-lg px-2 ring-2 transition-colors ${slotStyle}`}
          >
            {feedback ? feedback.correctAnswer : " "}
          </span>
        ))}
      </p>
      {romanization && (
        <p className="mt-2 text-sm text-sumi-soft">
          {fill(romanization, (key) => (
            <span
              key={key}
              className="mx-0.5 inline-block min-w-[2.5em] border-b-2 border-current align-baseline opacity-70"
            >
              {" "}
            </span>
          ), (part, key) => <Jyutping key={`part-${key}`} text={part} />)}
        </p>
      )}
    </div>
  );
};

// Enter moves on once a quiz answer has been checked — the learner's hand
// is already on the keyboard from typing it. Ignored while a dialog is
// open (the lesson modal) or when focus is on a control that Enter already
// activates (a button or link), so one press never does two things.
export function useEnterToContinue(active: boolean, onContinue: () => void) {
  const continueEvent = useEffectEvent(onContinue);

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat || event.isComposing) return;
      if (document.querySelector("dialog[open]")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, [role='button']")) return;
      event.preventDefault();
      continueEvent();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);
}

// Focuses the answer box whenever a new question comes up, so the learner
// can just start typing — on landing, and after each "Next". `autoFocus`
// alone doesn't do it: moving on reuses the same <input> (disabled while
// the feedback showed), so it's never freshly mounted. Returns a callback
// ref for whichever input the current question renders.
// Also focuses an input as it appears, for sessions that animate each
// question's card in (the new input mounts only after the old card has
// animated out).
export function useAnswerFocus(questionKey: number | string, answering: boolean) {
  const input = useRef<HTMLInputElement | null>(null);
  const answeringRef = useRef(answering);

  useEffect(() => {
    answeringRef.current = answering;
    if (answering) input.current?.focus();
  }, [questionKey, answering]);

  return useCallback((element: HTMLInputElement | null) => {
    input.current = element;
    if (element && answeringRef.current) element.focus();
  }, []);
}

// The learn and test cards' transition: each card pops out to the left and
// the next springs in from the right — a quick shrink-and-slide out, then a
// slight overshoot on the way in. Just a fade with reduced motion.
export const sessionCardVariants: Variants = {
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

export const reducedSessionCardVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
