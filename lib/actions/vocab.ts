"use server";

import { revalidatePath } from "next/cache";
import {
  bumpStreak,
  ensureDeckActivations,
  introduceLearnWords,
  requireLearner,
} from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  MAX_STAGE,
  nextReviewAtForStage,
  nextStageAfterAnswer,
  streakBonusXp,
  toUTCDateString,
} from "@/lib/srs";
import { levelForXp, parseDonguriConfig, type AccessoryId } from "@/lib/levels";
import { unlockEarnedAccessories } from "@/lib/accessory-unlocks";
import { scheduleWeeklyCrownCheck } from "@/lib/weekly-crown";
import type { OptionMeaning, QuizDirection } from "@/lib/definitions";
import { isLatinTypeable } from "@/lib/language";

// How loosely a typed answer is read. Vocab answers are lenient: slashes
// separate alternatives ("they / them") and a bracketed note is optional
// ("you (plural)"). Grammar keeps both — they're part of the pattern
// ("You / We / They + are + adjective/noun"), so "noun" mustn't count.
type AnswerLeniency = { vocab: boolean };

// The separate readings packed into one stored answer: a comma-separated
// list ("こんにちは, もしもし") or, for vocab, slash-separated alternatives.
// Any one of them on its own is a correct answer.
function answerReadings(stored: string, { vocab }: AnswerLeniency): string[] {
  return stored
    .split(vocab ? /[,/]/ : ",")
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");
}

// A bracketed note on a reading — "(plural)", or full-width "（に）".
const READING_NOTE = /\s*[(（][^()（）]*[)）]/g;

type TypedAnswerMatch = {
  correct: boolean;
  // The reading in full when the learner left its bracketed note off
  // ("you" for "you (plural)") — still correct, but worth showing them.
  fullAnswer: string | null;
};

