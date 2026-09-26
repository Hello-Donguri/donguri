"use server";

import OpenAI from "openai";
import { revalidatePath } from "next/cache";
import {
  requireSubscriber,
  requireProfile,
  MAX_DAILY_CHALLENGE_ATTEMPTS,
  bumpStreak,
} from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { startOfUTCDay, dailyChallengeXp } from "@/lib/srs";
import { isLatinTypeable } from "@/lib/language";
import {
  JAPANESE_FEEDBACK_RULE,
  challengeLanguage,
  pickChallengeTarget,
  type ChallengeItem,
  type ChallengeTarget,
} from "@/lib/daily-challenge";

// A daily-challenge attempt is a chat with Charles Duck in which the learner
// has to work a target word and/or grammar pattern (see pickChallengeTarget)
// into the conversation naturally. The attempt ends on the first message
// that uses the target; that message's scores decide the XP (see dailyChallengeXp in lib/srs.ts). The target is always
// re-derived here rather than taken from the client, and the scores come
// straight from the model, so the client can't award itself XP.

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

// End-of-attempt review, only written for the message that uses the target.
// The ...Ja fields are the Japanese versions for the English course (see
// JAPANESE_FEEDBACK_RULE) — null/empty for Cantonese, whose feedback is
// already in the learner's English. betterVersion is in the language being
// learnt, since it's the sentence to learn from.
export type ChallengeSummary = {
  overall: string;
  overallJa: string | null;
  tips: string[];
  // Same order as `tips`; empty when the model didn't return a matching set.
  tipsJa: string[];
  betterVersion: string;
  // Jyutping for a Cantonese betterVersion; null otherwise.
  betterVersionRomanization: string | null;
};

// Charles's reply: `text` in the language being learnt, `translation` in
// the learner's own (behind the Translate button), `romanization` the
// Jyutping for Cantonese (null for English).
export type ChatReply = {
  text: string;
  romanization: string | null;
  translation: string;
  grammarScore: number;
  naturalnessScore: number;
  relevanceScore: number;
  complexityScore: number;
  feedback: string;
  // Japanese version of `feedback`; null if the model left it out.
  feedbackJa: string | null;
  usedTarget: boolean;
  summary: ChallengeSummary | null;
};

export type ChallengeCompletion = {
  xpEarned: number;
  attemptsToday: number;
};

export type SendDailyChallengeMessageResult =
  | { ok: true; reply: ChatReply; completion: ChallengeCompletion | null }
  | {
      ok: false;
      reason: "not_enrolled" | "limit_reached" | "nothing_learnt" | "error";
      error?: string;
    };

const MAX_HISTORY_TURNS = 16;
const MAX_MESSAGE_LENGTH = 500;
const SCORE_FIELDS = [
  "grammarScore",
  "naturalnessScore",
  "relevanceScore",
  "complexityScore",
] as const;
// Relevance ceiling for a message that doesn't respond to what Charles just
// said (e.g. dodging his question with one of its own). Low enough that a
// dodge can't total more than 34/40, so it only ever earns the base XP
// (see dailyChallengeXp), however fluent it sounds — the model tends to
// score the sentence on its own otherwise.
const NON_RESPONSE_RELEVANCE_CAP = 4;

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseSummary(value: unknown): ChallengeSummary | null {
  if (!value || typeof value !== "object") return null;

  const summary = value as Record<string, unknown>;
  if (
    typeof summary.overall !== "string" ||
    typeof summary.betterVersion !== "string" ||
    !Array.isArray(summary.tips)
  ) {
    return null;
  }

  const tips = summary.tips.filter((tip): tip is string => typeof tip === "string").slice(0, 3);
  const tipsJa = Array.isArray(summary.tipsJa)
    ? summary.tipsJa.filter((tip): tip is string => typeof tip === "string").slice(0, 3)
    : [];

  return {
    overall: summary.overall,
    overallJa: optionalString(summary.overallJa),
    betterVersion: summary.betterVersion,
    betterVersionRomanization: optionalString(summary.betterVersionRomanization),
    tips,
    // Paired with `tips` by position, so a mismatched list is dropped
    // rather than showing the wrong translation next to a tip.
    tipsJa: tipsJa.length === tips.length ? tipsJa : [],
  };
}

