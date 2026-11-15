import { connection, type NextRequest } from "next/server";
import { getProfile } from "@/lib/dal";
import { traceWordPicture } from "@/lib/word-image-generate";
import { streamWordImageEvents } from "@/lib/word-image-stream";
import { parseCharacterIds } from "@/lib/word-image-characters";
import { parseSvgModel } from "@/lib/word-image-models";

// ChatGPT redrawing the picture as an SVG can take a few minutes.
export const maxDuration = 240;

// The picture's largest accepted size, as base64 — far more than a
// generated one needs.
const MAX_PNG_BASE64 = 8 * 1024 * 1024;

// Has ChatGPT turn the picture the admin approved on the deck page into an
// SVG (see traceWordPicture), streamed back with its progress.
export async function POST(request: NextRequest) {
  await connection();
  const profile = await getProfile();
  if (profile?.role !== "admin")
    return Response.json({ error: "Admins only." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    wordId?: unknown;
    characterIds?: unknown;
    png?: unknown;
    svgModel?: unknown;
  } | null;
  if (typeof body?.wordId !== "string")
    return Response.json({ error: "Missing word." }, { status: 400 });
  if (
    typeof body.png !== "string" ||
    !body.png ||
    body.png.length > MAX_PNG_BASE64
  ) {
    return Response.json(
      { error: "Missing or oversized picture." },
      { status: 400 },
    );
  }
  const wordId = body.wordId;
  const png = Buffer.from(body.png, "base64");
  const characterIds = parseCharacterIds(body.characterIds);
  const svgModel = parseSvgModel(body.svgModel);

  return streamWordImageEvents(request, (signal, emit) =>
    traceWordPicture({ wordId, characterIds, png, svgModel, signal }, emit),
  );
}
