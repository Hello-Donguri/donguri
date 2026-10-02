import "server-only";

import OpenAI from "openai";
import { requireSubscriber } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { startOfUTCDay } from "@/lib/srs";
import { challengeLanguage, pickChallengeTarget, type ChallengeTarget } from "@/lib/daily-challenge";

// A word offered to a learner who's paused mid-reply. No meaning, so they
// still have to recognise it, and nothing says which one fits — that would
// give it away.
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
// term — '今日 (gam1 jat6) — "today"' → 今日. Hints may only be these.
function knownVocab(target: ChallengeTarget): Map<string, string> {
  return new Map(
    target.knownWords
      .filter((line) => !line.startsWith("pattern "))
      .map((line) => [line.split(/ \(| — /)[0].trim(), line] as const),
  );
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Word hints for a learner who's paused while writing a daily challenge
// reply: four words they've learnt, shuffled — exactly one that would help
// them say what they seem to be saying, and three that make no sense there
// at all. A nudge, not the answer: they still have to recognise the right
// one and type it themselves. Empty when there's nothing useful to offer or anything fails —
// hints are optional, so failure just shows nothing.
export async function dailyChallengeHints(
  courseSlug: string,
  turns: HintTurn[],
  draft: string,
): Promise<HintWord[]> {
  const user = await requireSubscriber();
  if (!process.env.OPENAI_API_KEY || !draft.trim()) return [];

  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { userId: user.id, unenrolledAt: null, course: { slug: courseSlug, active: true } },
    select: { courseId: true },
  });
  if (!enrollment) return [];

  const today = startOfUTCDay(new Date());
  const attemptsToday = await prisma.dailyChallengeAttempt.count({
    where: { userId: user.id, courseId: enrollment.courseId, challengeDate: today },
  });
  const target = await pickChallengeTarget(user.id, enrollment.courseId, today, attemptsToday);
  if (!target) return [];

  const vocab = knownVocab(target);
  if (vocab.size < HINT_COUNT) return [];

  const language = challengeLanguage(target.targetLanguage);
  const cantonese = target.targetLanguage === "yue";
  const chat = turns
    .slice(-MAX_TURNS)
    .map((turn) => `${turn.role === "ai" ? "Charles" : "Learner"}: ${turn.text.slice(0, MAX_TEXT)}`)
    .join("\n");

  const prompt = `A beginner learning ${language.target} is replying to their friend Charles in a casual text chat, and has stopped typing — they may have forgotten a word.

The chat so far:
${chat}

What they've typed so far: "${draft.slice(0, MAX_TEXT)}"
${cantonese ? "They may type Cantonese in Jyutping: read it as the Cantonese it spells.\n" : ""}
Words they've learnt:
${[...vocab.values()].map((line) => `  ${line}`).join("\n")}

Pick ${HINT_COUNT} words, all from that list exactly as written there:
- ONE that would help them carry on with what they seem to be saying, in reply to Charles's last message.
- ${HINT_COUNT - 1} that make NO sense in their reply. Check each one: if it could finish their sentence into any sensible answer to Charles — even a different answer from the one they seem to mean — it fits, so don't pick it. Exactly one word may fit.
Never pick a word that's already in what they've typed.

Return only a JSON object: {"words": [{"text": "the word exactly as in the list", "fits": true}]} — exactly ${HINT_COUNT} entries, exactly one with "fits": true.`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
        response_format: { type: "json_object" },
        reasoning_effort: "low",
        messages: [{ role: "system", content: prompt }],
      },
      { signal: AbortSignal.timeout(HINT_TIMEOUT_MS), maxRetries: 0 },
    );
    const parsed = JSON.parse(response.choices[0]?.message.content ?? "") as { words?: unknown };
    if (!Array.isArray(parsed.words)) return [];

    // Only words really on their list, and not already typed; the reading
    // comes from the list, not the model.
    const seen = new Set<string>();
    const words = parsed.words.flatMap((entry): (HintWord & { fits: boolean })[] => {
      if (typeof entry !== "object" || entry === null) return [];
      const { text, fits } = entry as Record<string, unknown>;
      if (typeof text !== "string" || !vocab.has(text) || seen.has(text) || draft.includes(text)) return [];
      seen.add(text);
      const line = vocab.get(text)!;
      const romanization = line.match(/\(([^)]+)\)/)?.[1] ?? null;
      return [{ text, romanization, fits: fits === true }];
    });

    // Without exactly one fitting word it's not a fair nudge — show nothing.
    if (words.length < 2 || words.filter((word) => word.fits).length !== 1) return [];
    return shuffle(words).map(({ text, romanization }) => ({ text, romanization }));
  } catch (error) {
    console.error("Daily challenge hints failed:", error);
    return [];
  }
}
