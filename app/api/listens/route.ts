import { connection, type NextRequest } from "next/server";
import { getProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import type { ListenSource } from "@/lib/listens";

const COLUMN: Record<ListenSource, "listensFemale" | "listensMale" | "listensSpeech"> = {
  female: "listensFemale",
  male: "listensMale",
  speech: "listensSpeech",
};

// One listen to a word (see countListen): its female or male recording, or
// the browser's read-through. Only signed-in learners are counted.
export async function POST(request: NextRequest) {
  await connection();
  const profile = await getProfile();
  if (!profile) return new Response(null, { status: 204 });

  const body = (await request.json().catch(() => null)) as { wordId?: unknown; source?: unknown } | null;
  const source = body?.source;
  if (typeof body?.wordId !== "string" || (source !== "female" && source !== "male" && source !== "speech")) {
    return new Response(null, { status: 400 });
  }
  // updateMany, so a word that's since been deleted is simply not counted.
  await prisma.word.updateMany({ where: { id: body.wordId }, data: { [COLUMN[source]]: { increment: 1 } } });
  return new Response(null, { status: 204 });
}