// English contractions written out in full, so "She isn't" matches "She is
// not" (and "I'm" matches "I am") either way round. Irregular ones first,
// before the general "-n't". Only pronoun + 's is expanded — "Tom's" could
// be possessive — and 'd is left alone, being either "had" or "would".
const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, "can not"],
  [/\bcannot\b/g, "can not"],
  [/\bwon't\b/g, "will not"],
  [/\bshan't\b/g, "shall not"],
  [/\b([a-z]+)n't\b/g, "$1 not"],
  [/\bi'm\b/g, "i am"],
  [/\b(you|we|they)'re\b/g, "$1 are"],
  [/\b(he|she|it|that|what|where|who|there|here)'s\b/g, "$1 is"],
  [/\b(i|you|we|they)'ve\b/g, "$1 have"],
  [/\b(i|you|he|she|it|we|they)'ll\b/g, "$1 will"],
];

// Lower-cased and trimmed, with the spacing around slashes and between
// words evened out — so "he/she/it" and "He / she / it" compare equal —
// curly apostrophes (as phone keyboards type them) made straight, and
// contractions written out in full (see CONTRACTIONS).
function normaliseAnswer(text: string): string {
  let normalised = text
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ");
  for (const [pattern, expansion] of CONTRACTIONS) {
    normalised = normalised.replace(pattern, expansion);
  }
  return normalised;
}

// Whether `guess` (already normalised) is one reading, as-is or — for
// vocab — with its bracketed note taken off.
function matchReading(guess: string, readings: string[], leniency: AnswerLeniency): TypedAnswerMatch {
  if (readings.some((reading) => normaliseAnswer(reading) === guess)) {
    return { correct: true, fullAnswer: null };
  }

  if (leniency.vocab) {
    const noteless = readings.find((reading) => {
      const bare = reading.replace(READING_NOTE, "").trim();
      return bare !== "" && bare !== reading && normaliseAnswer(bare) === guess;
    });
    if (noteless) return { correct: true, fullAnswer: noteless };
  }

  return { correct: false, fullAnswer: null };
}

// Case-insensitive match against any one reading of the stored answer (see
// answerReadings), ignoring spacing around slashes, then — for vocab —
// against each reading with its bracketed note taken off. A vocab answer
// typed as several alternatives at once ("he/she/it" for "he / she / it",
// or just "she/he") is right when every part is. Shared by every
// typed-answer check.
function matchTypedAnswer(typed: string, stored: string, leniency: AnswerLeniency): TypedAnswerMatch {
  const guess = normaliseAnswer(typed);
  const readings = answerReadings(stored, leniency);

  const single = matchReading(guess, readings, leniency);
  if (single.correct || !leniency.vocab || !guess.includes("/")) return single;

  const parts = guess.split("/");
  const allAccepted =
    parts.length > 1 &&
    parts.every((part) => part !== "" && matchReading(part.trim(), readings, leniency).correct);
  return { correct: allAccepted, fullAnswer: null };
}

// Every reading of the answer, when there's more than one — so a learner
// who typed "they" for "they / them" is told "them" would have been fine
// too. Empty for a single-reading answer.
function alternativeReadings(stored: string, leniency: AnswerLeniency): string[] {
  const readings = answerReadings(stored, leniency);
  return readings.length > 1 ? readings : [];
}

// Jyutping with its tone digits taken out ("nei5 hou2" → "nei hou"), for
// telling a tone slip apart from a wrong word.
function withoutTones(jyutping: string): string {
  return jyutping.toLowerCase().replace(/[1-6]/g, "").replace(/\s+/g, " ").trim();
}

// Whether a wrong romanized answer has every syllable right and only the
// tones wrong (or missing) — see RETRY_XP.
function isToneMiss(typed: string, stored: string, leniency: AnswerLeniency): boolean {
  const guess = withoutTones(typed);
  return (
    guess !== "" &&
    answerReadings(stored, leniency).some((reading) => withoutTones(reading) === guess)
  );
}

// The fewest single-letter fixes — add, remove, change, or swap two
// neighbours — that turn one string into the other ("freind" → "friend"
// is 1). Optimal string alignment distance, which handles missing or extra
// letters, unlike comparing letter by letter.
function spellingDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

// The accepted reading a wrong English answer was nearly spelt as, or null.
// "Nearly" means the same first letter and 1 slip for a 4-7 letter answer,
// up to 2 from 8 letters ("recieve", "beautful", "accomodation"). Answers
// under 4 letters never count — one change there is usually a different
// word (cat / cut). Checked against each reading with its bracketed note
// off, since that's the part people type.
function nearMissReading(typed: string, stored: string, leniency: AnswerLeniency): string | null {
  const guess = normaliseAnswer(typed);
  if (!guess) return null;
  const guessWords = guess.split(" ");

  // A near miss is one misspelt word: same number of words, every word
  // but one exactly right, and that one close enough. So "She is nto"
  // counts for "She is not", but a different phrasing never does — that's
  // grammar, not spelling.
  for (const reading of answerReadings(stored, leniency)) {
    const answer = reading.replace(READING_NOTE, "").trim();
    const targetWords = normaliseAnswer(answer).split(" ");
    if (targetWords.length !== guessWords.length) continue;

    const differing = targetWords.flatMap((word, index) =>
      word === guessWords[index] ? [] : [[guessWords[index], word] as const],
    );
    if (differing.length === 1 && isNearMissWord(...differing[0])) return answer;
  }
  return null;
}

// One word nearly spelt right: the same first letter, and 1 slip for a
// 4-7 letter word, up to 2 from 8 letters. Words under 4 letters never
// count (cat / cut).
function isNearMissWord(guess: string, target: string): boolean {
  if (target.length < 4 || guess[0] !== target[0]) return false;
  const distance = spellingDistance(guess, target);
  return distance > 0 && distance <= (target.length >= 8 ? 2 : 1);
}

// The accepted Jyutping reading a wrong romanized answer was nearly spelt
// as, or null: the same syllables bar one, and that one a single letter off
// — an extra, missing, changed or swapped letter ("gaam1" for "gam1"),
// whatever its tone. Tones are judged separately (see isToneMiss), so
// they're ignored here; the retry shows the right tones either way.
function jyutpingSpellingMiss(typed: string, stored: string, leniency: AnswerLeniency): string | null {
  const guess = withoutTones(typed).split(" ").filter(Boolean);
  if (guess.length === 0) return null;

  for (const reading of answerReadings(stored, leniency)) {
    const target = withoutTones(reading).split(" ").filter(Boolean);
    if (target.length !== guess.length) continue;

    const differing = target.flatMap((syllable, index) =>
      syllable === guess[index] ? [] : [[guess[index], syllable] as const],
    );
    if (differing.length === 1 && spellingDistance(...differing[0]) === 1) return reading;
  }
  return null;
}

// A typed answer that's nearly right isn't marked wrong straight away:
// the learner is shown the right answer and types it again. "tone" is a
// Cantonese answer with only its tones wrong; "spelling" is a small
// spelling slip — in an English answer (see nearMissReading), or one letter
// in one syllable of a Jyutping answer (see jyutpingSpellingMiss). Getting it on
// that second go counts as correct, for half the usual XP.
export type RetryReason = "tone" | "spelling";
const RETRY_XP = 0.5;

// Whether a wrong typed answer gets a second go, and why. English answers
// only in the English course, and never for Japanese being typed back.
function retryFor(
  typed: string,
  stored: string,
  leniency: AnswerLeniency,
  targetLanguage: string,
  romanized: boolean,
): { reason: RetryReason; answer: string } | null {
  if (romanized && targetLanguage === "yue") {
    if (isToneMiss(typed, stored, leniency)) {
      return { reason: "tone", answer: stored.split(",")[0].trim() };
    }
    const answer = jyutpingSpellingMiss(typed, stored, leniency);
    if (answer) return { reason: "spelling", answer };
  }
  if (targetLanguage === "en" && isLatinTypeable(stored)) {
    const answer = nearMissReading(typed, stored, leniency);
    if (answer) return { reason: "spelling", answer };
  }
  return null;
}

// The response for an answer being offered a retry — nothing is recorded
// yet, so the XP is just the learner's current total.
async function retryResponse(userId: string, retry: { reason: RetryReason; answer: string }) {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: userId },
    select: { xp: true },
  });
  return {
    correct: false,
    retry: retry.reason,
    correctAnswer: retry.answer,
    xp: profile.xp,
    alternatives: [],
    fullAnswer: null,
  };
}

// +1 XP per correct quiz answer (both multiple-choice and fill-in-the-form
// questions) — see `completeQuiz` below for the +5 perfect-quiz bonus on top
// of this. Returns the profile's new total so the caller can hand it
// straight to the client for the XP counter animation, without a second
// round trip.
async function awardXp(userId: string, amount: number): Promise<number> {
  if (amount === 0) {
    const profile = await prisma.profile.findUniqueOrThrow({
      where: { id: userId },
      select: { xp: true },
    });
    return profile.xp;
  }

  // Logged alongside the running total so "XP this week" can be summed
  // (see XpEvent in prisma/schema.prisma).
  const [profile] = await prisma.$transaction([
    prisma.profile.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
      select: { xp: true },
    }),
    prisma.xpEvent.create({ data: { userId, amount } }),
  ]);
  // Did this take someone's #1 spot? Checked after the response.
  if (amount > 0) scheduleWeeklyCrownCheck();

  return profile.xp;
}

// Shared by `submitAnswer`/`submitFormAnswer`/`submitTypedAnswer`: records
// one answer's result — counts, `lastSeenAt`, XP — always. Stage transition
// (see the STAGES table in lib/srs.ts) only happens when `advancesStage` is
// true, i.e. only for an answer given in the *scheduled review queue*. The
// post-learn quiz deliberately does NOT advance stage: a word's first
// real review has to wait for its stage-1 `nextReviewAt` (set 15 minutes out
// the moment it's learned, in `getLearnQueue`) to actually pass — answering
// it twice correctly thirty seconds after learning it isn't evidence of
// retention over time, so it must not fast-forward the schedule. Without
// this split, a perfect post-learn quiz (2 correct answers) would silently
// jump a fresh word from stage 1 to stage 3, skipping its 4-hour and 1-day
// check-ins entirely — which is exactly the bug this parameter fixes.
// No `revalidatePath` here — this is invoked from the test/review routes
// themselves, and any revalidatePath call, no matter which path it targets,
// makes Next.js re-render *this* route in the same response (see
// node_modules/next/dist/docs/01-app/02-guides/server-actions.md). Since
// `getTestQueue`/`getReviewQueue` reshuffle the session randomly on every
// render, that would swap the current question out from under the user
// mid-session. The dashboard/decks pages read the session via cookies() and
// are already fully dynamic (staleTimes.dynamic defaults to 0), so they pick
// up the updated progress on their own next visit without on-demand
// revalidation.
async function recordAnswer(
  userId: string,
  wordId: string,
  correct: boolean,
  advancesStage: boolean,
  xpForCorrect = 1,
): Promise<{ xp: number }> {
  const progress = await prisma.userWordProgress.findUniqueOrThrow({
    where: { userId_wordId: { userId, wordId } },
    select: {
      stage: true,
      correctCount: true,
      incorrectCount: true,
      word: { select: { languageDeck: { select: { courseId: true } } } },
    },
  });

  const stage = advancesStage ? nextStageAfterAnswer(progress.stage, correct) : progress.stage;
  const mastered = advancesStage && stage >= MAX_STAGE && correct;

  await prisma.userWordProgress.update({
    where: { userId_wordId: { userId, wordId } },
    data: {
      ...(advancesStage
        ? {
            stage,
            nextReviewAt: mastered ? null : nextReviewAtForStage(stage),
            status: mastered ? "known" : "learning",
          }
        : {}),
      correctCount: correct ? progress.correctCount + 1 : progress.correctCount,
      incorrectCount: correct ? progress.incorrectCount : progress.incorrectCount + 1,
      lastSeenAt: new Date(),
    },
  });

  // A scheduled review is logged (for the activity chart, review accuracy
  // and the streak — see ReviewEvent) and counts as the day's activity, so
  // reviewing alone keeps the streak going.
  if (advancesStage) {
    await Promise.all([
      prisma.reviewEvent.create({ data: { userId, wordId, correct } }),
      bumpStreak(userId, progress.word.languageDeck.courseId, new Date()),
    ]);
  }

  const xp = await awardXp(userId, correct ? xpForCorrect : 0);

  return { xp };
}

// Mostly the post-learn quiz (`advancesStage: false`). The review queue
// only asks multiple choice for a non-Latin-script grammar point with no
// cloze content (see grammarChoiceFallback in lib/dal.ts), and passes true.
export async function submitAnswer(
  wordId: string,
  direction: QuizDirection,
  selectedAnswer: string,
  advancesStage = false,
  // Every option on screen, so each one's meaning can be shown once it's
  // answered — looked up by text within the word's own course, the pool
  // the distractors were drawn from (see buildMultipleChoiceQuestion in
  // lib/dal.ts).
  optionTexts: string[] = [],
): Promise<{
  correct: boolean;
  correctAnswer: string;
  xp: number;
  meanings: Record<string, OptionMeaning>;
}> {
  const user = await requireLearner();

  const word = await prisma.word.findUniqueOrThrow({
    where: { id: wordId },
    select: {
      term: true,
      translation: true,
      romanization: true,
      languageDeck: { select: { courseId: true } },
    },
  });

  const optionsAreTerms = direction === "translation-to-term";
  const correctAnswer = optionsAreTerms ? word.term : word.translation;
  const correct = selectedAnswer === correctAnswer;

  const { xp } = await recordAnswer(user.id, wordId, correct, advancesStage);

  const meaningOf = (option: {
    term: string;
    translation: string;
    romanization: string | null;
  }): OptionMeaning =>
    optionsAreTerms
      ? { text: option.translation, romanization: null }
      : { text: option.term, romanization: option.romanization };

  const optionWords =
    optionTexts.length > 0
      ? await prisma.word.findMany({
          where: {
            active: true,
            languageDeck: { courseId: word.languageDeck.courseId },
            ...(optionsAreTerms
              ? { term: { in: optionTexts } }
              : { translation: { in: optionTexts } }),
          },
          select: { term: true, translation: true, romanization: true },
        })
      : [];

  const meanings: Record<string, OptionMeaning> = {};
  for (const option of optionWords) {
    const text = optionsAreTerms ? option.term : option.translation;
    meanings[text] ??= meaningOf(option);
  }
  // Two words can share a translation — the right answer always shows its
  // own word's meaning.
  meanings[correctAnswer] = meaningOf(word);

  return { correct, correctAnswer, xp, meanings };
}

// The typed counterpart to `submitAnswer`, for `TypeAnswerQuestion` — same
// term/translation fact, checked with `matchesTypedAnswer`'s trimmed,
// case-insensitive, comma-list-tolerant comparison instead of an exact
// option match (some translations carry more than one accepted reading,
// e.g. "こんにちは, もしもし"). The word's own alternate answers (see
// WordAlternateAnswer — extra accepted spellings like "3" or "三" for
// "Three") are unioned into the same comma-list check, regardless of which
// side (term or translation) is being typed. The correct-answer shown back
// to the learner is just the first reading, not the full stored list or any
// alternates. Shared by the quiz's typed half (`advancesStage: false`) and
// the review queue's fallback typed question for words with no cloze
// content (`advancesStage: true`).
// A nearly-right answer (a tone slip in Jyutping, a spelling slip in
// English — see retryFor) comes back with `retry` set and nothing recorded
// yet; the learner retypes it and the client sends that with `isRetry`,
// which is recorded as usual but only earns RETRY_XP if right.
export async function submitTypedAnswer(
  wordId: string,
  direction: QuizDirection,
  typedAnswer: string,
  advancesStage: boolean,
  isRetry = false,
): Promise<{
  correct: boolean;
  retry: RetryReason | null;
  correctAnswer: string;
  xp: number;
  alternatives: string[];
  fullAnswer: string | null;
}> {
  const user = await requireLearner();

  const word = await prisma.word.findUniqueOrThrow({
    where: { id: wordId },
    select: {
      term: true,
      translation: true,
      romanization: true,
      path: true,
      alternateAnswers: { select: { value: true } },
      languageDeck: { select: { course: { select: { targetLanguage: true } } } },
    },
  });

  // Mirrors the direction/answer logic in buildTypedQuestion (lib/dal.ts):
  // a non-Latin-typeable vocab term is checked against its romanization
  // instead, since that's the only typeable form of the correct answer.
  const useRomanizedAnswer =
    direction === "translation-to-term" &&
    !isLatinTypeable(word.term) &&
    word.path === "vocab" &&
    Boolean(word.romanization);

  const storedAnswer =
    direction === "term-to-translation"
      ? word.translation
      : useRomanizedAnswer
        ? word.romanization!
        : word.term;
  // Where the Jyutping is asked for, the characters themselves count too —
  // a learner who can write 今日 shouldn't be marked wrong for not typing
  // gam1 jat6. (Characters can't be a near miss, so no retry for them.)
  const acceptedAnswers = [
    storedAnswer,
    ...(useRomanizedAnswer ? [word.term] : []),
    ...word.alternateAnswers.map((alt) => alt.value),
  ].join(",");
  const leniency = { vocab: word.path === "vocab" };
  const { correct, fullAnswer } = matchTypedAnswer(typedAnswer, acceptedAnswers, leniency);
  // A comma list shows just its first reading; slash alternatives
  // ("they / them") are shown whole, since they're one answer.
  const correctAnswer = storedAnswer.split(",")[0].trim();

  const retry =
    correct || isRetry
      ? null
      : retryFor(
          typedAnswer,
          acceptedAnswers,
          leniency,
          word.languageDeck.course.targetLanguage,
          useRomanizedAnswer,
        );
  if (retry) return retryResponse(user.id, retry);

  const { xp } = await recordAnswer(user.id, wordId, correct, advancesStage, isRetry ? RETRY_XP : 1);

  return {
    correct,
    retry: null,
    correctAnswer,
    xp,
    alternatives: alternativeReadings(storedAnswer, leniency),
    fullAnswer,
  };
}

// Checks a typed answer against a word form's value — trimmed and
// case-insensitive, so "Went"/"went "/"WENT" all count. A null `formId`
// means the blank was the word's own term (see findTermClozeMatches in
// lib/cloze.ts), checked against the term plus its alternate answers. Shared by the
// quiz's cloze-preferred typed half (`advancesStage: false`) and the review
// queue's cloze question (`advancesStage: true`) — see `submitTypedAnswer`,
// including its spelling retry (`retry` / `isRetry`).
export async function submitFormAnswer(
  wordId: string,
  formId: string | null,
  typedAnswer: string,
  advancesStage: boolean,
  isRetry = false,
  // A multiple-choice cloze's options, so what each one means can be shown
  // once it's answered (see formOptionMeanings). Empty for a typed one.
  optionTexts: string[] = [],
): Promise<{
  correct: boolean;
  retry: RetryReason | null;
  correctAnswer: string;
  xp: number;
  alternatives?: string[];
  fullAnswer?: string | null;
  meanings?: Record<string, OptionMeaning>;
}> {
  const user = await requireLearner();
  const courseSelect = {
    languageDeck: { select: { course: { select: { id: true, targetLanguage: true } } } },
  };

  if (formId === null) {
    const word = await prisma.word.findUniqueOrThrow({
      where: { id: wordId },
      select: {
        term: true,
        path: true,
        alternateAnswers: { select: { value: true } },
        ...courseSelect,
      },
    });
    const acceptedAnswers = [word.term, ...word.alternateAnswers.map((alt) => alt.value)].join(",");
    const leniency = { vocab: word.path === "vocab" };
    const { correct, fullAnswer } = matchTypedAnswer(typedAnswer, acceptedAnswers, leniency);
    const retry =
      correct || isRetry
        ? null
        : retryFor(typedAnswer, acceptedAnswers, leniency, word.languageDeck.course.targetLanguage, false);
    if (retry) return retryResponse(user.id, retry);

    const { xp } = await recordAnswer(user.id, wordId, correct, advancesStage, isRetry ? RETRY_XP : 1);
    return {
      correct,
      retry: null,
      correctAnswer: word.term,
      xp,
      alternatives: alternativeReadings(word.term, leniency),
      fullAnswer,
      meanings: await formOptionMeanings(word.languageDeck.course.id, optionTexts),
    };
  }

  const form = await prisma.wordForm.findUniqueOrThrow({
    where: { id: formId },
    select: { value: true, wordId: true, word: { select: courseSelect } },
  });

  if (form.wordId !== wordId) {
    throw new Error("Form does not belong to the given word.");
  }

  // Same forgiving comparison as every other typed answer — case, spacing
  // and contractions ("isn't" for "is not") don't matter.
  const correct = normaliseAnswer(typedAnswer) === normaliseAnswer(form.value);
  // A form is one exact value, so it's checked as a single reading.
  const retry =
    correct || isRetry
      ? null
      : retryFor(typedAnswer, form.value, { vocab: false }, form.word.languageDeck.course.targetLanguage, false);
  if (retry) return retryResponse(user.id, retry);

  const { xp } = await recordAnswer(user.id, wordId, correct, advancesStage, isRetry ? RETRY_XP : 1);

  return {
    correct,
    retry: null,
    correctAnswer: form.value,
    xp,
    meanings: await formOptionMeanings(form.word.languageDeck.course.id, optionTexts),
  };
}

// What each of a multiple-choice cloze's options means, for showing under
// them once it's answered — so the wrong ones teach something too. An
// option is a word (打 → "to hit") or a grammar pattern's form (之前 → the
// pattern's meaning); a word with exactly that text wins. Options with no
// match are left out.
async function formOptionMeanings(
  courseId: string,
  optionTexts: string[],
): Promise<Record<string, OptionMeaning>> {
  const texts = [...new Set(optionTexts.map((text) => text.trim()).filter(Boolean))].slice(0, 8);
  if (texts.length === 0) return {};

  const inCourse = { active: true, languageDeck: { courseId, active: true } };
  const [words, forms] = await Promise.all([
    prisma.word.findMany({
      where: { ...inCourse, term: { in: texts } },
      select: { term: true, translation: true },
    }),
    prisma.wordForm.findMany({
      where: { value: { in: texts }, word: inCourse },
      select: { value: true, word: { select: { translation: true } } },
    }),
  ]);

  const meanings: Record<string, OptionMeaning> = {};
  for (const form of forms) meanings[form.value] = { text: form.word.translation, romanization: null };
  for (const word of words) meanings[word.term] = { text: word.translation, romanization: null };
  return meanings;
}

// Checks a selected option against a hand-authored question's correct index.
export async function submitCustomAnswer(
  wordId: string,
  questionId: string,
  selectedOption: string,
): Promise<{ correct: boolean; correctAnswer: string; xp: number }> {
  const user = await requireLearner();

  const question = await prisma.wordQuizQuestion.findUniqueOrThrow({
    where: { id: questionId },
    select: { options: true, correctIndex: true, wordId: true },
  });

  if (question.wordId !== wordId) {
    throw new Error("Question does not belong to the given word.");
  }

  const correctAnswer = question.options[question.correctIndex];
  // Trimmed and case-insensitive: this same check backs both the
  // multiple-choice presentation (an exact click, so this is a no-op) and
  // the free-typed one, where "Correct"/"correct "/"CORRECT" should all count.
  const correct = selectedOption.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

  const { xp } = await recordAnswer(user.id, wordId, correct, false);

  return { correct, correctAnswer, xp };
}

// Called once when a test session's summary screen is reached. Awards a +5
// bonus only when every question in that session was answered correctly —
// the per-question +1 XP was already awarded (and server-verified) by
// `submitAnswer`/`submitFormAnswer` as each question was answered, so this
// only ever adds the bonus on top, never re-awards the base points. Also
// awards the streak bonus (see `streakBonusXp`) — once per UTC day per
// course, tracked via `lastStreakBonusDate` on the enrollment, so finishing
// several quizzes the same day only pays it out once.
// `initialXp` is the XP the learner had when the test session *started*
// (passed back from the client, which got it from the page that fetched the
// session) — comparing its level against the level after this quiz's XP
// (including both bonuses below) is how a level-up crossed during the
// session is detected, regardless of which bonus tipped it over.
export async function completeQuiz(
  courseSlug: string,
  initialXp: number,
  totalQuestions: number,
  correctCount: number,
): Promise<{
  xp: number;
  bonusAwarded: boolean;
  streakBonus: number;
  previousLevel: number;
  newLevel: number;
  newlyUnlockedAccessories: AccessoryId[];
  unlockedAccessories: AccessoryId[];
}> {
  const user = await requireLearner();

  const perfect = totalQuestions > 0 && correctCount === totalQuestions;

  const course = await prisma.course.findUniqueOrThrow({
    where: { slug: courseSlug },
    select: { id: true },
  });
  const enrollment = await prisma.courseEnrollment.findUniqueOrThrow({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    select: { currentStreak: true, lastStreakBonusDate: true },
  });

  const today = new Date();
  const alreadyAwardedToday =
    enrollment.lastStreakBonusDate !== null &&
    toUTCDateString(enrollment.lastStreakBonusDate) === toUTCDateString(today);
  const streakBonus = alreadyAwardedToday ? 0 : streakBonusXp(enrollment.currentStreak);

  if (streakBonus > 0) {
    await prisma.courseEnrollment.update({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      data: { lastStreakBonusDate: today },
    });
  }

  const xp = await awardXp(user.id, (perfect ? 5 : 0) + streakBonus);

  const previousLevel = levelForXp(initialXp);
  const newLevel = levelForXp(xp);

  // Unlocks whatever this XP has reached, including a level crossed by an
  // answer earlier in the session. Empty if it was already claimed (e.g. by
  // the course page after an earlier session the learner left early) — the
  // sessions show the level-up modal only when something new unlocked here,
  // so it's never shown twice.
  const { newlyUnlockedAccessories, unlockedAccessories } = await unlockEarnedAccessories(user.id, xp);

  // Deliberately NOT revalidating here (see `refreshDashboardHeader` below)
  // — a level-up modal may still be showing, and revalidating now was
  // exactly the bug: `revalidatePath(..., "layout")` invalidates the
  // *whole* dashboard layout, including the test/review page still mounted
  // underneath, so Next re-renders it with a fresh (now-empty) `quiz`
  // array a second or two later, which swaps that page over to its
  // "nothing left" empty state — unmounting TestSession/ReviewSession, and
  // the level-up modal along with it, out from under the learner mid-choice.
  return {
    xp,
    bonusAwarded: perfect,
    streakBonus,
    previousLevel,
    newLevel,
    newlyUnlockedAccessories,
    unlockedAccessories,
  };
}

// The revalidation `completeQuiz` above deliberately skips — call this once
// the finished screen is truly done being looked at (immediately, if there
// was no level-up; from the level-up modal's `onDone`, if there was one).
// Keeps the header's XP badge (read from the shared dashboard layout)
// correct once the learner navigates away, without risking unmounting a
// still-visible modal the way calling it from inside `completeQuiz` did.
export async function refreshDashboardHeader(): Promise<void> {
  revalidatePath("/dashboard", "layout");
}

// Called by LearnSession each time the learner clicks "Got it", to mark
// that one word as learnt — see `introduceLearnWords` in lib/dal.ts. Only
// then: the learn page itself is read-only, so opening or refreshing it
// learns nothing. Same reasoning as `submitAnswer` above for no
// revalidatePath: it would re-render the learn page and swap the batch out
// from under the user.
export async function learnWord(courseSlug: string, wordId: string): Promise<void> {
  await introduceLearnWords(courseSlug, [wordId]);
}

export async function skipWord(wordId: string): Promise<void> {
  const user = await requireLearner();

  await prisma.userWordProgress.upsert({
    where: { userId_wordId: { userId: user.id, wordId } },
    create: {
      userId: user.id,
      wordId,
      status: "known",
      skipped: true,
      stage: MAX_STAGE,
      nextReviewAt: null,
    },
    update: {
      status: "known",
      // A word they've already been taught stays counted against a free
      // allowance (see lib/access.ts) — otherwise learn-then-skip would
      // hand the slot back for something new.
      ...(user.tier === "member" && { skipped: true }),
      stage: MAX_STAGE,
      nextReviewAt: null,
    },
  });

  // Same reasoning as `submitAnswer` above — no revalidatePath here.
}

export async function skipLanguageDeck(languageDeckId: string): Promise<void> {
  const user = await requireLearner();

  const words = await prisma.word.findMany({
    where: { languageDeckId },
    select: { id: true },
  });

  if (words.length === 0) {
    return;
  }

  await prisma.userWordProgress.createMany({
    data: words.map((word) => ({
      userId: user.id,
      wordId: word.id,
      status: "known",
      skipped: true,
      stage: MAX_STAGE,
      nextReviewAt: null,
    })),
    skipDuplicates: true,
  });

  await prisma.userWordProgress.updateMany({
    where: {
      userId: user.id,
      wordId: { in: words.map((word) => word.id) },
      status: { not: "known" },
    },
    // Same as skipWord: already-taught words stay counted against a free
    // allowance.
    data: {
      status: "known",
      ...(user.tier === "member" && { skipped: true }),
      stage: MAX_STAGE,
      nextReviewAt: null,
    },
  });

  // "page" scope (the default) only revalidates this exact path, not the
  // whole dashboard subtree — safe even if a practice session happens to be
  // open in another tab.
  revalidatePath("/dashboard");
}

// Turns a deck on/off in the user's personal "active decks" selection for a
// course (see getActiveDeckIds in lib/dal.ts) — upserts rather than
// creating/deleting the row, since `active` being a real column (not row
// presence) is what lets getActiveDeckIds tell "explicitly deactivated"
// apart from "never touched" even once every deck is off. A deck can hold
// vocab words, grammar points, or a mix (see the note on `Word.path` in
// prisma/schema.prisma) — activation is purely per-deck, not per content
// type.
export async function toggleDeckActivation(
  courseSlug: string,
  deckId: string,
  active: boolean,
): Promise<void> {
  const user = await requireLearner();

  await ensureDeckActivations(courseSlug);
  await prisma.userDeckActivation.upsert({
    where: { userId_languageDeckId: { userId: user.id, languageDeckId: deckId } },
    create: { userId: user.id, languageDeckId: deckId, active },
    update: { active },
  });

  revalidatePath(`/dashboard/courses/${courseSlug}`);
}

// Clears this user's progress on one deck's words so it can be learnt from
// scratch, and re-activates it so those words feed Learn again. Unlike
// `resetCourseProgress`, XP, streaks and review history are kept — that work
// still happened.
export async function restartDeck(courseSlug: string, deckId: string): Promise<void> {
  const user = await requireLearner();

  await ensureDeckActivations(courseSlug);

  await prisma.$transaction([
    prisma.userWordProgress.deleteMany({
      where: { userId: user.id, word: { languageDeckId: deckId } },
    }),
    prisma.userDeckActivation.upsert({
      where: { userId_languageDeckId: { userId: user.id, languageDeckId: deckId } },
      create: { userId: user.id, languageDeckId: deckId, active: true },
      update: { active: true },
    }),
  ]);

  revalidatePath(`/dashboard/courses/${courseSlug}`);
}

export async function resetCourseProgress(courseId: string): Promise<void> {
  const user = await requireLearner();

  await prisma.userWordProgress.deleteMany({
    where: { userId: user.id, word: { languageDeck: { courseId } } },
  });

  await prisma.courseEnrollment.update({
    where: { userId_courseId: { userId: user.id, courseId } },
    data: {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      lastStreakBonusDate: null,
    },
  });

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: user.id },
    select: { donguriConfig: true },
  });
  const config = parseDonguriConfig(profile.donguriConfig);

  // XP history goes too, so "XP this week" can't exceed the reset total,
  // and this course's review history and daily-challenge attempts with its
  // progress — both feed the activity chart and the streak (see
  // getDailyActivityCounts / getCourseStreak in lib/dal.ts), so leaving
  // them kept the chart and the streak going after a reset.
  await Promise.all([
    prisma.xpEvent.deleteMany({ where: { userId: user.id } }),
    prisma.reviewEvent.deleteMany({
      where: { userId: user.id, word: { languageDeck: { courseId } } },
    }),
    prisma.dailyChallengeAttempt.deleteMany({ where: { userId: user.id, courseId } }),
  ]);

  await prisma.profile.update({
    where: { id: user.id },
    data: {
      xp: 0,
      // Accessories are gated by XP/level, so resetting back to 0 XP also
      // clears which ones are unlocked/equipped — otherwise the header
      // would show "Lv 0" while still wearing a costume that requires
      // Lv 1+. Other hand-edited keys in the JSON blob are left alone.
      donguriConfig: { ...config, unlockedAccessories: [], equippedAccessory: null },
    },
  });

  // "layout" scope too: the header's XP/level badge lives in the shared
  // dashboard layout, not just the vocab pages under this exact path.
  revalidatePath("/dashboard", "layout");
}