function isChatReply(
  value: unknown,
): value is Omit<ChatReply, "summary"> & { summary?: unknown; respondedToYou?: boolean } {
  if (!value || typeof value !== "object") return false;

  const reply = value as Record<string, unknown>;

  return (
    typeof reply.text === "string" &&
    typeof reply.translation === "string" &&
    typeof reply.feedback === "string" &&
    typeof reply.usedTarget === "boolean" &&
    (reply.respondedToYou === undefined || typeof reply.respondedToYou === "boolean") &&
    SCORE_FIELDS.every((field) => {
      const score = reply[field];
      return typeof score === "number" && score >= 0 && score <= 10;
    })
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Jyutping with the tone numbers and punctuation taken off, as
// space-separated syllables ("Nei5 hou2!" → "nei hou") — so a learner who
// types "nei hou" or "nei5hou2" still counts as using 你好.
function bareJyutping(text: string): string {
  return text
    .toLowerCase()
    .replace(/([a-z]+)[1-6]/g, "$1 ")
    .replace(/[^a-z]+/g, " ")
    .trim();
}

// Whether the message contains the target word. This decides a word target
// on its own (see describeTargetUsage), so the model can neither end a
// chat without the word nor keep one going that has it. Grammar patterns
// can't be matched like this, so those are left to the model.
// - A Latin-script word (English): the term or any of its forms, as a
//   whole word.
// - Chinese characters: the characters anywhere in the message (there are
//   no spaces between words to anchor on), or — since learners may answer
//   in Jyutping — the word's Jyutping as whole syllables, with or without
//   tone numbers.
function containsVocab(sentence: string, item: ChallengeItem): boolean {
  const values = [item.term, ...item.forms].map((value) => value.trim()).filter(Boolean);

  const inText = values.some((value) =>
    isLatinTypeable(value)
      ? new RegExp(
          `(?<![\\p{L}\\p{N}])${escapeRegExp(value)}(?![\\p{L}\\p{N}])`,
          "iu",
        ).test(sentence)
      : sentence.includes(value),
  );
  if (inText || !item.romanization) return inText;

  const wanted = bareJyutping(item.romanization);
  return wanted !== "" && ` ${bareJyutping(sentence)} `.includes(` ${wanted} `);
}

// The target word written in Jyutping with the right syllables but a wrong
// tone number ("ngo2 dei6" for 我哋, ngo5 dei6) — still counts as using it
// (containsVocab ignores tones), but it's the one mistake worth pointing
// out. Null when the tones are right, left off, or it's not there at all.
function vocabToneMismatch(
  sentence: string,
  item: ChallengeItem,
): { wrote: string; correct: string } | null {
  const correct = item.romanization?.toLowerCase().match(/[a-z]+[1-6]/g);
  if (!correct) return null;

  const toneless = (syllable: string) => syllable.replace(/[1-6]$/, "");
  const written = sentence.toLowerCase().match(/[a-z]+[1-6]?/g) ?? [];

  for (let start = 0; start + correct.length <= written.length; start++) {
    const window = written.slice(start, start + correct.length);
    if (!window.every((syllable, index) => toneless(syllable) === toneless(correct[index]))) {
      continue;
    }
    const wrongTone = window.some(
      (syllable, index) => /[1-6]$/.test(syllable) && syllable !== correct[index],
    );
    return wrongTone ? { wrote: window.join(" "), correct: correct.join(" ") } : null;
  }

  return null;
}

function describeItem(item: ChallengeItem): string {
  const forms =
    item.forms.length > 0 ? ` — any form counts: ${item.forms.join(", ")}` : "";
  const romanization = item.romanization ? ` [Jyutping: ${item.romanization}]` : "";
  const explanation = item.explanation ? `; ${item.explanation}` : "";
  return `"${item.term}"${romanization} (${item.translation}${explanation})${forms}`;
}

function describeTarget(target: ChallengeTarget): string {
  if (target.vocab && target.grammar) {
    return `the word ${describeItem(target.vocab)} together with the grammar pattern ${describeItem(target.grammar)}, both in the same message`;
  }
  if (target.grammar) return `the grammar pattern ${describeItem(target.grammar)}`;
  return `the word ${describeItem(target.vocab!)}`;
}

// What the model is told about whether the latest message used the target.
// The vocab word is checked here, not by the model, so any message that
// contains it ends the attempt — even a bare "you" or a broken sentence;
// low quality shows up in the scores instead. Grammar patterns can't be
// string-matched, so an attempt at one is left to the model.
function describeTargetUsage(target: ChallengeTarget, vocabInMessage: boolean): string {
  const attemptRule =
    "Any attempt counts — even if it's wrong, awkward, unrelated to the conversation, or the target on its own with nothing else. Mistakes lower the scores; they never stop the challenge from ending.";

  if (target.vocab && !vocabInMessage) {
    return `The user's latest message does NOT contain the target word, so usedTarget must be false.`;
  }
  if (target.vocab && target.grammar) {
    return `The user's latest message DOES contain the target word. usedTarget is true if it also attempts the grammar pattern ${describeItem(target.grammar)}. ${attemptRule}`;
  }
  if (target.vocab) {
    return `The user's latest message DOES contain the target word, so usedTarget must be true and the chat ends now. ${attemptRule}`;
  }
  return `usedTarget is true if the user's latest message attempts the grammar pattern ${describeItem(target.grammar!)}. ${attemptRule}`;
}

// The parts of the prompt that depend on the course: English for Japanese
// speakers (English chat, feedback also in Japanese) or Cantonese for
// English speakers (written Cantonese with Jyutping, feedback in English,
// and the learner free to answer in characters or Jyutping).
function promptLanguage(target: ChallengeTarget) {
  if (target.targetLanguage === "yue") {
    return {
      intro: `You are Charles Duck, the user's kind Cantonese-speaking friend. The user is an English speaker who is a beginner in Cantonese.`,
      writing: `- Write in natural, colloquial Hong Kong Cantonese as people really text it, in traditional characters (係, 唔, 嘅, 咗, 喺, 佢, 乜嘢 — never Mandarin forms like 是, 不, 的, 了, 在, 他, 什麼).
- The user may write in Chinese characters, in Jyutping (with or without tone numbers), or a mix — all are equally fine. Read their Jyutping as the Cantonese it spells. Never mark them down for writing Jyutping instead of characters, or for missing or wrong tone numbers or spacing.
- If the user writes in English instead of Cantonese, gently keep chatting in Cantonese; an English reply scores low on grammar and naturalness.`,
      replyFields: `	"text": "Charles Duck's simple, casual chat reply, in Cantonese characters",
	"romanization": "The same reply in Jyutping with tone numbers — exactly one syllable per Chinese character, keeping the punctuation",
	"translation": "A natural English translation of the same reply",`,
      feedbackLanguage: `Write it in very simple, beginner-friendly English — short words, short sentences, no grammar jargon. When you quote Cantonese, write the characters followed by their Jyutping in brackets, e.g. 我係學生 (ngo5 hai6 hok6 saang1).`,
      feedbackJaField: "",
      texting:
        "This is casual texting, so ignore punctuation, and never count writing Jyutping instead of characters — or missing tone numbers — as a mistake. A wrong tone number in their Jyutping is a small mistake: take at most 1 point off grammarScore for it, never fail the target over it, and point out the correct tone in your feedback.",
      betterVersion: "in Cantonese characters",
      summaryExtraFields: `,
	"betterVersionRomanization": "The betterVersion in Jyutping with tone numbers, one syllable per character"`,
      feedbackRule: "Quote Cantonese in the summary as characters followed by Jyutping in brackets.",
    };
  }

  return {
    intro: `You are Charles Duck, the user's kind English-speaking friend.`,
    writing: "",
    replyFields: `	"text": "Charles Duck's simple, casual chat reply in English",
	"translation": "A natural Japanese translation of the same reply",`,
    feedbackLanguage: `Write it in very simple, beginner-friendly English — short words, short sentences, no grammar jargon.`,
    feedbackJaField: `,
	"feedbackJa": "The same feedback in Japanese"`,
    texting: "This is casual texting, so ignore capital letters and missing end punctuation.",
    betterVersion: "",
    summaryExtraFields: `,
	"overallJa": "The same overall review in Japanese",
	"tipsJa": ["The same tips in Japanese, one for each tip above, in the same order"]`,
    feedbackRule: JAPANESE_FEEDBACK_RULE,
  };
}

function buildSystemPrompt(
  target: ChallengeTarget,
  vocabInMessage: boolean,
  toneMismatch: { wrote: string; correct: string } | null,
): string {
  const goal = describeTarget(target);
  const language = promptLanguage(target);
  const toneNote = toneMismatch
    ? `\nThe user wrote the target word in Jyutping as "${toneMismatch.wrote}", but its correct tones are "${toneMismatch.correct}". That still counts as using the word. Make the tone correction your "feedback" tip (e.g. "Nice! Just check the tones: it's ${toneMismatch.correct}, not ${toneMismatch.wrote}."), and if the chat ends now, include it in the summary tips too.`
    : "";

  return `${language.intro} You two are just texting casually — this is NOT a classroom and you are not a teacher. You want the user to practice using ${goal} themselves, but you never announce that or make it feel like a lesson.

How to chat:
- Read the whole conversation so far and keep the thread going naturally, the way a real friend remembers what was just said.
- Talk about simple, everyday topics a friend would bring up, and mix them up — food, drinks, the weekend, school or work, a trip, a hobby, a game, a movie or show, pets, family, sports, and so on.
- Use very simple, short sentences, like you are talking to a total beginner. Only common, everyday words — no idioms, no rare or advanced vocabulary, no hard grammar. 1-3 short sentences per reply.
${language.writing ? `${language.writing}\n` : ""}- Never use the target word or grammar pattern yourself, in any language. Leave it for the user. Instead, ask simple questions whose most natural answer would use it.
- Every question must follow on from what the user just said, the way a friend's next question would. Before asking, check: would a real person ask this right after hearing the user's message? If not, it's too sharp a turn — don't ask it. For example, if the user says they saw people playing football, "Where were they playing? Was it far from your house?" follows on; "What is farther away?" does not.
- Steer toward the target gradually, one small step per reply: pick the part of the user's message that sits closest to the target and ask about that. It can take a couple of replies to get there — that's fine, as long as each step makes sense.
- If nothing in the conversation leads toward the target, change topic the way a friend would — briefly react to what the user said, then signal the switch ("Oh nice! By the way, ...", "That sounds fun. Hey, ..."), and make the new question complete and clear on its own. Never ask a bare question that only makes sense if the user can guess what you're getting at.
- Keep every question something the user can easily understand and answer. A vague or abstract question that just happens to invite the target is worse than a clear one that takes one more turn to get there.
- If the user's latest message is only one or two words, or is vague and doesn't really answer what you just asked, warmly ask them to say a little more.
- If the user tries to end the chat early, kindly keep it going with a new simple, friendly question.
- Never break character or mention that this is a language exercise, scoring, or practice.

Return only a JSON object with exactly these fields, in this order:
{
	"assessment": "Private notes for scoring, never shown to the user, 1-2 short sentences: what did you last say or ask, and does the user's latest message actually respond to it?",
	"respondedToYou": true,
${language.replyFields}
	"grammarScore": 0,
	"naturalnessScore": 0,
	"relevanceScore": 0,
	"complexityScore": 0,
	"usedTarget": false,
	"summary": null,
	"feedback": "One short, encouraging sentence with a concrete tip on how the user's latest message could be more natural, correct, or relevant to the conversation — or, if it's already good, richer (e.g. add a reason or a detail) — or a short specific compliment if it's already excellent. If respondedToYou is false, the tip must be about that (e.g. answer my question first, then ask yours)."${language.feedbackJaField}
}
The feedback: ${language.feedbackLanguage}
respondedToYou is true only if the user's latest message actually responds to what you last said. If you asked a question, it must answer it — even briefly or loosely ("Just some toast!", "I'm not sure"). It is false if the user ignores your question, changes the subject, or replies with a question of their own without answering yours. Asking a question back AFTER answering is great ("Pizza! What about you?") and counts as true.
${describeTargetUsage(target, vocabInMessage)} Judge the latest message only, not earlier ones.${toneNote}
grammarScore is an integer from 0 to 10 for the grammatical correctness of the user's latest message, judged on its own, not on relevance. ${language.texting} When usedTarget is true, also judge whether the target is used correctly.
naturalnessScore is an integer from 0 to 10 for how natural the WORDING of the user's latest message is — would a native speaker text it this way? Judge the wording only; whether it fits the conversation is relevanceScore.
- 9-10: exactly how a native speaker would text it. 10 only if there is nothing to change.
- 7-8: clear, but a little stiff, textbook-like, or an unusual word choice.
- 4-6: understandable but awkward — a native speaker would not say it like this, or the target is forced in where it doesn't fit.
- 0-3: hard to understand.
relevanceScore is an integer from 0 to 10 for how well the user's latest message responds to what you just said.
- 9-10: responds directly and fully to what you said. 10 only if it's exactly the kind of reply a friend would hope for.
- 7-8: responds, but loosely or only partly.
- 4-6: vague, or only barely connected to what you said.
- 0-3: does not respond — ignores or dodges your question, answers it with an unrelated question, or changes the subject.
If respondedToYou is false, relevanceScore must be ${NON_RESPONSE_RELEVANCE_CAP} or lower. A sentence can sound perfectly natural and still score low for relevance.
complexityScore is an integer from 0 to 10 for how rich and developed the user's latest message is as a sentence, independent of whether it's correct.
- 9-10: connects ideas smoothly — e.g. a reason, a contrast, a time or a detail joined with words like because, but, when, so, or two related sentences — while still sounding like a text, not an essay.
- 7-8: a full sentence with some extra detail (who, where, when, why, or a describing word).
- 4-6: one short, basic sentence.
- 0-3: a single word or a fragment.
Don't reward length for its own sake: rambling, repetitive or overlong messages should not score higher than a tight sentence that connects two ideas.
When usedTarget is true, the chat is over, so "text" should be a short, warm reply that wraps up the chat, and "summary" must be an object reviewing the user's whole performance:
{
	"overall": "2-3 short sentences on how the user did across the whole chat — how well they used the target, and how natural and relevant their replies were",
	"tips": ["Up to 3 short, concrete tips on what they could have done better, each about something they actually wrote. Use an empty list if there is truly nothing to improve."],
	"betterVersion": "A better version of the message where they used the target, still using it: fix any mistakes, make it sound natural, make it actually answer what you last said, and add a little detail if it was very short. Keep it short, simple and beginner-friendly — something they could realistically say. If that message was already perfect, repeat it unchanged.${language.betterVersion ? ` Write it ${language.betterVersion}.` : ""}"${language.summaryExtraFields}
}
When usedTarget is false, "summary" must be null. Write the summary in the same very simple, beginner-friendly English as the feedback, with no grammar jargon.
${language.feedbackRule}
Be honest and strict: 10 means flawless and exactly what a native speaker would text in this situation. Give 10 only when there is truly nothing to improve.
Do not score based on spelling alone, and do not invent a correction when the sentence is already natural.`;
}

export async function sendDailyChallengeMessage(
  courseSlug: string,
  history: ChatTurn[],
  message: string,
): Promise<SendDailyChallengeMessageResult> {
  const user = await requireSubscriber();
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return { ok: false, reason: "error", error: "Please write a message first." };
  }

  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      reason: "error",
      error: `Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`,
    };
  }

  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { userId: user.id, course: { slug: courseSlug, active: true } },
    select: { courseId: true },
  });

  if (!enrollment) {
    return { ok: false, reason: "not_enrolled" };
  }

  const today = startOfUTCDay(new Date());
  const attemptsToday = await prisma.dailyChallengeAttempt.count({
    where: {
      userId: user.id,
      courseId: enrollment.courseId,
      challengeDate: today,
    },
  });

  if (attemptsToday >= MAX_DAILY_CHALLENGE_ATTEMPTS) {
    return { ok: false, reason: "limit_reached" };
  }

  const target = await pickChallengeTarget(
    user.id,
    enrollment.courseId,
    today,
    attemptsToday,
  );

  if (!target) {
    return { ok: false, reason: "nothing_learnt" };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      reason: "error",
      error: "OpenAI is not configured. Add OPENAI_API_KEY to your environment.",
    };
  }

  const vocabInMessage = target.vocab ? containsVocab(trimmedMessage, target.vocab) : true;

  let reply: ChatReply;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(
            target,
            vocabInMessage,
            target.vocab ? vocabToneMismatch(trimmedMessage, target.vocab) : null,
          ),
        },
        ...history.slice(-MAX_HISTORY_TURNS).map((turn) => ({
          role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: String(turn.content).slice(0, MAX_MESSAGE_LENGTH * 2),
        })),
        { role: "user", content: trimmedMessage },
      ],
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      return { ok: false, reason: "error", error: "Charles Duck did not send a reply." };
    }

    const parsed: unknown = JSON.parse(content);
    if (!isChatReply(parsed)) {
      return { ok: false, reason: "error", error: "Charles Duck sent an invalid reply." };
    }

    // A word-only target is decided here outright, whatever the model said;
    // a grammar pattern needs the model's judgement (and the word too, when
    // both are set).
    const usedTarget =
      target.vocab && !target.grammar
        ? vocabInMessage
        : vocabInMessage && parsed.usedTarget;

    // The model sometimes flags a dodge in respondedToYou but still scores
    // the sentence on its own merits, so the cap is enforced here too.
    const relevanceScore =
      parsed.respondedToYou === false
        ? Math.min(Math.round(parsed.relevanceScore), NON_RESPONSE_RELEVANCE_CAP)
        : Math.round(parsed.relevanceScore);

    reply = {
      text: parsed.text,
      romanization: challengeLanguage(target.targetLanguage).hasRomanization
        ? optionalString((parsed as { romanization?: unknown }).romanization)
        : null,
      translation: parsed.translation,
      feedback: parsed.feedback,
      feedbackJa: optionalString((parsed as { feedbackJa?: unknown }).feedbackJa),
      grammarScore: Math.round(parsed.grammarScore),
      naturalnessScore: Math.round(parsed.naturalnessScore),
      relevanceScore,
      complexityScore: Math.round(parsed.complexityScore),
      usedTarget,
      summary: usedTarget ? parseSummary(parsed.summary) : null,
    };
  } catch (error) {
    console.error("OpenAI daily challenge request failed:", error);
    return {
      ok: false,
      reason: "error",
      error: "Charles Duck could not reply right now. Please try again.",
    };
  }

  if (!reply.usedTarget) {
    return { ok: true, reply, completion: null };
  }

  const xpEarned = dailyChallengeXp(reply);

  await prisma.dailyChallengeAttempt.create({
    data: {
      userId: user.id,
      courseId: enrollment.courseId,
      challengeDate: today,
      xpEarned,
      targetTerms: [target.vocab?.term, target.grammar?.term].filter(
        (term): term is string => term !== undefined,
      ),
      message: trimmedMessage,
      grammarScore: reply.grammarScore,
      naturalnessScore: reply.naturalnessScore,
      relevanceScore: reply.relevanceScore,
      complexityScore: reply.complexityScore,
      summary: reply.summary ?? undefined,
    },
  });

  await bumpStreak(user.id, enrollment.courseId, today);

  if (xpEarned > 0) {
    await prisma.$transaction([
      prisma.profile.update({
        where: { id: user.id },
        data: { xp: { increment: xpEarned } },
      }),
      prisma.xpEvent.create({
        data: { userId: user.id, amount: xpEarned },
      }),
    ]);
  }

  revalidateChallengePaths(courseSlug);

  return {
    ok: true,
    reply,
    completion: { xpEarned, attemptsToday: attemptsToday + 1 },
  };
}

