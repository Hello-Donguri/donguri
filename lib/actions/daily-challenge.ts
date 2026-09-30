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
  CANTONESE_QUOTE_RULE,
  JAPANESE_FEEDBACK_RULE,
  challengeLanguage,
  friendsPromptRule,
  glossesPromptField,
  glossesPromptRule,
  parseGlosses,
  pickChallengeTarget,
  type ChallengeItem,
  type ChallengeTarget,
  type WordGloss,
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
  // Word-by-word meanings of `text`, for hovering; null if the model left
  // them out.
  glosses: WordGloss[] | null;
  grammarScore: number;
  naturalnessScore: number;
  relevanceScore: number;
  complexityScore: number;
  feedback: string;
  // Japanese version of `feedback`; null if the model left it out.
  feedbackJa: string | null;
  usedTarget: boolean;
  // False when the latest message didn't answer what Charles asked. A final
  // message like that earns only the base XP (see dailyChallengeXp).
  respondedToYou: boolean;
  // Word + grammar chats only (null otherwise): which targets have been used
  // so far, for ticking them off one by one, and the message the grammar
  // was found in — sent back with the next message, since only the model
  // can judge grammar and the chat is otherwise stateless.
  targets: { vocab: boolean; grammar: boolean; grammarMessage: string | null } | null;
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
// said (e.g. dodging his question with one of its own) — the model tends to
// score the sentence on its own merits otherwise. A dodge that finishes the
// challenge also earns only the base XP (respondedToYou in dailyChallengeXp),
// since the XP bands start low enough that the cap alone wouldn't stop it.
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
): value is Omit<ChatReply, "summary" | "targets" | "respondedToYou"> & {
  summary?: unknown;
  respondedToYou?: boolean;
  usedGrammar?: boolean;
} {
  if (!value || typeof value !== "object") return false;

  const reply = value as Record<string, unknown>;

  return (
    typeof reply.text === "string" &&
    typeof reply.translation === "string" &&
    typeof reply.feedback === "string" &&
    typeof reply.usedTarget === "boolean" &&
    (reply.respondedToYou === undefined || typeof reply.respondedToYou === "boolean") &&
    (reply.usedGrammar === undefined || typeof reply.usedGrammar === "boolean") &&
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

// Whether feedback meant to be English came back mostly in Chinese — the
// Cantonese chat sometimes drags the model's feedback into Cantonese too.
// Quoted Cantonese is fine; it's the balance that matters.
function mostlyChinese(texts: string[]): boolean {
  const joined = texts.join(" ");
  const han = joined.match(/\p{Script=Han}/gu)?.length ?? 0;
  const latin = joined.match(/[a-z]/gi)?.length ?? 0;
  return han > 0 && han * 2 > latin;
}

function feedbackTexts(parsed: { feedback: string; summary?: unknown }): string[] {
  const summary = parseSummary(parsed.summary);
  return [parsed.feedback, ...(summary ? [summary.overall, ...summary.tips] : [])];
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
    return `the word ${describeItem(target.vocab)} and the grammar pattern ${describeItem(target.grammar)} — in the same message or in two different messages, whichever comes naturally`;
  }
  if (target.grammar) return `the grammar pattern ${describeItem(target.grammar)}`;
  return `the word ${describeItem(target.vocab!)}`;
}

// Where a two-target (word + grammar) chat stands before this turn — worked
// out by the server each time, since the chat itself is stateless (the
// client sends the history). Null fields mean "not used yet".
type TargetState = {
  // The word is string-matched, so this is whether the latest message has
  // it, plus the first earlier message that did.
  vocabInLatest: boolean;
  vocabEarlier: string | null;
  // Grammar needs the model's judgement, so the earlier message it was
  // found in is echoed back by the client and checked against the history
  // (see sendDailyChallengeMessage).
  grammarEarlier: string | null;
};

const ATTEMPT_RULE =
  "Any attempt counts — even if it's wrong, awkward, unrelated to the conversation, or the target on its own with nothing else. Mistakes lower the scores; they never stop the challenge from ending.";

// What the model is told about whether the latest message used the target.
// The vocab word is checked here, not by the model, so any message that
// contains it counts — even a bare "you" or a broken sentence; low quality
// shows up in the scores instead. Grammar patterns can't be string-matched,
// so an attempt at one is left to the model.
function describeTargetUsage(target: ChallengeTarget, state: TargetState): string {
  if (target.vocab && target.grammar) return describeCombinedUsage(target.grammar, state);

  if (target.vocab && !state.vocabInLatest) {
    return `The user's latest message does NOT contain the target word, so usedTarget must be false.`;
  }
  if (target.vocab) {
    return `The user's latest message DOES contain the target word, so usedTarget must be true and the chat ends now. ${ATTEMPT_RULE}`;
  }
  return `usedTarget is true if the user's latest message attempts the grammar pattern ${describeItem(target.grammar!)}. ${ATTEMPT_RULE} Judge the latest message only, not earlier ones.`;
}

// A word + grammar chat: the two can land in different messages, and the
// chat ends once both have been used. The model reports grammar in the
// latest message as usedGrammar; usedTarget is "both are now used".
function describeCombinedUsage(grammar: ChallengeItem, state: TargetState): string {
  const vocabDone = state.vocabEarlier !== null || state.vocabInLatest;
  const word = state.vocabEarlier
    ? `The user already used the target word in an earlier message ("${state.vocabEarlier}").`
    : state.vocabInLatest
      ? "The user's latest message DOES contain the target word."
      : "The user has NOT used the target word yet.";

  if (state.grammarEarlier) {
    return `${word} The user already attempted the grammar pattern in an earlier message ("${state.grammarEarlier}"), so usedGrammar must be false. The chat ends once both are used, so usedTarget must be ${vocabDone}.${vocabDone ? "" : " Steer toward the word they still need."}`;
  }

  return `${word} usedGrammar is true if the user's latest message attempts the grammar pattern ${describeItem(grammar)} — judge the latest message only. ${ATTEMPT_RULE} The chat ends once both the word and the pattern have been used, in any messages: ${
    vocabDone
      ? "the word is already done, so usedTarget must equal usedGrammar."
      : "the word hasn't been used yet, so usedTarget must be false even if usedGrammar is true."
  } Until then, steer toward whichever of the two they still need.`;
}

// The earlier messages that used a target and so get scored alongside the
// latest one if this turn finishes a word + grammar chat. Empty otherwise.
// An earlier word is left out when the latest message has the word too.
function earlierScoredMessages(state: TargetState): string[] {
  const vocab = state.vocabInLatest ? null : state.vocabEarlier;
  return [...new Set([vocab, state.grammarEarlier])].filter(
    (text): text is string => text !== null,
  );
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
- The user may write in Chinese characters, in Jyutping (with or without tone numbers), or a mix — all are equally fine. Read their Jyutping as the Cantonese it spells. Never mark them down for writing Jyutping instead of characters, or for missing tone numbers or spacing. A WRONG tone number is different — see the scoring rules below.
- If the user writes in English instead of Cantonese, gently keep chatting in Cantonese; an English reply scores low on grammar and naturalness.`,
      replyFields: `	"text": "Charles Duck's simple, casual chat reply, in Cantonese characters",
	"romanization": "The same reply in Jyutping with tone numbers — exactly one syllable per Chinese character, keeping the punctuation",
	"translation": "A natural English translation of the same reply",`,
      feedbackLanguage: `Write it in ENGLISH — the user is an English speaker and can't yet read Cantonese explanations. Only your chat reply ("text") is in Cantonese; "feedback" and everything in "summary" must be English. Use very simple, beginner-friendly English — short words, short sentences, no grammar jargon. ${CANTONESE_QUOTE_RULE} When you correct a word, name the right form, what it means, and what they wrote instead, e.g. "Use 飲 (jam2, "drink"), not yum2." When you suggest adding something, say what the addition means, e.g. "You could add 鍾意 (zung1 ji3, "like") to say you like it."`,
      feedbackJaField: "",
      texting:
        "This is casual texting, so ignore punctuation, and never count writing Jyutping instead of characters — or missing tone numbers — as a mistake. A wrong tone number in their Jyutping is a small mistake: take at most 1 point off grammarScore for it, never fail the target over it, and point out the correct tone in your feedback.",
      betterVersion: "in Cantonese characters",
      betterVersionExtraFields: `
	"betterVersionRomanization": "The betterVersion in Jyutping with tone numbers, one syllable per character",`,
      summaryExtraFields: "",
      readingTheirMessage:
        " They may have written in Jyutping: read it syllable by syllable as the Cantonese it spells, so e.g. 'hai2 uk1 kei5' IS 喺屋企 — they already used it.",
      feedbackRule:
        `Write "overall" and every tip in ENGLISH, never Cantonese — only "betterVersion" is Cantonese. ${CANTONESE_QUOTE_RULE}`,
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
    betterVersionExtraFields: "",
    readingTheirMessage: "",
    summaryExtraFields: `,
	"overallJa": "The same overall review in Japanese",
	"tipsJa": ["The same tips in Japanese, one for each tip above, in the same order"]`,
    feedbackRule: JAPANESE_FEEDBACK_RULE,
  };
}

