"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  submitAnswer,
  submitFormAnswer,
  submitCustomAnswer,
  submitTypedAnswer,
  completeQuiz,
  refreshDashboardHeader,
} from "@/lib/actions/vocab";
import type { QuizOption, QuizQuestion } from "@/lib/definitions";
import {
  SpeakButton,
  ClozeCard,
  FormChoiceOptions,
  ProgressSegments,
  reducedSessionCardVariants,
  sessionCardVariants,
  useAnswerFocus,
  useEnterToContinue,
  MultipleChoiceOptions,
  RetryNote,
  retriedMessage,
  type PendingRetry,
  type ChoiceFeedback,
} from "@/components/vocab/session-ui";
import { WordImage } from "@/components/ui/word-image";
import { XpCounter } from "@/components/xp/xp-counter";
import { LevelUpModal } from "@/components/donguri/level-up-modal";
import { Button } from "@/components/ui/button";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { useTranslations } from "@/components/i18n/locale-provider";
import { Jyutping, JyutpingInput } from "@/components/vocab/jyutping";
import { LessonButton, lessonAccent } from "@/components/vocab/word-lesson";
import { parseDonguriConfig, formatXp, type AccessoryId } from "@/lib/levels";

// The typed-answer form lives in the card, its Check button below it (like
// the learn card's "Got it") — tied together by this id.
const TYPED_ANSWER_FORM = "test-typed-answer";

type TestSessionProps = {
  quiz: QuizQuestion[];
  courseSlug: string;
  initialXp: number;
  initialDonguriConfig: unknown;
};

type Feedback = ChoiceFeedback;

// What both typed-answer actions return (submitTypedAnswer, submitFormAnswer).
type TypedResult = Awaited<ReturnType<typeof submitFormAnswer | typeof submitTypedAnswer>>;

type LevelUpInfo = {
  newLevel: number;
  newlyUnlockedAccessories: AccessoryId[];
  unlockedAccessories: AccessoryId[];
};