// "layout" scope too: the header's XP/level badge lives in the shared
// dashboard layout, not just the pages under this exact path.
function revalidateChallengePaths(courseSlug: string) {
  revalidatePath(`/dashboard/courses/${courseSlug}`);
  revalidatePath(`/dashboard/courses/${courseSlug}/daily-challenge`);
  revalidatePath("/dashboard", "layout");
}

// Dev-mode tool (admin only): deletes the caller's attempts for today in
// this course so the daily cap stops getting in the way while testing, and
// takes back the XP they earned — with a negative xp_events row, so weekly
// totals stay in step with `profiles.xp`. Re-guarded here, not just hidden
// in the UI, since server actions are callable directly.
export async function resetDailyChallengeToday(
  courseSlug: string,
): Promise<{ ok: boolean }> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { ok: false };

  const course = await prisma.course.findFirst({
    where: { slug: courseSlug },
    select: { id: true },
  });
  if (!course) return { ok: false };

  const where = {
    userId: profile.id,
    courseId: course.id,
    challengeDate: startOfUTCDay(new Date()),
  };
  try {
    const { _sum } = await prisma.dailyChallengeAttempt.aggregate({
      where,
      _sum: { xpEarned: true },
    });
    const xpToRemove = Math.min(_sum.xpEarned ?? 0, profile.xp);

    await prisma.$transaction([
      prisma.dailyChallengeAttempt.deleteMany({ where }),
      ...(xpToRemove > 0
        ? [
            prisma.profile.update({
              where: { id: profile.id },
              data: { xp: { decrement: xpToRemove } },
            }),
            prisma.xpEvent.create({
              data: { userId: profile.id, amount: -xpToRemove },
            }),
          ]
        : []),
    ]);
  } catch (error) {
    console.error("Daily challenge reset failed:", error);
    return { ok: false };
  }

  revalidateChallengePaths(courseSlug);
  return { ok: true };
}