function buildSystemPrompt(
  target: ChallengeTarget,
  state: TargetState,
  toneMismatch: { wrote: string; correct: string } | null,
): string {
  const goal = describeTarget(target);
  const language = promptLanguage(target);
  const combined = Boolean(target.vocab && target.grammar);
  const toneNote = toneMismatch
    ? `\nThe user wrote the target word in Jyutping as "${toneMismatch.wrote}", but its correct tones are "${toneMismatch.correct}". That still counts as using the word. Make the tone correction your "feedback" tip (e.g. "Nice! Just check the tones: it's ${toneMismatch.correct}, not ${toneMismatch.wrote}."), and if the chat ends now, include it in the summary tips too.`
    : "";
  // A word + grammar chat finished across two messages is scored on both,
  // averaged, so splitting them up neither helps nor hurts the result.
  const earlier = earlierScoredMessages(state);
  const combinedScoring =
    earlier.length > 0
      ? `\nIf usedTarget is true, the chat is scored on every message where the user used a target: their latest message and ${earlier.map((text) => `"${text}"`).join(" and ")}. Give each of the four scores as the average of what each of those messages deserves on its own (judge an earlier message's relevance against what you had said just before it), rounded to a whole number. If usedTarget is false, score the latest message only.`
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
${friendsPromptRule(target) ? `${friendsPromptRule(target)} If you already mentioned one of them earlier in this chat, keep talking about the same friend.\n` : ""}- Never break character or mention that this is a language exercise, scoring, or practice.

Return only a JSON object with exactly these fields, in this order:
{
	"assessment": "Private notes for scoring, never shown to the user, 1-2 short sentences: what did you last say or ask, what would a real answer tell you (e.g. which one they like, where they went), and does the user's latest message actually tell you that?",
	"respondedToYou": true,
${language.replyFields}
	${glossesPromptField(target.targetLanguage)},
	"grammarScore": 0,
	"naturalnessScore": 0,
	"relevanceScore": 0,
	"complexityScore": 0,
${combined ? '	"usedGrammar": false,\n' : ""}	"usedTarget": false,
	"summary": null,
	"feedback": "One short, encouraging sentence with ONE concrete tip — a single point, never two joined with 'and' — on how the user's latest message could be more natural, correct, or relevant to the conversation — or, if it's already good, richer (e.g. add a reason or a detail) — or a short specific compliment if it's already excellent. If respondedToYou is false, the tip must be about that (e.g. answer my question first, then ask yours). Check the tip against the exact words they wrote first: never tell them to add something they already wrote (if it's in the wrong place, tell them to move it), and never 'correct' something they got right.${language.readingTheirMessage}"${language.feedbackJaField}
}
The feedback: ${language.feedbackLanguage}
${glossesPromptRule(target.targetLanguage)}
respondedToYou is true only if the user's latest message actually responds to what you last said. If you asked a question, it must answer it — even briefly or loosely ("Just some toast!", "I'm not sure"). Answering means giving the information you asked for, not just reusing words from your question: if you asked "Do you like coffee or tea?", "Coffee!" or "I like tea, not coffee" answers it, but "Coffee isn't tea" does not — it's true, but it doesn't say which one they like. Judge what the message means, not which words it shares with your question. It is false if the user ignores your question, changes the subject, or replies with a question of their own without answering yours. Asking a question back AFTER answering is great ("Pizza! What about you?") and counts as true.
${describeTargetUsage(target, state)}${toneNote}${combinedScoring}
grammarScore is an integer from 0 to 10 for the grammatical correctness of the user's latest message, judged on its own, not on relevance. ${language.texting} When usedTarget is true, also judge whether the target is used correctly.
naturalnessScore is an integer from 0 to 10 for how natural the WORDING of the user's latest message is — would a native speaker text it this way? Judge the wording only; whether it fits the conversation is relevanceScore.
Judge the message as a whole, not sentence by sentence. When it has more than one sentence, each must follow on from the one before, the way a real person's text does. Sentences that are each fine on their own but don't make sense together — e.g. "I like eating chicken. I have chicken." — make an awkward message: naturalnessScore 6 or lower, and say so in your feedback. The same goes for relevanceScore: judge what the whole message says, not whether one of its sentences answers you.
- 9-10: exactly how a native speaker would text it. 10 only if there is nothing to change.
- 7-8: clear, but a little stiff, textbook-like, or an unusual word choice.
- 4-6: understandable but awkward — a native speaker would not say it like this, or the target is forced in where it doesn't fit.
- 0-3: hard to understand.
relevanceScore is an integer from 0 to 10 for how well the user's latest message responds to what you just said.
- 9-10: responds directly and fully to what you said, giving what you asked for. 10 only if it's exactly the kind of reply a friend would hope for.
- 7-8: responds, but loosely or only partly.
- 4-6: vague, or only barely connected to what you said.
- 0-3: does not respond — ignores or dodges your question, answers it with an unrelated question, or changes the subject.
If respondedToYou is false, relevanceScore must be ${NON_RESPONSE_RELEVANCE_CAP} or lower. A sentence can sound perfectly natural and still score low for relevance. Using the target does not make a reply relevant: if the target is forced in so the message no longer answers what you asked, score relevance on what it actually says, not on the target being there.
complexityScore is an integer from 0 to 10 for how rich and developed the user's latest message is as a sentence, independent of whether it's correct.
- 9-10: connects ideas smoothly — e.g. a reason, a contrast, a time or a detail joined with words like because, but, when, so, or two related sentences — while still sounding like a text, not an essay.
- 7-8: a full sentence with some extra detail (who, where, when, why, or a describing word).
- 4-6: one short, basic sentence.
- 0-3: a single word or a fragment.
Don't reward length for its own sake: rambling, repetitive or overlong messages should not score higher than a tight sentence that connects two ideas. Two sentences that don't connect are two basic sentences (4-6), not connected ideas.
When usedTarget is true, the chat is over, so "text" should be a short, warm reply that wraps up the chat, and "summary" must be an object reviewing the user's whole performance:
{
	"betterVersion": "The most natural way to say what they said in their latest message, still using the target${combined ? "s it contains" : ""}: fix any mistakes, word choice and word order, the way a native speaker would text the same thing. Keep their meaning and their content — do NOT add new ideas, details or extra words unless the sentence needs them to be correct. But if their sentences don't make sense together, don't just correct each one: write the simplest natural way to say what they seem to mean, as one message that makes sense — e.g. join the ideas with a small linking word (so, because, and, but) or leave out the part that doesn't fit. If that message was already natural and correct, repeat it unchanged.${language.betterVersion ? ` Write it ${language.betterVersion}.` : ""}",${language.betterVersionExtraFields}
	"tips": ["Up to 3 short tips, each explaining one real difference between what they wrote and your betterVersion (a wrong word, a wrong tone, words in the wrong order, a missing word), or one other real mistake they made. Before writing each tip, compare it with the exact words they wrote.${language.readingTheirMessage} Never tell them to add something they already wrote — if it's there but in the wrong place, tell them to move it and where to. Never 'correct' something they already got right. They are shown in one list straight after your feedback, so never repeat or reword the feedback's point, and make each tip a different point. If your betterVersion changes how their sentences connect, one tip must explain that simply (e.g. "Your two sentences don't connect yet — try joining them with a word for "so".", naming the actual word). If it fixes a wrong tone, one tip must name the right tone. Use an empty list if there is nothing left to improve."],
	"overall": "2-3 short sentences on how the user did across the whole chat — how well they used the target, and how natural and relevant their replies were. A verdict, not advice: don't repeat any correction or suggestion from feedback or tips"${language.summaryExtraFields}
}
When usedTarget is false, "summary" must be null. Write the summary in the same very simple, beginner-friendly English as the feedback, with no grammar jargon.
${language.feedbackRule}
Be honest and strict: 10 means flawless and exactly what a native speaker would text in this situation. Give 10 only when there is truly nothing to improve.
Do not score based on spelling alone, and do not invent a correction when the sentence is already natural.`;
}

type TipCheck = { verdict: "keep" | "fix" | "drop"; text?: unknown; textJa?: unknown };

// A second look at the final review's tips — the per-message feedback plus
// the summary's — before the learner sees them. The chat model sometimes
// gets what they wrote wrong (e.g. "add 喺屋企" when they'd written it in
// Jyutping, just in the wrong place), so a proofreading pass compares each
// tip with their exact words and keeps, rewrites or drops it. Any failure
// leaves the tips as they were.
async function checkTips(
  openai: OpenAI,
  target: ChallengeTarget,
  message: string,
  reply: ChatReply,
): Promise<ChatReply> {
  const summary = reply.summary;
  if (!summary) return reply;

  const isCantonese = target.targetLanguage === "yue";
  const hasJa = !isCantonese;
  const tips = [reply.feedback, ...summary.tips];
  const tipsJa = [reply.feedbackJa, ...(summary.tipsJa.length ? summary.tipsJa : summary.tips.map(() => null))];
  const betterVersion = summary.betterVersionRomanization
    ? `${summary.betterVersion} (Jyutping: ${summary.betterVersionRomanization})`
    : summary.betterVersion;

  const prompt = `You are proofreading tips about a language learner's message before the learner sees them. Be careful and strict.

The learner wrote: "${message}"
${isCantonese ? "They may have written Cantonese in Jyutping, with or without tone numbers: read it syllable by syllable as the Cantonese it spells — e.g. 'hai2 uk1 kei5' is 喺屋企, so they DID write 喺屋企.\n" : ""}A more natural version of it: "${betterVersion}"

The tips, numbered:
${tips.map((tip, index) => `${index}. ${tip}`).join("\n")}

Check each tip against exactly what the learner wrote, word by word:
- "drop" a tip that is wrong: it tells them to add something they already wrote, "corrects" something they got right, describes a mistake they didn't make, or makes the same point as an earlier tip.
- A tip about how their sentences fit together (e.g. they don't connect, or need a linking word) is about the message as a whole, not one word — keep it unless the sentences really do connect.
- "fix" a tip that points at a real problem but describes it wrongly — e.g. it says to add a word that is already there but in the wrong place: rewrite it to say to move that word, and where to.
- "keep" every other tip exactly as it is.

Return only a JSON object: {"checks": [{"verdict": "keep" | "fix" | "drop", "text": "the rewritten tip, only when verdict is fix"${hasJa ? ', "textJa": "the rewritten tip in Japanese, only when verdict is fix"' : ""}}]} with exactly one entry per tip, in the same order.
${isCantonese ? `Write any rewritten tip in very simple English. ${CANTONESE_QUOTE_RULE}` : `Write any rewritten tip in very simple English. ${JAPANESE_FEEDBACK_RULE}`}`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: prompt }],
    });
    const content = response.choices[0]?.message.content;
    const checks = content ? (JSON.parse(content) as { checks?: unknown }).checks : null;
    if (
      !Array.isArray(checks) ||
      checks.length !== tips.length ||
      !checks.every(
        (check: TipCheck) =>
          check &&
          ["keep", "fix", "drop"].includes(check.verdict) &&
          (check.verdict !== "fix" || optionalString(check.text) !== null),
      )
    ) {
      return reply;
    }

    const checked = (checks as TipCheck[]).flatMap((check, index) => {
      if (check.verdict === "drop") return [];
      if (check.verdict === "keep") return [{ en: tips[index], ja: tipsJa[index] }];
      return [{ en: optionalString(check.text)!, ja: hasJa ? optionalString(check.textJa) : null }];
    });

    // The per-message feedback stays first when it survives; the rest are
    // the summary's tips. Japanese is kept only while every tip has one, so
    // it's never shown against the wrong tip.
    const feedbackKept = checks[0].verdict !== "drop";
    const [feedback, ...rest] = feedbackKept ? checked : [{ en: "", ja: null }, ...checked];
    const restJa = rest.map((tip) => tip.ja);

    return {
      ...reply,
      feedback: feedback.en,
      feedbackJa: feedback.ja,
      summary: {
        ...summary,
        tips: rest.map((tip) => tip.en),
        tipsJa: restJa.every((ja): ja is string => ja !== null) ? restJa : [],
      },
    };
  } catch (error) {
    console.error("Daily challenge tip check failed:", error);
    return reply;
  }
}

// `grammarMessage` is the previous reply's `targets.grammarMessage` (word +
// grammar chats only): the earlier message the grammar pattern was found
// in. It only counts if it really is one of the learner's messages in
// `history`.
export async function sendDailyChallengeMessage(
  courseSlug: string,
  history: ChatTurn[],
  message: string,
  grammarMessage: string | null = null,
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

  // A word + grammar chat can use the two in different messages, so where
  // each already stands comes from the earlier turns (see TargetState).
  const combined = Boolean(target.vocab && target.grammar);
  const earlierUserMessages = history
    .filter((turn) => turn.role === "user")
    .map((turn) => String(turn.content).trim());
  const state: TargetState = {
    vocabInLatest: vocabInMessage,
    vocabEarlier: combined
      ? (earlierUserMessages.find((text) => containsVocab(text, target.vocab!)) ?? null)
      : null,
    grammarEarlier:
      combined && grammarMessage && earlierUserMessages.includes(grammarMessage.trim())
        ? grammarMessage.trim()
        : null,
  };

  let reply: ChatReply;
  // Every message the final scores cover — just the latest, unless a word +
  // grammar chat was finished across two. Stored with the attempt.
  let scoredMessages = [trimmedMessage];
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const messages = [
      {
        role: "system" as const,
        content: buildSystemPrompt(
          target,
          state,
          target.vocab ? vocabToneMismatch(trimmedMessage, target.vocab) : null,
        ),
      },
      ...history.slice(-MAX_HISTORY_TURNS).map((turn) => ({
        role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(turn.content).slice(0, MAX_MESSAGE_LENGTH * 2),
      })),
      { role: "user" as const, content: trimmedMessage },
    ];
    const ask = async (extra: { role: "system" | "assistant"; content: string }[] = []) => {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
        response_format: { type: "json_object" },
        messages: [...messages, ...extra],
      });
      const content = response.choices[0]?.message.content;
      return content ? (JSON.parse(content) as unknown) : null;
    };

    let parsed = await ask();
    if (parsed === null) {
      return { ok: false, reason: "error", error: "Charles Duck did not send a reply." };
    }

    // The Cantonese chat's feedback must be English (the learner can't read
    // Cantonese explanations yet); if it slipped into Cantonese, ask again
    // once, saying so. Keep the first answer if the retry fails.
    if (
      target.targetLanguage === "yue" &&
      isChatReply(parsed) &&
      mostlyChinese(feedbackTexts(parsed))
    ) {
      const retried = await ask([
        { role: "assistant", content: JSON.stringify(parsed) },
        {
          role: "system",
          content:
            `Your "feedback", "overall" and "tips" were written in Cantonese. Rewrite the whole JSON object with those in simple ENGLISH. ${CANTONESE_QUOTE_RULE} Keep "text", "romanization", "betterVersion" and the scores as they were.`,
        },
      ]).catch(() => null);
      if (isChatReply(retried)) parsed = retried;
    }

    if (!isChatReply(parsed)) {
      return { ok: false, reason: "error", error: "Charles Duck sent an invalid reply." };
    }

    // A word-only target is decided here outright, whatever the model said;
    // a grammar pattern needs the model's judgement. A word + grammar chat
    // ends once both have been used, in any messages: the word by string
    // match, the grammar by the model (usedGrammar, falling back to
    // usedTarget if it left that out).
    const grammarInLatest =
      combined && !state.grammarEarlier && (parsed.usedGrammar ?? parsed.usedTarget);
    const vocabDone = state.vocabEarlier !== null || vocabInMessage;
    const grammarDone = state.grammarEarlier !== null || grammarInLatest;
    const usedTarget = combined
      ? vocabDone && grammarDone
      : target.vocab
        ? vocabInMessage
        : parsed.usedTarget;

    if (combined && usedTarget) {
      scoredMessages = [...earlierScoredMessages(state), trimmedMessage];
    }

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
      glosses: parseGlosses(
        (parsed as { words?: unknown }).words,
        challengeLanguage(target.targetLanguage).hasRomanization,
      ),
      feedback: parsed.feedback,
      feedbackJa: optionalString((parsed as { feedbackJa?: unknown }).feedbackJa),
      grammarScore: Math.round(parsed.grammarScore),
      naturalnessScore: Math.round(parsed.naturalnessScore),
      relevanceScore,
      complexityScore: Math.round(parsed.complexityScore),
      usedTarget,
      respondedToYou: parsed.respondedToYou !== false,
      targets: combined
        ? {
            vocab: vocabDone,
            grammar: grammarDone,
            grammarMessage: state.grammarEarlier ?? (grammarInLatest ? trimmedMessage : null),
          }
        : null,
      summary: usedTarget ? parseSummary(parsed.summary) : null,
    };

    if (reply.summary) {
      reply = await checkTips(openai, target, scoredMessages.join("\n"), reply);
    }
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

  const xpEarned = dailyChallengeXp(reply, reply.respondedToYou);

  await prisma.dailyChallengeAttempt.create({
    data: {
      userId: user.id,
      courseId: enrollment.courseId,
      challengeDate: today,
      xpEarned,
      targetTerms: [target.vocab?.term, target.grammar?.term].filter(
        (term): term is string => term !== undefined,
      ),
      message: scoredMessages.join("\n"),
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

// "Too hard? Skip it": uses up the learner's current attempt without
// playing it, so the page moves on to the day's next challenge (or the
// end-of-day summary after the last). Saved as a skipped attempt — no XP,
// no scores — with its target, so pickChallengeTarget doesn't hand the same
// one back today; skipped attempts don't count as doing a challenge (see
// section 42 of supabase/schema.sql). The target is re-derived here, never
// taken from the client.
export async function skipDailyChallenge(courseSlug: string): Promise<{ ok: boolean }> {
  const user = await requireSubscriber();

  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { userId: user.id, course: { slug: courseSlug, active: true } },
    select: { courseId: true },
  });
  if (!enrollment) return { ok: false };

  const today = startOfUTCDay(new Date());
  const attemptsToday = await prisma.dailyChallengeAttempt.count({
    where: { userId: user.id, courseId: enrollment.courseId, challengeDate: today },
  });
  if (attemptsToday >= MAX_DAILY_CHALLENGE_ATTEMPTS) return { ok: false };

  const target = await pickChallengeTarget(user.id, enrollment.courseId, today, attemptsToday);
  if (!target) return { ok: false };

  await prisma.dailyChallengeAttempt.create({
    data: {
      userId: user.id,
      courseId: enrollment.courseId,
      challengeDate: today,
      skipped: true,
      xpEarned: 0,
      targetTerms: [target.vocab?.term, target.grammar?.term].filter(
        (term): term is string => term !== undefined,
      ),
    },
  });

  revalidateChallengePaths(courseSlug);
  return { ok: true };
}

// Admin tool (the Admin menu's "Reset daily challenges", and dev mode's
// automatic reset): deletes the caller's attempts for today — in one
// course, or every course when `courseSlug` is null — so the daily cap
// stops getting in the way while testing, and takes back the XP they
// earned, with a negative xp_events row so weekly totals stay in step with
// `profiles.xp`. Re-guarded here, not just hidden in the UI, since server
// actions are callable directly.
export async function resetDailyChallengeToday(
  courseSlug: string | null,
): Promise<{ ok: boolean }> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { ok: false };

  let courseId: string | undefined;
  if (courseSlug) {
    const course = await prisma.course.findFirst({
      where: { slug: courseSlug },
      select: { id: true },
    });
    if (!course) return { ok: false };
    courseId = course.id;
  }

  const where = {
    userId: profile.id,
    ...(courseId ? { courseId } : {}),
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

  if (courseSlug) revalidateChallengePaths(courseSlug);
  else revalidatePath("/dashboard", "layout");
  return { ok: true };
}
