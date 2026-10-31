import { connection, type NextRequest } from "next/server";
import { getProfile } from "@/lib/dal";
import { editWordPicture } from "@/lib/word-image-generate";
import { streamWordImageEvents } from "@/lib/word-image-stream";
import { parseCharacterIds } from "@/lib/word-image-characters";
import { cleanEditInstruction } from "@/lib/generated-word-image";
import { parseImageModel, parseImageQuality } from "@/lib/word-image-models";

export const maxDuration = 180;

// The picture's largest accepted size, as base64 — far more than a
// generated one needs.
const MAX_PNG_BASE64 = 8 * 1024 * 1024;

// Changes the picture already drawn on the admin deck page as the admin
// describes (see editWordPicture), streamed back like a fresh drawing.
export async function POST(request: NextRequest) {
  await connection();
  const profile = await getProfile();
  if (profile?.role !== "admin")
    return Response.json({ error: "Admins only." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    wordId?: unknown;
    characterIds?: unknown;
    png?: unknown;
    instruction?: unknown;
    imageModel?: unknown;
    quality?: unknown;
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
  const instruction = cleanEditInstruction(body.instruction);
  if (!instruction)
    return Response.json({ error: "Say what to change." }, { status: 400 });

  const wordId = body.wordId;
  const png = Buffer.from(body.png, "base64");
  const characterIds = parseCharacterIds(body.characterIds);
  const imageModel = parseImageModel(body.imageModel);
  const quality = parseImageQuality(body.quality);

  return streamWordImageEvents(request, (signal, emit) =>
    editWordPicture(
      {
        wordId,
        characterIds,
        png,
        instruction,
        imageModel,
        quality,
        origin: request.nextUrl.origin,
        signal,
      },
      emit,
    ),
  );
}
