"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  submitAnswer,
  submitFormAnswer,
  submitTypedAnswer,
  completeQuiz,
  refreshDashboardHeader,
} from "@/lib/actions/vocab";
import type { QuizQuestion } from "@/lib/definitions";
import {
  SpeakButton,
  ProgressDots,
  ClozeCard,
  FormChoiceOptions,
  useAnswerFocus,
  useEnterToContinue,
  MultipleChoiceOptions,
  ToneRetryNote,
  type ChoiceFeedback,
} from "@/components/vocab/session-ui";
import { WordImage } from "@/components/ui/word-image";
import { XpCounter } from "@/components/xp/xp-counter";
import { LevelUpModal } from "@/components/donguri/level-up-modal";
import { Button } from "@/components/ui/button";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { useTranslations } from "@/components/i18n/locale-provider";
import { Jyutping, JyutpingInput } from "@/components/vocab/jyutping";
import { LessonButton } from "@/components/vocab/word-lesson";
import { parseDonguriConfig, formatXp, type AccessoryId } from "@/lib/levels";

type ReviewSessionProps = {
  quiz: QuizQuestion[];
  courseSlug: string;
  initialXp: number;
  initialDonguriConfig: unknown;
};

type Feedback = ChoiceFeedback;

type LevelUpInfo = {
  newLevel: number;
  newlyUnlockedAccessories: AccessoryId[];
  unlockedAccessories: AccessoryId[];
};

