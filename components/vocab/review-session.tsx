"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SessionResults } from "@/components/vocab/session-results";
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
  reducedSessionCardVariants,
  sessionCardVariants,
  FormChoiceOptions,
  useAnswerFocus,
  useEnterToContinue,
  MultipleChoiceOptions,
  RetryNote,
  retriedMessage,
  type PendingRetry,
  type ChoiceFeedback,
} from "@/components/vocab/session-ui";
import { WordImage } from "@/components/ui/word-image";
import { XpGainToast, type XpGain } from "@/components/xp/xp-gain-toast";
import { LiveScore } from "@/components/vocab/live-score";
import { announceReviewQueueChanged } from "@/lib/review-sync";
import { LevelUpModal } from "@/components/donguri/level-up-modal";
import { markLevelUpSeen } from "@/lib/actions/donguri";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n/locale-provider";
import { Jyutping, JyutpingInput } from "@/components/vocab/jyutping";
import { InlineLesson, LessonButton, loadLesson } from "@/components/vocab/word-lesson";
import { FlagButton } from "@/components/vocab/flag-button";
import { parseDonguriConfig, formatXp, type AccessoryId } from "@/lib/levels";

type ReviewSessionProps = {
  quiz: QuizQuestion[];
  courseSlug: string;
  initialXp: number;
  initialDonguriConfig: unknown;
  // Words already flagged to revisit (see FlagButton), so each question
  // shows its flag as it stands.
  flaggedWordIds: string[];
};

type Feedback = ChoiceFeedback;

// The results screen's mascots — swap these for the final artwork.
const CORRECT_MASCOT = "/images/mascot.png";
const QUEUE_MASCOT = "/images/rabbit-reading.webp";

