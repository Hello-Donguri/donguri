import "server-only";
import OpenAI from "openai";
import { cacheLife } from "next/cache";
import {
  jyutpingDictionary,
  standardiseGlosses,
  standardiseJyutping,
} from "@/lib/jyutping-standard";
import {
  challengeLanguage,
  friendsPromptRule,
  knownWordsPromptRule,
  NATURAL_CHAT_RULE,
  levelProfile,
  glossesPromptField,
  glossesPromptRule,
  parseGlosses,
  type ChallengeItem,
  type ChallengeOpener,
  type ChallengeTarget,
} from "@/lib/daily-challenge";

const MAX_OPENER_LENGTH = 200;
// The chat shows Charles typing while the opener is written, so there's
// time to wait — but not forever. Generation was taking 15–20s at default
// reasoning effort (past an earlier 8s limit, so learners only ever saw the
// fixed fallback openers); at "low" it's well inside this.
const OPENER_TIMEOUT_MS = 25_000;

function describeItem(kind: string, item: ChallengeItem): string {
  const romanization = item.romanization ? ` [${item.romanization}]` : "";
  const explanation = item.explanation ? ` — ${item.explanation}` : "";
  return `${kind}: "${item.term}"${romanization} (${item.translation}${explanation})`;
}

// Just the first word of the profile's full name; null when there isn't
// one, so Charles never greets anyone by an email handle.
export function firstNameOf(
  fullName: string | null | undefined,
): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}

