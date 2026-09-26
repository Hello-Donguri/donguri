"use client";

import { Volume2 } from "lucide-react";
import { useSpeech } from "@/lib/speech";
import { useTranslations } from "@/components/i18n/locale-provider";
import { WordImage } from "@/components/ui/word-image";
import { Jyutping } from "@/components/vocab/jyutping";
import type { MultipleChoiceQuestion, QuizOption } from "@/lib/definitions";

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
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ai-soft text-lg text-ai transition hover:scale-105 hover:bg-ai/15 disabled:opacity-60"
    >
      {speaking ? "…" : "🔊"}
    </button>
  );
};

// The learn card's bigger, labelled take on SpeakButton.
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
      className="inline-flex h-14 min-w-48 items-center justify-center gap-3 rounded-full bg-ai-soft px-8 text-xl font-semibold text-ai transition hover:scale-[1.03] hover:bg-ai/20 disabled:opacity-60"
    >
      <Volume2 aria-hidden className="h-7 w-7" strokeWidth={2.5} />
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
    className="flex items-center justify-center gap-2"
    role="progressbar"
    aria-valuemin={1}
    aria-valuemax={total}
    aria-valuenow={current}
  >
    {Array.from({ length: total }).map((_, index) => (
      <span
        key={index}
        className={`h-2 w-11 rounded-full transition-colors ${
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
};

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

// The options for a `form-choice` cloze: short fill-ins (went/gone, 係/喺).
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
}) => (
  <div className="mt-5 grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
    {options.map((option) => (
      <button
        key={option.text}
        type="button"
        disabled={disabled}
        onClick={() => onChoose(option.text)}
        className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border p-3 text-center font-medium transition disabled:cursor-not-allowed ${choiceStyle(feedback, option.text)}`}
      >
        {option.text}
        {option.romanization && (
          <span className="mt-0.5 text-xs font-normal">
            <Jyutping text={option.romanization} />
          </span>
        )}
      </button>
    ))}
  </div>
);

// The options for a `multiple-choice` question: whole terms or
// translations, with the term's image and romanization when it has them.
export const MultipleChoiceOptions = ({
  question,
  feedback,
  disabled,
  onChoose,
}: {
  question: MultipleChoiceQuestion;
  feedback: ChoiceFeedback | null;
  disabled: boolean;
  onChoose: (option: QuizOption) => void;
}) => {
  const t = useTranslations();
  const promptIsTargetLanguage = question.direction === "term-to-translation";

  return (
    <div className="mt-5 grid w-full grid-cols-1 gap-3 md:grid-cols-2">
      {question.options.map((option) => {
        const isSelected = feedback?.selected === option.text;
        const isCorrectOption = feedback && option.text === feedback.correctAnswer;

        return (
          <div
            key={option.text}
            className={`flex min-h-20 items-center gap-4 rounded-2xl border p-3 transition ${choiceStyle(feedback, option.text)}`}
          >
            {promptIsTargetLanguage && option.image && (
              <WordImage
                src={option.image}
                alt=""
                className="h-16 w-16 shrink-0 rounded-xl bg-washi-soft object-contain p-1"
              />
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChoose(option)}
              aria-label={t("test_session.choose_option", "Choose {{option}}", {
                option: option.text,
              })}
              className="flex min-w-0 flex-1 items-center self-stretch text-left font-medium disabled:cursor-not-allowed"
            >
              <span className="capitalize">
                {option.text}
                {option.romanization && (
                  <span className="mt-0.5 block text-xs font-normal lowercase">
                    <Jyutping text={option.romanization} />
                  </span>
                )}
              </span>
            </button>
            {feedback && isCorrectOption && (
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-matcha text-sm text-washi"
                aria-label={t("test_session.correct_answer_aria", "Correct answer")}
              >
                ✓
              </span>
            )}
            {feedback && isSelected && !feedback.correct && (
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-shu text-sm text-washi"
                aria-label={t("test_session.incorrect_answer_aria", "Incorrect answer")}
              >
                ×
              </span>
            )}
            {!promptIsTargetLanguage && (
              <SpeakButton text={option.text} language={question.targetLanguage} />
            )}
          </div>
        );
      })}
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
  romanization,
  path,
  feedback,
}: {
  sentence: string;
  translation: string;
  romanization: string | null;
  path: "vocab" | "grammar";
  feedback: ChoiceFeedback | null;
}) => {
  const t = useTranslations();
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
    <div className="w-full rounded-3xl border border-card-border bg-washi-soft p-7 text-center shadow-sm sm:p-9">
      <p className="text-xs font-medium uppercase tracking-wide text-sumi-soft">
        {t("test_session.fill_in_the_blank", "Fill in the blank")}
      </p>
      <p className="mt-3 text-lg text-sumi-soft">{translation}</p>
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