// The answer box: a blue-tinted border on a lighter background, and a clear
// focus ring, so where to type stands out from the card above it.
const ANSWER_FIELD_CLASS =
  "h-14 w-full rounded-2xl border-2 border-ai/35 bg-raised px-5 text-lg text-sumi shadow-sm outline-none transition placeholder:text-sumi-soft/70 hover:border-ai/60 focus:border-ai focus:ring-4 focus:ring-ai/20 disabled:opacity-60";

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
  flaggedWordIds,
}: ReviewSessionProps) => {
  // Fixed for the whole session — see the same note in TestSession.
  const [quiz] = useState(initialQuiz);
  const [flagged, setFlagged] = useState(() => new Set(flaggedWordIds));
  const t = useTranslations();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [quizIndex, setQuizIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  // A nearly-right answer being typed again (a tone or spelling slip).
  const [retry, setRetry] = useState<PendingRetry | null>(null);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [finished, setFinished] = useState(false);
  // XP when the session began, fixed: the page re-renders once it's over
  // (the header refresh) and hands down the new total as `initialXp`, which
  // made "XP earned" drop to zero.
  const [startXp] = useState(initialXp);
  const [xp, setXp] = useState(initialXp);
  // The last XP earned mid-session, for the pop-up that replaces an
  // always-visible counter.
  const [xpGain, setXpGain] = useState<XpGain | null>(null);
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

  // Fetch this question's lesson in the background while it's being
  // answered, so it's ready to show the moment they get it wrong. A route
  // handler fetch at low priority, so it never holds up the answer itself.
  useEffect(() => {
    loadLesson(courseSlug, question.wordId);
  }, [courseSlug, question.wordId]);

  const updateXp = (newXp: number) => {
    if (newXp > xp) setXpGain({ from: xp, to: newXp, id: Date.now() });
    setXp(newXp);
  };

  const recordResult = (correct: boolean) => {
    setScore((current) => ({
      correct: current.correct + (correct ? 1 : 0),
      incorrect: current.incorrect + (correct ? 0 : 1),
    }));
    // The answer moved this word's next review — let other open tabs'
    // "words due" counts catch up (see ReviewCard).
    announceReviewQueueChanged(courseSlug);
  };

  const handleSubmit = async () => {
    if (feedback || pending || typedAnswer.trim() === "") return;

    setPending(true);

    try {
      const result =
        question.kind === "type-form"
          ? await submitFormAnswer(
              question.wordId,
              question.formId,
              typedAnswer,
              true,
              retry !== null,
            )
          : question.kind === "type-answer"
            ? await submitTypedAnswer(
                question.wordId,
                question.direction,
                typedAnswer,
                true,
                retry !== null,
              )
            : null;
      if (!result) return;

      // Nearly right: show the answer and let them type it again.
      if (result.retry) {
        setRetry({ answer: result.correctAnswer, reason: result.retry, typed: typedAnswer });
        setTypedAnswer("");
        return;
      }

      setFeedback({
        selected: typedAnswer,
        correct: result.correct,
        correctAnswer: result.correctAnswer,
        alternatives: result.alternatives,
        fullAnswer: result.fullAnswer,
        retried: retry && result.correct ? retry.reason : undefined,
      });
      setRetry(null);
      recordResult(result.correct);
      updateXp(result.xp);
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
          ? await submitFormAnswer(
              question.wordId,
              question.formId,
              option,
              true,
              false,
              question.options.map((choice) => choice.text),
            )
          : question.kind === "multiple-choice"
            ? await submitAnswer(
                question.wordId,
                question.direction,
                option,
                true,
                question.options.map((choice) => choice.text),
              )
            : null;
      if (!result) return;

      setFeedback({
        selected: option,
        correct: result.correct,
        correctAnswer: result.correctAnswer,
        meanings: "meanings" in result ? result.meanings : undefined,
      });
      recordResult(result.correct);
      updateXp(result.xp);
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
      completeQuiz(courseSlug, startXp, quiz.length, score.correct).then((result) => {
        setXp(result.xp);
        setBonusAwarded(result.bonusAwarded);
        setStreakBonus(result.streakBonus);
        // Only when something unlocked just now — a level-up already shown
        // elsewhere (see LevelUpCelebration) isn't shown again.
        if (result.newlyUnlockedAccessories.length > 0) {
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
    `${quizIndex}${retry ? "-retry" : ""}`,
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
      <SessionResults
        perfect={perfectScore}
        title={
          perfectScore
            ? t("review_session.perfect_review", "Perfect review!")
            : t("review_session.review_complete", "Review complete!")
        }
        subtitle={t(
          "review_session.results_subtitle",
          "These words will come back around on their own schedule.",
        )}
        earned={xp - startXp}
        earnedLabel={t("review_session.xp_earned", "earned this review")}
        xp={xp}
        perfectBonus={bonusAwarded ? t("review_session.perfect_bonus", "+5 bonus for a perfect review!") : null}
        streakBonus={
          streakBonus > 0
            ? t("test_session.streak_bonus", "+{{amount}} streak bonus!", { amount: formatXp(streakBonus) })
            : null
        }
        tiles={[
          {
            image: CORRECT_MASCOT,
            count: score.correct,
            label: t("test_session.correct", "Correct"),
            tile: "bg-matcha-soft",
            text: "text-matcha-dark",
          },
          {
            image: QUEUE_MASCOT,
            count: score.incorrect,
            label: t("review_session.back_in_queue", "Back in your queue soon"),
            tile: "bg-ai-soft",
            text: "text-ai-dark",
          },
        ]}
        backHref={`/dashboard/courses/${courseSlug}`}
        backLabel={t("test_session.back_to_course", "Back to course")}
      >
        {levelUpInfo && (
          <LevelUpModal
            newLevel={levelUpInfo.newLevel}
            newlyUnlockedAccessories={levelUpInfo.newlyUnlockedAccessories}
            unlockedAccessories={levelUpInfo.unlockedAccessories}
            equippedAccessory={equippedAccessory}
            onDone={(id) => {
              setEquippedAccessory(id);
              markLevelUpSeen(levelUpInfo.newLevel).catch((error) =>
                console.error("Couldn't record the level-up as seen:", error),
              );
              setLevelUpInfo(null);
              refreshDashboardHeader();
            }}
          />
        )}
      </SessionResults>
    );
  }

  return (
    <section className="relative mx-auto flex w-full max-w-4xl flex-col items-center">
      <XpGainToast gain={xpGain} />

      {/* The running score, top right — above the header on small screens,
          where there's no room beside it. */}
      <div className="flex w-full justify-end sm:absolute sm:right-0 sm:top-0 sm:w-auto">
        <LiveScore correct={score.correct} answered={score.correct + score.incorrect} />
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

      {/* Each question pops out to the left and the next springs in from
          the right, as in the learn and test sessions. The header above
          stays put, so progress doesn't jump around. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={quizIndex}
          variants={reduceMotion ? reducedSessionCardVariants : sessionCardVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="flex w-full flex-col items-center"
        >
          <div className="mb-2 flex w-full justify-end">
            <FlagButton
              courseSlug={courseSlug}
              wordId={question.wordId}
              flagged={flagged.has(question.wordId)}
              onChange={(isFlagged) =>
                setFlagged((current) => {
                  const next = new Set(current);
                  if (isFlagged) next.add(question.wordId);
                  else next.delete(question.wordId);
                  return next;
                })
              }
            />
          </div>

          {question.kind === "type-form" || question.kind === "form-choice" ? (
            <ClozeCard
              sentence={question.clozeSentence}
              translation={question.clozeSentenceJa}
              highlight={question.clozeHighlightJa}
              romanization={question.clozeRomanization}
              blankWords={question.clozeBlankWords}
              path={question.path}
              feedback={feedback}
            />
          ) : (
            <div className="w-full rounded-3xl border border-card-border bg-washi-soft p-7 text-center shadow-sm sm:p-9">
              {/* Only when the prompt is the meaning (type the Cantonese for
                  "sorry"): there the picture adds nothing the prompt doesn't
                  say. Asked for the meaning of 對唔住, it would give it away. */}
              {question.direction === "term-to-translation" ? null : (
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
                    ? t("test_session.type_the_romanized_word", "Type the word in Jyutping or characters")
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
                  <Jyutping text={question.promptRomanization} />
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
              {retry && !feedback && <RetryNote retry={retry} />}
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
                    placeholder={t("test_session.type_jyutping_placeholder", "Jyutping or characters")}
                    className={ANSWER_FIELD_CLASS}
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
                    className={ANSWER_FIELD_CLASS}
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

              {feedback.retried && (
                <p className="mt-1 text-sm">{retriedMessage(feedback.retried, t)}</p>
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

          {/* Wrong: the lesson, right here. Right: still a tap away. */}
          {feedback && !feedback.correct && (
            <InlineLesson courseSlug={courseSlug} wordId={question.wordId} />
          )}

          {feedback && feedback.correct && (
            <div className="mt-3 flex justify-center">
              <LessonButton courseSlug={courseSlug} wordId={question.wordId} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
};
