import { connection, type NextRequest } from "next/server";
import { getProfile } from "@/lib/dal";
import { suggestWordImageIdeas } from "@/lib/word-image-ideas";

export const maxDuration = 90;

// The image windows' prompt ideas for a word (see suggestWordImageIdeas).
// A route rather than a server action: server actions run one at a time,
// and auto mode asks for a whole group's ideas at once.
export async function POST(request: NextRequest) {
  await connection();
  const profile = await getProfile();
  if (profile?.role !== "admin") return Response.json({ error: "Admins only." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { wordId?: unknown; noCharacters?: unknown } | null;
  if (typeof body?.wordId !== "string") return Response.json({ error: "Missing word." }, { status: 400 });

  try {
    return Response.json(await suggestWordImageIdeas(body.wordId, { noCharacters: body.noCharacters === true }));
  } catch (error) {
    console.error("Word image ideas failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Couldn't come up with ideas." },
      { status: 500 },
    );
  }
}