// Works the learner's name into a fixed opener's greeting: "Hi! How was
// your day?" → "Hi Will! How was your day?", "やあ！…" → "やあ、Will！…",
// "你好！…" → "你好，Will！…". Left as it is when it doesn't open with a
// greeting.
function personalise(
  opener: ChallengeOpener,
  firstName: string | null,
): ChallengeOpener {
  if (!firstName) return opener;

  const english = (text: string) =>
    text.replace(/^(Hi|Hey|Hello)([!,])/, `$1 ${firstName}$2`);
  const cjk = (text: string, comma: string) =>
    text.replace(/^([^！!、，。]{1,6})([！!])/, `$1${comma}${firstName}$2`);

  return opener.romanization
    ? {
        text: cjk(opener.text, "，"),
        romanization: opener.romanization.replace(
          /^([^!,?.]+)!/,
          `$1, ${firstName}!`,
        ),
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

function buildOpenerPrompt(
  target: ChallengeTarget,
  firstName: string | null,
): string {
  const language = challengeLanguage(target.targetLanguage);
  const targets = [
    target.vocab && describeItem("Word", target.vocab),
    target.grammar && describeItem("Grammar pattern", target.grammar),
  ]
    .filter(Boolean)
    .join("\n");

  const cantonese = target.targetLanguage === "yue";
  const french = target.targetLanguage === "fr";
  const level = levelProfile(target.level);
  // Beginners keep each language's own word rules below; other levels get
  // the level's.
  const words = (beginnerRule: string) =>
    `- ${level.openerStyle || beginnerRule}`;
  const style = french
    ? `- Write natural, everyday French as friends text it, using "tu", with correct accents.
${words("Only very common, everyday words a total beginner knows. No slang, no idioms, no hard grammar.")}`
    : cantonese
      ? `- Write in natural, colloquial Hong Kong Cantonese as people really text it, in traditional characters (係, 唔, 嘅, 咗, 喺, 佢, 乜嘢 — not Mandarin forms like 是, 不, 的, 了, 在, 他, 什麼).
${words("Only very common, everyday words a total beginner knows. No slang, no idioms, no hard grammar.")}
- In the Jyutping, use the everyday Hong Kong spoken readings, not formal reading-aloud ones — e.g. 生日 is saang1 jat6, not sang1 jat6.`
      : words(
          `Only very common, everyday words a total beginner knows. No idioms, no slang, no phrasal verbs like "been up to", no hard grammar.`,
        );
  const fields = french
    ? `{
	"plan": "Private notes, never shown, one short sentence: the question you'll ask and how its natural answer uses the target",
	"text": "Charles Duck's opening message, in French",
	"translation": "A natural, casual English translation of the same message",
	${glossesPromptField(target.targetLanguage)}
}`
    : cantonese
      ? `{
	"plan": "Private notes, never shown, one short sentence: the question you'll ask and how its natural answer uses the target",
	"text": "Charles Duck's opening message, in Cantonese characters",
	"romanization": "The same message in Jyutping with tone numbers — exactly one syllable per Chinese character, keeping the punctuation",
	"translation": "A natural, casual English translation of the same message",
	${glossesPromptField(target.targetLanguage)}
}`
      : `{
	"plan": "Private notes, never shown, one short sentence: the question you'll ask and how its natural answer uses the target",
	"text": "Charles Duck's opening message",
	"translation": "A natural, casual Japanese translation of the same message",
	${glossesPromptField(target.targetLanguage)}
}`;

  return `You write the very first text message that Charles Duck, a friendly ${language.target}-speaking duck, sends to start a casual chat with ${language.learner} who is ${level.learner} learning ${language.target}.

Later in the chat, the learner will try to use this naturally:
${targets}

How to write the opener:
- A casual greeting plus ONE simple question. At most 2 short sentences and about 15 words.
${firstName ? `- Greet them by their first name, "${firstName}", in the greeting. Use it once only, and keep it exactly as written in the translation too.\n` : ""}${style}
- It must sound natural — exactly how a friend would really text.
${NATURAL_CHAT_RULE}
- Ask a question whose most natural answer would use the target, so the learner can use it in their very first reply. Work it out in "plan" first. For example, for "from X to Y" (由 X 到 Y): "What time do you usually have dinner?" → "From six to seven"; for "X ago" (之前): "When did you last see your friend?" → "Two days ago"; for "this week": "When is your birthday?" → "This week".
- Never use the target word or pattern yourself, and never quiz them ("How do you say…?") — it should just be the kind of question a friend asks, whose natural answer happens to use it.
- Only if no everyday question could naturally lead to the target (for example a bare particle), use the topic of this general opener instead, reworded in your own way: "${target.fallbackOpener.text}" (${target.fallbackOpener.translation})
${friendsPromptRule(target)}
${knownWordsPromptRule(target)}

Return only a JSON object:
${fields}
${glossesPromptRule(target.targetLanguage)}`;
}

// Cached per target (the fallback opener in it is seeded per user, day and
// attempt — see pickChallengeTarget), so reloading the page doesn't pay for
// a fresh generation or show a different opener. The prompt itself is an
// argument so it's part of the cache key: changing how openers are written
// takes effect straight away rather than once old ones expire. Throws on
// any failure rather than returning the fallback, so a failed call is never
// cached.
async function generateOpener(
  target: ChallengeTarget,
  prompt: string,
): Promise<ChallengeOpener> {
  "use cache";
  cacheLife("days");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create(
    {
      model: process.env.OPENAI_MODEL ?? "gpt-6-luna",
      response_format: { type: "json_object" },
      // A two-sentence opener doesn't need long deliberation, and the
      // learner is waiting on it.
      reasoning_effort: "low",
      messages: [{ role: "system", content: prompt }],
    },
    { signal: AbortSignal.timeout(OPENER_TIMEOUT_MS), maxRetries: 0 },
  );

  const parsed: unknown = JSON.parse(
    response.choices[0]?.message.content ?? "",
  );
  const opener = parsed as Partial<
    Record<keyof ChallengeOpener, unknown>
  > | null;
  const needsRomanization = challengeLanguage(
    target.targetLanguage,
  ).hasRomanization;
  if (
    typeof opener?.text !== "string" ||
    typeof opener.translation !== "string" ||
    !opener.text.trim() ||
    opener.text.length > MAX_OPENER_LENGTH ||
    (needsRomanization && typeof opener.romanization !== "string")
  ) {
    throw new Error("Invalid opener from model");
  }

  const text = opener.text.trim();
  const romanization = needsRomanization
    ? (opener.romanization as string).trim()
    : null;
  const glosses = parseGlosses(
    (parsed as { words?: unknown } | null)?.words,
    needsRomanization,
  );
  // Course words back to the readings the course teaches (see
  // standardiseJyutping).
  const dictionary = needsRomanization ? await jyutpingDictionary() : [];

  return {
    text,
    romanization:
      romanization && standardiseJyutping(text, romanization, dictionary),
    translation: opener.translation.trim(),
    glosses: standardiseGlosses(glosses, dictionary),
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
  if (!process.env.OPENAI_API_KEY)
    return personalise(target.fallbackOpener, firstName);

  try {
    return await generateOpener(target, buildOpenerPrompt(target, firstName));
  } catch (error) {
    console.error("Daily challenge opener generation failed:", error);
    return personalise(target.fallbackOpener, firstName);
  }
}