// One review queue per course (see `getReviewQueue` in lib/dal.ts), mixing
// due words from every deck's vocab and grammar together — not scoped to a
// single deck. Questions are typed — `type-form` (a cloze sentence) or
// `type-answer` (the plain term/translation prompt) — except where typing
// can't work: a cloze whose answer isn't Latin script is `form-choice`, and
// a non-Latin grammar point with no cloze content is `multiple-choice` (see
// buildTypedQuestion in lib/dal.ts).
// Nothing due when the learner arrives: straight back to the course (its
// review card says when the next word is due) rather than an empty screen.
function BackToCourse({ courseSlug }: { courseSlug: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/dashboard/courses/${courseSlug}`);
  }, [router, courseSlug]);
  return null;
}

// Always rendered by the review page, even with nothing due, so a
// finished session's results stay on screen when the page re-renders
// underneath them with an empty queue (see refreshDashboardHeader). Which
// way it goes is decided once, on arrival — that later empty queue must
// not turn a finished session into a redirect.
export const ReviewSession = (props: ReviewSessionProps) => {
  const [nothingDue] = useState(props.quiz.length === 0);
  return nothingDue ? (
    <BackToCourse courseSlug={props.courseSlug} />
  ) : (
    <ReviewSessionQuestions {...props} />
  );
};

const ReviewSessionQuestions = ({
  quiz: initialQuiz,
  courseSlug,
  initialXp,
  initialDonguriConfig,
}: ReviewSessionProps) => {
  // Fixed for the whole session — see the same note in TestSession.
  const [quiz] = useState(initialQuiz);
  const t = useTranslations();
  const router = useRouter();
  const [quizIndex, setQuizIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  // The right Jyutping, while the learner retypes it after a tone slip.
  const [toneRetry, setToneRetry] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [finished, setFinished] = useState(false);
  const [xp, setXp] = useState(initialXp);
  const [bonusAwarded, setBonusAwarded] = useState(false);
  const [streakBonus, setStreakBonus] = useState(0);
  const [equippedAccessory, setEquippedAccessory] = useState<AccessoryId | null>(
    (parseDonguriConfig(initialDonguriConfig).equippedAccessory as AccessoryId | undefined) ?? null,
  );
  const [levelUpInfo, setLevelUpInfo] = useState<LevelUpInfo | null>(null);

  const question = quiz[quizIndex];

  // `getReviewQueue` (lib/dal.ts) only ever builds these four kinds via
  // `buildTypedQuestion` — narrowing here (rather than a broader
  // QuizQuestion prop type) is what lets the JSX below access
  // `clozeSentence`/`prompt`/etc. without a cast.
  if (
    question.kind !== "type-form" &&
    question.kind !== "type-answer" &&
    question.kind !== "form-choice" &&
    question.kind !== "multiple-choice"
  ) {
    throw new Error(`ReviewSession received an unexpected question kind: ${question.kind}`);
  }

  const recordResult = (correct: boolean) => {
    setScore((current) => ({
      correct: current.correct + (correct ? 1 : 0),
      incorrect: current.incorrect + (correct ? 0 : 1),
    }));
  };

  const handleSubmit = async () => {
    if (feedback || pending || typedAnswer.trim() === "") return;

    setPending(true);

    try {
      const result =
        question.kind === "type-form"
          ? await submitFormAnswer(question.wordId, question.formId, typedAnswer, true)
          : question.kind === "type-answer"
            ? await submitTypedAnswer(
                question.wordId,
                question.direction,
                typedAnswer,
                true,
                toneRetry !== null,
              )
            : null;
      if (!result) return;

      if ("toneMiss" in result && result.toneMiss) {
        setToneRetry(result.correctAnswer);
        setTypedAnswer("");
        return;
      }

      setFeedback({
        selected: typedAnswer,
        correct: result.correct,
        correctAnswer: result.correctAnswer,
        alternatives: result.alternatives,
        fullAnswer: result.fullAnswer,
        toneFixed: toneRetry !== null && result.correct,
      });
      setToneRetry(null);
      recordResult(result.correct);
      setXp(result.xp);
    } finally {
      setPending(false);
    }
  };

  const handleChoice = async (option: string) => {
    if (feedback || pending) return;

    setPending(true);

    try {
      const result =
        question.kind === "form-choice"
          ? await submitFormAnswer(question.wordId, question.formId, option, true)
          : question.kind === "multiple-choice"
            ? await submitAnswer(question.wordId, question.direction, option, true)
            : null;
      if (!result) return;

      setFeedback({ selected: option, correct: result.correct, correctAnswer: result.correctAnswer });
      recordResult(result.correct);
      setXp(result.xp);
    } finally {
      setPending(false);
    }
  };

  const advance = () => {
    setFeedback(null);
    setTypedAnswer("");

    if (quizIndex + 1 < quiz.length) {
      setQuizIndex((current) => current + 1);
    } else {
      setFinished(true);
      completeQuiz(courseSlug, initialXp, quiz.length, score.correct).then((result) => {
        setXp(result.xp);
        setBonusAwarded(result.bonusAwarded);
        setStreakBonus(result.streakBonus);
        if (result.newLevel > result.previousLevel) {
          setLevelUpInfo({
            newLevel: result.newLevel,
            newlyUnlockedAccessories: result.newlyUnlockedAccessories,
            unlockedAccessories: result.unlockedAccessories,
          });
        } else {
          // No level-up modal to protect — safe to refresh the header now.
          // When there IS a level-up, this is deferred to the modal's
          // `onDone` instead (see below), so the dashboard-wide revalidation
          // it triggers can't unmount this still-visible modal out from
          // under the learner (that was the bug: revalidating immediately
          // here reached this page too, whose `quiz` prop was now empty).
          refreshDashboardHeader();
        }
      });
    }
  };

  useEnterToContinue(Boolean(feedback) && !finished, advance);
  const answerInputRef = useAnswerFocus(
    `${quizIndex}${toneRetry ? "-tone-retry" : ""}`,
    !feedback && !finished,
  );
  // On the results screen, Enter is "Back to course" — held off while the
  // level-up modal is up, which has its own button.
  useEnterToContinue(finished && !levelUpInfo, () =>
    router.push(`/dashboard/courses/${courseSlug}`),
  );

  if (finished) {
    const totalAnswers = score.correct + score.incorrect;
    const perfectScore = totalAnswers > 0 && score.incorrect === 0;

    return (
      <section className="mx-auto flex w-full max-w-lg flex-col items-center rounded-3xl border border-card-border bg-washi-soft px-6 py-14 text-center shadow-sm sm:px-10">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-matcha-soft text-3xl text-matcha-dark">
          {perfectScore ? "★" : "✓"}
        </span>

        <PageTitle className="mt-5">
          {perfectScore
            ? t("review_session.perfect_review", "Perfect review!")
            : t("review_session.review_complete", "Review complete!")}
        </PageTitle>

        <PageSubtitle className="mt-2 max-w-sm">
          {t(
            "review_session.results_subtitle",
            "These words will come back around on their own schedule.",
          )}
        </PageSubtitle>

        <div className="mt-6 flex flex-col items-center gap-2">
          <XpCounter value={xp} />
          {bonusAwarded && (
            <span className="text-sm font-medium text-matcha-dark">
              {t("review_session.perfect_bonus", "+5 bonus for a perfect review!")}
            </span>
          )}
          {streakBonus > 0 && (
            <span className="text-sm font-medium text-matcha-dark">
              {t("test_session.streak_bonus", "+{{amount}} streak bonus!", {
                amount: formatXp(streakBonus),
              })}
            </span>
          )}
        </div>

        <div className="mt-7 grid w-full grid-cols-2 gap-3">
          <div className="rounded-2xl bg-matcha-soft px-4 py-5">
            <p className="text-2xl font-semibold text-matcha-dark">{score.correct}</p>
            <p className="mt-1 text-sm text-matcha-dark/80">
              {t("test_session.correct", "Correct")}
            </p>
          </div>

          <div className="rounded-2xl bg-ai-soft px-4 py-5">
            <p className="text-2xl font-semibold text-ai-dark">{score.incorrect}</p>
            <p className="mt-1 text-sm text-ai-dark/80">
              {t("test_session.to_practise_again", "To practise again")}
            </p>
          </div>
        </div>

        <Button
          href={`/dashboard/courses/${courseSlug}`}
          prefetch
          size="lg"
          fullWidth
          className="mt-8 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
        >
          {t("test_session.back_to_course", "Back to course")}
        </Button>

        {levelUpInfo && (
          <LevelUpModal
            newLevel={levelUpInfo.newLevel}
            newlyUnlockedAccessories={levelUpInfo.newlyUnlockedAccessories}
            unlockedAccessories={levelUpInfo.unlockedAccessories}
            equippedAccessory={equippedAccessory}
            onDone={(id) => {
              setEquippedAccessory(id);
              setLevelUpInfo(null);
              refreshDashboardHeader();
            }}
          />
        )}
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col items-center">
      <div className="mb-4 flex w-full justify-center">
        <XpCounter value={xp} />
      </div>

      <div className="mb-7 flex flex-col items-center gap-3 text-center">
        <span className="rounded-full bg-matcha-soft px-4 py-1.5 text-sm font-medium text-matcha-dark">
          {t("review_session.review", "Review")}
        </span>

        <p className="text-sm text-sumi-soft">
          {t("review_session.word_progress", "Word {{current}} of {{total}}", {
            current: quizIndex + 1,
            total: quiz.length,
          })}
        </p>

        <ProgressDots current={quizIndex + 1} total={quiz.length} />
      </div>

      {question.kind === "type-form" || question.kind === "form-choice" ? (
        <ClozeCard
          sentence={question.clozeSentence}
          translation={question.clozeSentenceJa}
          highlight={question.clozeHighlightJa}
          romanization={question.clozeRomanization}
          path={question.path}
          feedback={feedback}
        />
      ) : (
        <div className="w-full rounded-3xl border border-card-border bg-washi-soft p-7 text-center shadow-sm sm:p-9">
          {question.direction === "translation-to-term" ? null : (
            <WordImage
              src={question.image}
              alt={question.prompt}
              className="mx-auto mb-6 max-h-64 w-full object-contain sm:max-h-72"
            />
          )}
          <p className="text-xs font-medium uppercase tracking-wide text-sumi-soft">
            {question.kind === "multiple-choice"
              ? question.direction === "translation-to-term"
                ? t("test_session.what_does_this_mean", "What does this mean?")
                : t("test_session.find_the_right_word", "Can you find the right word?")
              : question.answerRomanized
                ? t("test_session.type_the_romanized_word", "Type the romanized word")
                : question.direction === "translation-to-term"
                  ? t("test_session.what_does_this_mean", "What does this mean?")
                  : t("test_session.type_the_word", "Type the word")}
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <p className="text-3xl font-semibold text-sumi capitalize">{question.prompt}</p>

            {question.direction === "term-to-translation" && (
              <SpeakButton text={question.prompt} language={question.targetLanguage} />
            )}
          </div>
          {question.promptRomanization && (
            <p className="mt-2 text-sm text-sumi-soft">
              <Jyutping text={question.promptRomanization} chart />
            </p>
          )}
        </div>
      )}

      {question.kind === "form-choice" ? (
        <FormChoiceOptions
          options={question.options}
          feedback={feedback}
          disabled={pending || Boolean(feedback)}
          onChoose={handleChoice}
        />
      ) : question.kind === "multiple-choice" ? (
        <MultipleChoiceOptions
          question={question}
          feedback={feedback}
          disabled={pending || Boolean(feedback)}
          onChoose={(option) => handleChoice(option.text)}
        />
      ) : (
        <>
          {toneRetry && !feedback && <ToneRetryNote correctAnswer={toneRetry} />}
          <form
            className="mt-5 flex w-full flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            {question.kind === "type-answer" &&
            question.answerRomanized &&
            question.targetLanguage === "yue" ? (
              <JyutpingInput
                inputRef={answerInputRef}
                autoFocus={false}
                value={typedAnswer}
                onChange={setTypedAnswer}
                disabled={pending || Boolean(feedback)}
                placeholder={t("test_session.type_jyutping_placeholder", "Type the Jyutping")}
                className="h-14 w-full rounded-2xl border border-sumi/15 bg-washi px-5 text-lg text-sumi outline-none transition focus:border-ai/50 disabled:opacity-60"
              />
            ) : (
              <input
                type="text"
                value={typedAnswer}
                onChange={(event) => setTypedAnswer(event.target.value)}
                disabled={pending || Boolean(feedback)}
                ref={answerInputRef}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder={
                  question.kind === "type-answer" && question.answerRomanized
                    ? t("test_session.type_romanized_placeholder", "Type the romanization")
                    : t("test_session.type_answer_placeholder", "Type your answer")
                }
                className="h-14 w-full rounded-2xl border border-sumi/15 bg-washi px-5 text-lg text-sumi outline-none transition focus:border-ai/50 disabled:opacity-60"
              />
            )}

            {!feedback && (
              <Button
                type="submit"
                disabled={pending || typedAnswer.trim() === ""}
                size="lg"
                fullWidth
                className="shadow-sm hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0"
              >
                {t("test_session.check", "Check")}
              </Button>
            )}
          </form>
        </>
      )}

      {feedback && (
        <div
          aria-live="polite"
          className={`mt-5 w-full rounded-2xl px-5 py-4 text-center ${
            feedback.correct ? "bg-matcha-soft text-matcha-dark" : "bg-shu/5 text-shu-dark"
          }`}
        >
          <p className="font-semibold">
            {feedback.correct
              ? t("test_session.great_job", "Great job! You got it.")
              : t("test_session.almost", "Almost! You'll get it next time.")}
          </p>

          {!feedback.correct && (
            <p className="mt-1 text-sm">
              {t("test_session.correct_answer_is", "The correct answer is")}{" "}
              <strong>
                <Jyutping text={feedback.correctAnswer} />
              </strong>
              .
            </p>
          )}

          {feedback.correct && feedback.fullAnswer && (
            <p className="mt-1 text-sm">
              {t("test_session.full_answer_is", "Just note the full answer:")}{" "}
              <strong>{feedback.fullAnswer}</strong>
            </p>
          )}

          {feedback.correct && feedback.alternatives && feedback.alternatives.length > 1 && (
            <p className="mt-1 text-sm">
              {t("test_session.either_is_fine", "Either answer is fine:")}{" "}
              <strong>{feedback.alternatives.join(" / ")}</strong>
            </p>
          )}

          {feedback.toneFixed && (
            <p className="mt-1 text-sm">
              {t("test_session.tone_fixed", "Tones fixed — +0.5 XP this time.")}
            </p>
          )}
        </div>
      )}

      {feedback && (
        <Button
          onClick={advance}
          size="lg"
          fullWidth
          className="mt-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
        >
          {quizIndex + 1 < quiz.length
            ? t("review_session.next_word", "Next word")
            : t("test_session.see_my_results", "See my results")}
        </Button>
      )}

      {feedback && (
        <p className="mt-2 hidden text-center text-xs text-sumi-soft/80 sm:block">
          {t("learn_session.enter_hint", "or press Enter")}
        </p>
      )}

      {feedback && (
        <div className="mt-3 flex justify-center">
          <LessonButton courseSlug={courseSlug} wordId={question.wordId} />
        </div>
      )}
    </section>
  );
};
