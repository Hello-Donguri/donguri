import "server-only";
import OpenAI from "openai";
import { cacheLife } from "next/cache";
import {
  JAPANESE_FEEDBACK_RULE,
  challengeLanguage,
  levelProfile,
  type DailyChallengeResult,
} from "@/lib/daily-challenge";
import type { CourseLevel } from "@/lib/definitions";

const REVIEW_TIMEOUT_MS = 12000;

// Charles Duck's look back over the day's attempts on the end-of-day
// summary: a short paragraph on how the learner did overall, plus the one
// thing most worth practising next.
// The ...Ja fields are the Japanese versions (see JAPANESE_FEEDBACK_RULE),
// null if the model left them out.
export type DailyChallengeReview = {
  feedback: string;
  feedbackJa: string | null;
  focus: string;
  focusJa: string | null;
};

function describeAttempt(result: DailyChallengeResult, index: number): string {
  const scores =
    result.grammarScore === null
      ? "not recorded"
      : `grammar ${result.grammarScore}/10, natural phrasing ${result.naturalnessScore}/10, relevance ${result.relevanceScore}/10, complexity ${result.complexityScore}/10`;

  return [
    `Challenge ${index + 1} — target: ${result.targetTerms.map((term) => `"${term}"`).join(" + ") || "unknown"}`,
    result.message && `Their message: "${result.message}"`,
    `Scores: ${scores}`,
    result.overall && `Notes: ${result.overall}`,
    result.tips.length > 0 && `Tips given: ${result.tips.join(" / ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// Cached on the results themselves, so revisiting the summary doesn't pay
// for a new review. Throws on failure so a failed call is never cached.
async function generateReview(
  results: DailyChallengeResult[],
  targetLanguage: string,
  courseLevel: CourseLevel,
): Promise<DailyChallengeReview> {
  "use cache";
  cacheLife("days");

  const language = challengeLanguage(targetLanguage);
  const level = levelProfile(courseLevel);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create(
    {
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are Charles Duck, a kind ${language.target}-speaking friend who has just finished today's chat challenges with ${language.learner} who is ${level.learner} learning ${language.target}. In each challenge they had to use a target word or grammar pattern naturally in a chat with you. Here is how each one went:

${results.map(describeAttempt).join("\n\n")}

Look across all of them together, not one at a time, and write:
- "feedback": 2-3 short sentences on how they did today overall — start with something specific they did well, then the main pattern you noticed across their messages.
- "focus": ONE short, concrete thing to practise next time, based on what actually came up today.

Write in ${level.feedbackStyle}. Be warm and encouraging but honest; don't invent problems that didn't happen.

${
            language.feedbackIn === "Japanese"
              ? `Also write "feedbackJa" and "focusJa". ${JAPANESE_FEEDBACK_RULE}

Return only a JSON object: { "feedback": "...", "focus": "...", "feedbackJa": "...", "focusJa": "..." }`
              : `Write both in ENGLISH, never ${language.target} — the learner is an English speaker. ${language.quoteRule}

Return only a JSON object: { "feedback": "...", "focus": "..." }`
          }`,
        },
      ],
    },
    { signal: AbortSignal.timeout(REVIEW_TIMEOUT_MS), maxRetries: 0 },
  );

  const parsed: unknown = JSON.parse(
    response.choices[0]?.message.content ?? "",
  );
  const review = parsed as Partial<Record<keyof DailyChallengeReview, unknown>> | null;
  if (
    typeof review?.feedback !== "string" ||
    typeof review.focus !== "string"
  ) {
    throw new Error("Invalid daily challenge review from model");
  }

  const optional = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  return {
    feedback: review.feedback.trim(),
    feedbackJa: optional(review.feedbackJa),
    focus: review.focus.trim(),
    focusJa: optional(review.focusJa),
  };
}

// Null when there's nothing to review, OpenAI isn't configured or the call
// fails — the summary still shows each attempt's own notes without it.
export async function getDailyChallengeReview(
  results: DailyChallengeResult[],
  targetLanguage: string,
  level: CourseLevel,
): Promise<DailyChallengeReview | null> {
  // Skipped attempts have nothing to look back on.
  const attempted = results.filter((result) => !result.skipped);
  if (
    !process.env.OPENAI_API_KEY ||
    attempted.every((result) => result.message === null)
  ) {
    return null;
  }

  try {
    return await generateReview(attempted, targetLanguage, level);
  } catch (error) {
    console.error("Daily challenge review generation failed:", error);
    return null;
  }
}