export const TestSession = ({
  quiz: initialQuiz,
  courseSlug,
  initialXp,
  initialDonguriConfig,
}: TestSessionProps) => {
  // The questions are fixed for the whole session. The page can re-render
  // underneath it (e.g. the header refresh once it's finished), and the
  // queue it hands down is rebuilt — reshuffled, possibly longer — every
  // time; taking that mid-session swapped the current question and could
  // turn "See my results" into yet another question.
  const [quiz] = useState(initialQuiz);
  const t = useTranslations();
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const [quizIndex, setQuizIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  // A nearly-right answer being typed again (a tone or spelling slip).
  const [retry, setRetry] = useState<PendingRetry | null>(null);
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

  const recordResult = (correct: boolean) => {
    setScore((current) => ({
      correct: current.correct + (correct ? 1 : 0),
      incorrect: current.incorrect + (correct ? 0 : 1),
    }));
  };

  const handleMultipleChoiceAnswer = async (option: QuizOption) => {
    if (feedback || pending || question.kind !== "multiple-choice") return;

    setPending(true);

    try {
      const result = await submitAnswer(question.wordId, question.direction, option.text);
      setFeedback({ selected: option.text, correct: result.correct, correctAnswer: result.correctAnswer });
      recordResult(result.correct);
      setXp(result.xp);
    } finally {
      setPending(false);
    }
  };

  // Shared by the two typed questions: a near miss (`result.retry`) keeps
  // the question open for a second go at half XP; anything else is the
  // answer's result.
  const applyTypedResult = (result: TypedResult) => {
    if (result.retry) {
      setRetry({ answer: result.correctAnswer, reason: result.retry });
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
    setXp(result.xp);
  };

  const handleTypeFormSubmit = async () => {
    if (feedback || pending || question.kind !== "type-form" || typedAnswer.trim() === "") return;

    setPending(true);

    try {
      applyTypedResult(
        await submitFormAnswer(question.wordId, question.formId, typedAnswer, false, retry !== null),
      );
    } finally {
      setPending(false);
    }
  };

  const handleFormChoiceAnswer = async (optionValue: string) => {
    if (feedback || pending || question.kind !== "form-choice") return;

    setPending(true);

    try {
      const result = await submitFormAnswer(question.wordId, question.formId, optionValue, false);
      setFeedback({ selected: optionValue, correct: result.correct, correctAnswer: result.correctAnswer });
      recordResult(result.correct);
      setXp(result.xp);
    } finally {
      setPending(false);
    }
  };

  const handleCustomChoiceAnswer = async (optionValue: string) => {
    if (feedback || pending || question.kind !== "custom-choice") return;

    setPending(true);

    try {
      const result = await submitCustomAnswer(question.wordId, question.questionId, optionValue);
      setFeedback({ selected: optionValue, correct: result.correct, correctAnswer: result.correctAnswer });
      recordResult(result.correct);
      setXp(result.xp);
    } finally {
      setPending(false);
    }
  };

  const handleCustomTypeSubmit = async () => {
    if (feedback || pending || question.kind !== "custom-type" || typedAnswer.trim() === "") return;

    setPending(true);

    try {
      const result = await submitCustomAnswer(question.wordId, question.questionId, typedAnswer);
      setFeedback({ selected: typedAnswer, correct: result.correct, correctAnswer: result.correctAnswer });
      recordResult(result.correct);
      setXp(result.xp);
    } finally {
      setPending(false);
    }
  };

  const handleTypeAnswerSubmit = async () => {
    if (feedback || pending || question.kind !== "type-answer" || typedAnswer.trim() === "") return;

    setPending(true);

    try {
      applyTypedResult(
        await submitTypedAnswer(
          question.wordId,
          question.direction,
          typedAnswer,
          false,
          retry !== null,
        ),
      );
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
    `${quizIndex}${retry ? "-retry" : ""}`,
    !feedback && !finished,
  );
  // On the results screen, Enter is "Back to course" — held off while the
  // level-up modal is up, which has its own button.
  useEnterToContinue(finished && !levelUpInfo, () =>
    router.push(`/dashboard/courses/${courseSlug}`),
  );

  // Landed with nothing to test (everything's been quizzed): straight back
  // to the course rather than an empty screen. Only on arrival — once a
  // quiz is finished its results stay put, even though the page behind
  // them re-renders with an empty queue (see refreshDashboardHeader).
  const nothingToTest = quiz.length === 0 && !finished;
  useEffect(() => {
    if (nothingToTest) router.replace(`/dashboard/courses/${courseSlug}`);
  }, [nothingToTest, router, courseSlug]);

  if (nothingToTest) return null;

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
            ? t("test_session.perfect_score", "Perfect score!")
            : t("test_session.lovely_work", "Lovely work today!")}
        </PageTitle>

        <PageSubtitle className="mt-2 max-w-sm">
          {t(
            "test_session.results_subtitle",
            "Every practice session helps these words stick a little better.",
          )}
        </PageSubtitle>

        <div className="mt-6 flex flex-col items-center gap-2">
          <XpCounter value={xp} />
          {bonusAwarded && (
            <span className="text-sm font-medium text-matcha-dark">
              {t("test_session.perfect_bonus", "+5 bonus for a perfect quiz!")}
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

  // Laid out like a learn card (see LearnSession and WordLesson): a vocab
  // question puts the word's picture on the left and the question beside
  // it; everything else is one column. Safe in either direction now the
  // answer options never carry pictures of their own to match against.
  const showPicture =
    (question.kind === "multiple-choice" || question.kind === "type-answer") &&
    question.path === "vocab";
  const isTyped =
    question.kind === "type-form" ||
    question.kind === "custom-type" ||
    question.kind === "type-answer";
  const inputClass =
    "h-14 w-full rounded-2xl border-2 border-sumi/10 bg-washi-soft/60 px-6 text-xl text-sumi outline-none transition focus:border-ai/60 focus:bg-washi focus:ring-4 focus:ring-ai/10 disabled:opacity-60";

  const header = (
    <div className="flex flex-col items-center text-center">
      <span
        className={`mb-3 rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
          question.path === "grammar"
            ? "bg-matcha-soft text-matcha-dark"
            : "bg-ai-soft text-ai-dark"
        }`}
      >
        {question.path === "grammar"
          ? t("course_home.grammar", "Grammar")
          : t("course_home.vocabulary", "Vocabulary")}
      </span>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-sumi-soft">
        {t("test_session.question_progress", "Question {{current}} of {{total}}", {
          current: quizIndex + 1,
          total: quiz.length,
        })}
      </p>
      <div className="mt-2 flex w-full justify-center">
        <ProgressSegments current={quizIndex + 1} total={quiz.length} />
      </div>
    </div>
  );

  const typedInput = (onSubmit: () => void, placeholder: string) => (
    <form
      id={TYPED_ANSWER_FORM}
      className="mt-6 w-full"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
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
          className={inputClass}
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
          placeholder={placeholder}
          className={inputClass}
        />
      )}
    </form>
  );

  // The question itself (prompt + answer area), whichever kind it is.
  let body: React.ReactNode;
  if (question.kind === "type-form" || question.kind === "form-choice") {
    body = (
      <>
        <div className="mt-6 w-full">
          <ClozeCard
            sentence={question.clozeSentence}
            translation={question.clozeSentenceJa}
            highlight={question.clozeHighlightJa}
            romanization={question.clozeRomanization}
            path={question.path}
            feedback={feedback}
          />
        </div>
        {question.kind === "type-form" ? (
          <>
            {retry && !feedback && <RetryNote retry={retry} />}
            {typedInput(
              handleTypeFormSubmit,
              t("test_session.type_answer_placeholder", "Type your answer"),
            )}
          </>
        ) : (
          <FormChoiceOptions
            options={question.options}
            feedback={feedback}
            disabled={pending || Boolean(feedback)}
            onChoose={handleFormChoiceAnswer}
          />
        )}
      </>
    );
  } else if (question.kind === "custom-choice" || question.kind === "custom-type") {
    body = (
      <>
        <div className="mt-6 flex flex-col items-center text-center">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-sumi-soft">
            {t("test_session.quiz_question", "Quiz question")}
          </p>
          <p className="mt-3 text-2xl font-semibold text-sumi sm:text-3xl">{question.prompt}</p>
          {question.promptJa && <p className="mt-2 text-sumi-soft">{question.promptJa}</p>}
        </div>
        {question.kind === "custom-type" ? (
          typedInput(
            handleCustomTypeSubmit,
            t("test_session.type_answer_placeholder", "Type your answer"),
          )
        ) : (
          <FormChoiceOptions
            options={question.options.map((option) => ({ text: option, romanization: null }))}
            feedback={feedback}
            disabled={pending || Boolean(feedback)}
            onChoose={handleCustomChoiceAnswer}
          />
        )}
      </>
    );
  } else {
    const promptLabel =
      question.kind === "type-answer" && question.answerRomanized
        ? t("test_session.type_the_romanized_word", "Type the romanized word")
        : question.direction === "translation-to-term"
          ? t("test_session.what_does_this_mean", "What does this mean?")
          : question.kind === "type-answer"
            ? t("test_session.type_the_word", "Type the word")
            : t("test_session.find_the_right_word", "Can you find the right word?");
    // A grammar point's translation is a whole explanation — too long for
    // the big headline size a single word gets.
    const longPrompt = question.prompt.length > 24;

    body = (
      <>
        <div className="mt-6 flex flex-col items-center text-center">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-sumi-soft">
            {promptLabel}
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <p
              className={`font-extrabold tracking-tight text-sumi capitalize ${
                longPrompt ? "text-2xl sm:text-3xl" : "text-4xl sm:text-5xl"
              }`}
            >
              {question.prompt}
            </p>
            {question.direction === "term-to-translation" && (
              <SpeakButton text={question.prompt} language={question.targetLanguage} />
            )}
          </div>
          {question.promptRomanization && (
            <p className="mt-2 text-lg text-sumi-soft">
              <Jyutping text={question.promptRomanization} chart />
            </p>
          )}
        </div>
        {question.kind === "type-answer" ? (
          <>
            {retry && !feedback && <RetryNote retry={retry} />}
            {typedInput(
              handleTypeAnswerSubmit,
              question.answerRomanized
                ? t("test_session.type_romanized_placeholder", "Type the romanization")
                : t("test_session.type_answer_placeholder", "Type your answer"),
            )}
          </>
        ) : (
          <MultipleChoiceOptions
            question={question}
            feedback={feedback}
            disabled={pending || Boolean(feedback)}
            onChoose={handleMultipleChoiceAnswer}
            singleColumn={showPicture}
          />
        )}
      </>
    );
  }

  const feedbackBanner = feedback && (
    <motion.div
      key={`${quizIndex}-feedback`}
      aria-live="polite"
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={
        reduceMotion
          ? { opacity: 1, y: 0, scale: 1 }
          : feedback.correct
            ? { opacity: 1, y: 0, scale: [0.96, 1.04, 1] }
            : { opacity: 1, y: 0, scale: 1, x: [0, -10, 10, -6, 6, 0] }
      }
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={`relative mt-5 flex w-full items-center gap-4 overflow-hidden rounded-3xl px-5 py-4 sm:px-6 ${
        feedback.correct
          ? "bg-matcha-soft text-matcha-dark ring-2 ring-matcha/30"
          : "bg-shu/10 text-shu-dark ring-2 ring-shu/25"
      }`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-washi shadow-sm ${
          feedback.correct ? "bg-matcha" : "bg-shu"
        }`}
      >
        {feedback.correct ? (
          <Check aria-hidden className="h-7 w-7" strokeWidth={3} />
        ) : (
          <X aria-hidden className="h-7 w-7" strokeWidth={3} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold">
          {feedback.correct
            ? t("test_session.great_job", "Great job! You got it.")
            : t("test_session.almost", "Almost! You'll get it next time.")}
        </p>

        {!feedback.correct && (
          <p className="mt-1">
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

      {/* Donguri cheering a right answer; the reading rabbit for one to
          learn from. Decorative, so hidden from screen readers. */}
      {feedback.correct ? (
        <Image
          src="/images/mascot.png"
          alt=""
          aria-hidden="true"
          width={1224}
          height={1285}
          className="-my-3 hidden h-20 w-auto shrink-0 object-contain sm:block"
        />
      ) : (
        <Image
          src="/images/rabbit-reading.webp"
          alt=""
          aria-hidden="true"
          width={905}
          height={929}
          className="-my-3 hidden h-20 w-auto shrink-0 object-contain sm:block"
        />
      )}
    </motion.div>
  );

  return (
    <section
      className={`mx-auto w-full overflow-x-clip ${showPicture ? "max-w-6xl" : "max-w-3xl"}`}
    >
      <div className="mb-4 flex w-full justify-center">
        <XpCounter value={xp} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={quizIndex}
          variants={reduceMotion ? reducedSessionCardVariants : sessionCardVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className={`relative rounded-4xl border-[1.5px] bg-raised px-5 pb-5 pt-6 shadow-sm sm:px-10 sm:pb-8 sm:pt-8 dark:border ${
            lessonAccent(question.path).card
          }`}
        >
          {showPicture &&
          (question.kind === "multiple-choice" || question.kind === "type-answer") ? (
            <div className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12">
              <div className="flex aspect-[4/3] max-h-[35vh] w-full items-center justify-center overflow-hidden rounded-3xl bg-washi-soft shadow-inner md:max-h-[55vh]">
                <WordImage
                  src={question.image}
                  alt={question.direction === "term-to-translation" ? question.prompt : ""}
                  className="h-full w-full object-cover"
                  fallback={
                    // No picture for this word yet: Donguri keeps the space.
                    <Image
                      src="/images/mascot.png"
                      alt=""
                      aria-hidden="true"
                      width={1224}
                      height={1285}
                      className="h-1/2 w-auto object-contain opacity-90"
                    />
                  }
                />
              </div>
              <div className="flex flex-col items-center py-2">
                {header}
                {body}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {header}
              {body}
            </div>
          )}

          {feedbackBanner}
        </motion.div>
      </AnimatePresence>

      <div className="mx-auto mt-6 flex w-full max-w-md flex-col items-center gap-3">
        {feedback ? (
          <Button
            onClick={advance}
            size="lg"
            fullWidth
            className="h-14 text-lg shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          >
            {quizIndex + 1 < quiz.length
              ? t("test_session.next_question", "Next question")
              : t("test_session.see_my_results", "See my results")}
            <ArrowRight aria-hidden className="h-5 w-5" />
          </Button>
        ) : (
          isTyped && (
            <Button
              type="submit"
              form={TYPED_ANSWER_FORM}
              disabled={pending || typedAnswer.trim() === ""}
              size="lg"
              fullWidth
              className="h-14 text-lg shadow-sm hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0"
            >
              {t("test_session.check", "Check")}
            </Button>
          )
        )}

        {feedback && (
          <>
            <p className="hidden text-xs text-sumi-soft/80 sm:block">
              {t("learn_session.enter_hint", "or press Enter")}
            </p>
            <LessonButton courseSlug={courseSlug} wordId={question.wordId} />
          </>
        )}
      </div>
    </section>
  );
};
