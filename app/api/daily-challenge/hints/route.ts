import { connection, type NextRequest } from "next/server";
import { dailyChallengeHints, type HintTurn } from "@/lib/daily-challenge-hints";

// Word hints for a learner who's paused mid-reply in the daily challenge
// (see dailyChallengeHints). A route handler rather than a server action:
// it's asked for in the background while they type, and the client runs
// server actions one at a time — a slow hint would otherwise hold up
// sending their message.
export async function POST(request: NextRequest) {
  await connection();
  const body = (await request.json().catch(() => null)) as {
    courseSlug?: unknown;
    turns?: unknown;
    draft?: unknown;
  } | null;

  if (!body || typeof body.courseSlug !== "string" || typeof body.draft !== "string" || !Array.isArray(body.turns)) {
    return Response.json({ words: [] }, { status: 400 });
  }

  const turns: HintTurn[] = body.turns.flatMap((turn) =>
    turn &&
    typeof turn === "object" &&
    (turn.role === "ai" || turn.role === "user") &&
    typeof turn.text === "string"
      ? [{ role: turn.role, text: turn.text }]
      : [],
  );

  const words = await dailyChallengeHints(body.courseSlug, turns, body.draft);
  return Response.json({ words }, { headers: { "Cache-Control": "no-store" } });
}
