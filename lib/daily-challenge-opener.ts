import "server-only";
import OpenAI from "openai";
import { cacheLife } from "next/cache";
import {
  challengeLanguage,
  glossesPromptField,
  glossesPromptRule,
  parseGlosses,
  type ChallengeItem,
  type ChallengeOpener,
  type ChallengeTarget,
} from "@/lib/daily-challenge";

const MAX_OPENER_LENGTH = 200;
const OPENER_TIMEOUT_MS = 8000;

function describeItem(kind: string, item: ChallengeItem): string {
  const romanization = item.romanization ? ` [${item.romanization}]` : "";
  const explanation = item.explanation ? ` — ${item.explanation}` : "";
  return `${kind}: "${item.term}"${romanization} (${item.translation}${explanation})`;
}

// Just the first word of the profile's full name; null when there isn't
// one, so Charles never greets anyone by an email handle.
export function firstNameOf(fullName: string | null | undefined): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}

// Works the learner's name into a fixed opener's greeting: "Hi! How was
// your day?" → "Hi Will! How was your day?", "やあ！…" → "やあ、Will！…",
// "你好！…" → "你好，Will！…". Left as it is when it doesn't open with a
// greeting.
function personalise(opener: ChallengeOpener, firstName: string | null): ChallengeOpener {
  if (!firstName) return opener;

  const english = (text: string) => text.replace(/^(Hi|Hey|Hello)([!,])/, `$1 ${firstName}$2`);
  const cjk = (text: string, comma: string) =>
    text.replace(/^([^！!、，。]{1,6})([！!])/, `$1${comma}${firstName}$2`);

  return opener.romanization
    ? {
        text: cjk(opener.text, "，"),
        romanization: opener.romanization.replace(/^([^!,?.]+)!/, `$1, ${firstName}!`),
        translation: english(opener.translation),
        glosses: opener.glosses,
      }
    : {
        text: english(opener.text),
        romanization: null,
        translation: cjk(opener.translation, "、"),
        glosses: opener.glosses,
      };
}

function buildOpenerPrompt(target: ChallengeTarget, firstName: string | null): string {
  const language = challengeLanguage(target.targetLanguage);
  const targets = [
    target.vocab && describeItem("Word", target.vocab),
    target.grammar && describeItem("Grammar pattern", target.grammar),
  ]
    .filter(Boolean)
    .join("\n");

  const cantonese = target.targetLanguage === "yue";
  const style = cantonese
    ? `- Write in natural, colloquial Hong Kong Cantonese as people really text it, in traditional characters (係, 唔, 嘅, 咗, 喺, 佢, 乜嘢 — not Mandarin forms like 是, 不, 的, 了, 在, 他, 什麼).
- Only very common, everyday words a total beginner knows. No slang, no idioms, no hard grammar.`
    : `- Only very common, everyday words a total beginner knows. No idioms, no slang, no phrasal verbs like "been up to", no hard grammar.`;
  const fields = cantonese
    ? `{
	"text": "Charles Duck's opening message, in Cantonese characters",
	"romanization": "The same message in Jyutping with tone numbers — exactly one syllable per Chinese character, keeping the punctuation",
	"translation": "A natural, casual English translation of the same message",
	${glossesPromptField(target.targetLanguage)}
}`
    : `{
	"text": "Charles Duck's opening message",
	"translation": "A natural, casual Japanese translation of the same message",
	${glossesPromptField(target.targetLanguage)}
}`;

  return `You write the very first text message that Charles Duck, a friendly ${language.target}-speaking duck, sends to start a casual chat with ${language.learner} who is a beginner learning ${language.target}.

Later in the chat, the learner will try to use this naturally:
${targets}

How to write the opener:
- A casual greeting plus ONE simple question. At most 2 short sentences and about 15 words.
${firstName ? `- Greet them by their first name, "${firstName}", in the greeting. Use it once only, and keep it exactly as written in the translation too.\n` : ""}${style}
- It must sound natural — exactly how a friend would really text.
- Pick an everyday topic that is loosely related to the target, so the chat can drift towards it later. Only loosely: never use the target word or pattern yourself, and don't ask a question whose obvious answer is just the target.
- If the target doesn't point to a clear everyday topic (for example a small function word, or an abstract grammar pattern), don't force it. Instead use the topic of this general opener, reworded in your own way: "${target.fallbackOpener.text}" (${target.fallbackOpener.translation})

Return only a JSON object:
${fields}
${glossesPromptRule(target.targetLanguage)}`;
}

// Cached per target (the fallback opener in it is seeded per user, day and
// attempt — see pickChallengeTarget), so reloading the page doesn't pay for
// a fresh generation or show a different opener. Throws on any failure
// rather than returning the fallback, so a failed call is never cached.
async function generateOpener(
  target: ChallengeTarget,
  firstName: string | null,
): Promise<ChallengeOpener> {
  "use cache";
  cacheLife("days");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create(
    {
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: buildOpenerPrompt(target, firstName) }],
    },
    { signal: AbortSignal.timeout(OPENER_TIMEOUT_MS), maxRetries: 0 },
  );

  const parsed: unknown = JSON.parse(response.choices[0]?.message.content ?? "");
  const opener = parsed as Partial<Record<keyof ChallengeOpener, unknown>> | null;
  const needsRomanization = challengeLanguage(target.targetLanguage).hasRomanization;
  if (
    typeof opener?.text !== "string" ||
    typeof opener.translation !== "string" ||
    !opener.text.trim() ||
    opener.text.length > MAX_OPENER_LENGTH ||
    (needsRomanization && typeof opener.romanization !== "string")
  ) {
    throw new Error("Invalid opener from model");
  }

  return {
    text: opener.text.trim(),
    romanization: needsRomanization ? (opener.romanization as string).trim() : null,
    translation: opener.translation.trim(),
    glosses: parseGlosses(
      (parsed as { words?: unknown } | null)?.words,
      needsRomanization,
    ),
  };
}

// Charles Duck's first message for an attempt, greeting the learner by
// first name when there is one: generated to loosely suit
// the target, falling back to the fixed opener pickChallengeTarget chose
// when OpenAI isn't configured or the call fails. Never rejects — the page
// streams this promise to the chat, which waits on it.
export async function getChallengeOpener(
  target: ChallengeTarget,
  firstName: string | null,
): Promise<ChallengeOpener> {
  if (!process.env.OPENAI_API_KEY) return personalise(target.fallbackOpener, firstName);

  try {
    return await generateOpener(target, firstName);
  } catch (error) {
    console.error("Daily challenge opener generation failed:", error);
    return personalise(target.fallbackOpener, firstName);
  }
}
