import "server-only";

import OpenAI from "openai";
import { requireMember } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { startOfUTCDay } from "@/lib/srs";
import {
  challengeLanguage,
  levelProfile,
  pickChallengeTarget,
  type ChallengeTarget,
} from "@/lib/daily-challenge";

// A word offered to a learner who's paused mid-reply. No meaning, so they
// still have to recall what it means and type it themselves.
export type HintWord = {
  text: string;
  romanization: string | null;
};

export type HintTurn = { role: "ai" | "user"; text: string };

const HINT_COUNT = 4;
const MAX_TURNS = 6;
const MAX_TEXT = 500;
// Generous, since the learner has already paused — but the hints should
// arrive while they're still stuck. See the opener's note on reasoning
// effort (lib/daily-challenge-opener.ts): at the default it took too long.
const HINT_TIMEOUT_MS = 20_000;

// The learnt vocab (not grammar patterns) behind the known-words lines, by
// term — '今日 (gam1 jat6) — "today"' → 今日. Hints come from these first.
function knownVocab(target: ChallengeTarget): Map<string, string> {
  return new Map(
    target.knownWords
      .filter((line) => !line.startsWith("pattern "))
      .map((line) => [line.split(/ \(| — /)[0].trim(), line] as const),
  );
}

// Whether `word` is already in what the learner has typed: as a whole word
// in Latin text (so "a" doesn't count as typed because "cat" is there), or
// anywhere for Chinese, which has no spaces between words.
function alreadyTyped(word: string, draft: string): boolean {
  if (/\p{Script=Han}/u.test(word)) return draft.includes(word);
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    "iu",
  ).test(draft);
}

// A suggestion from outside their list must be simple: one short word or a
// tiny phrase, not a sentence that does the work for them.
function isShortSuggestion(text: string): boolean {
  return /\p{Script=Han}/u.test(text)
    ? [...text].length <= 4
    : text.split(/\s+/).length <= 2 && text.length <= 20;
}

// Word hints for a learner who's paused while writing a daily challenge
// reply: up to four words that would help them carry on with what they
// seem to be saying, most useful first. Words they've learnt come first;
// only when too few of those fit are simple everyday words they haven't
// learnt added, so every hint is one they could really use next. Empty
// when nothing fits or anything fails — hints are optional, so failure
// just shows nothing.
export async function dailyChallengeHints(
  courseSlug: string,
  turns: HintTurn[],
  draft: string,
): Promise<HintWord[]> {
  const user = await requireMember();
  if (!process.env.OPENAI_API_KEY || !draft.trim()) return [];

  const enrollment = await prisma.courseEnrollment.findFirst({
    where: {
      userId: user.id,
      unenrolledAt: null,
      course: { slug: courseSlug, active: true },
    },
    select: { courseId: true },
  });
  if (!enrollment) return [];

  const today = startOfUTCDay(new Date());
  const attemptsToday = await prisma.dailyChallengeAttempt.count({
    where: {
      userId: user.id,
      courseId: enrollment.courseId,
      challengeDate: today,
    },
  });
  const target = await pickChallengeTarget(
    user.id,
    enrollment.courseId,
    today,
    attemptsToday,
  );
  if (!target) return [];

  const vocab = knownVocab(target);

  const language = challengeLanguage(target.targetLanguage);
  const cantonese = target.targetLanguage === "yue";
  const chat = turns
    .slice(-MAX_TURNS)
    .map(
      (turn) =>
        `${turn.role === "ai" ? "Charles" : "Learner"}: ${turn.text.slice(0, MAX_TEXT)}`,
    )
    .join("\n");

  const learner = levelProfile(target.level).learner;
  const prompt = `${learner.charAt(0).toUpperCase()}${learner.slice(1)} learning ${language.target} is replying to their friend Charles in a casual text chat, and has stopped typing — they may have forgotten a word.

The chat so far:
${chat}

What they've typed so far: "${draft.slice(0, MAX_TEXT)}"
${cantonese ? "They may type Cantonese in Jyutping: read it as the Cantonese it spells.\n" : ""}
Words they've learnt:
${vocab.size > 0 ? [...vocab.values()].map((line) => `  ${line}`).join("\n") : "  (none yet)"}

First work out what they seem to be trying to say, in reply to Charles's last message. Their last word may be unfinished or not quite right (e.g. "call" when they mean "called" or "name") — then the word they're reaching for is a good hint.

Suggest up to ${HINT_COUNT} ${language.target} words that would help them carry on that reply — the word that would most naturally come next, or the one they seem to be reaching for. Every word must fit: if it wouldn't make sense in their reply, don't suggest it. Fewer good words are far better than filling the list.
- Prefer words from their list, written exactly as there ("learnt": true).
- If fewer than ${HINT_COUNT} words from the list fit, add simple, common everyday ${language.target} words that fit instead ("learnt": false) — single words or a tiny set phrase, never a whole sentence.
- Never suggest a word that's already in what they've typed.
- Order them most useful first.

Return only a JSON object: {"words": [{"text": "the word", "learnt": true${cantonese ? ', "romanization": "its Jyutping with tone numbers"' : ""}}]}`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL ?? "gpt-6-luna",
        response_format: { type: "json_object" },
        reasoning_effort: "low",
        messages: [{ role: "system", content: prompt }],
      },
      { signal: AbortSignal.timeout(HINT_TIMEOUT_MS), maxRetries: 0 },
    );
    const parsed = JSON.parse(response.choices[0]?.message.content ?? "") as {
      words?: unknown;
    };
    if (!Array.isArray(parsed.words)) return [];

    // Learnt words only when really on their list, with the list's reading;
    // others only when short. Nothing already typed, nothing twice.
    const seen = new Set<string>();
    const words = parsed.words.flatMap((entry): HintWord[] => {
      if (typeof entry !== "object" || entry === null) return [];
      const { text: rawText, romanization } = entry as Record<string, unknown>;
      if (typeof rawText !== "string") return [];
      const text = rawText.trim();
      if (!text || seen.has(text) || alreadyTyped(text, draft)) return [];

      const line = vocab.get(text);
      if (line) {
        seen.add(text);
        return [{ text, romanization: line.match(/\(([^)]+)\)/)?.[1] ?? null }];
      }
      if (!isShortSuggestion(text)) return [];
      seen.add(text);
      return [
        {
          text,
          romanization:
            cantonese && typeof romanization === "string" && romanization.trim()
              ? romanization.trim()
              : null,
        },
      ];
    });

    return words.slice(0, HINT_COUNT);
  } catch (error) {
    console.error("Daily challenge hints failed:", error);
    return [];
  }
}
