import { connection, type NextRequest } from "next/server";
import { getProfile } from "@/lib/dal";
import { generateWordPicture } from "@/lib/word-image-generate";
import { streamWordImageEvents } from "@/lib/word-image-stream";
import { parseCharacterIds } from "@/lib/word-image-characters";
import { parseImageModel, parseImageQuality } from "@/lib/word-image-models";
import {
  CUSTOM_SCENE_ID,
  WORD_IMAGE_SCENES,
  cleanCustomScene,
  type WordImageSceneId,
} from "@/lib/word-image-scenes";

export const maxDuration = 180;

// Draws a word's picture for the admin deck page (see generateWordPicture),
// streamed back as it goes — one JSON event per line — so the page can show
// a running log. A route handler rather than a server action: an action
// only answers once, at the end.
export async function POST(request: NextRequest) {
  await connection();
  const profile = await getProfile();
  if (profile?.role !== "admin")
    return Response.json({ error: "Admins only." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    wordId?: unknown;
    characterIds?: unknown;
    sceneId?: unknown;
    customScene?: unknown;
    imageModel?: unknown;
    quality?: unknown;
    face?: unknown;
  } | null;
  if (typeof body?.wordId !== "string")
    return Response.json({ error: "Missing word." }, { status: 400 });
  const wordId = body.wordId;
  const characterIds = parseCharacterIds(body.characterIds);
  const sceneId = WORD_IMAGE_SCENES.some((scene) => scene.id === body.sceneId)
    ? (body.sceneId as WordImageSceneId)
    : "auto";
  const imageModel = parseImageModel(body.imageModel);
  const quality = parseImageQuality(body.quality);
  const customScene =
    body.sceneId === CUSTOM_SCENE_ID ? cleanCustomScene(body.customScene) : "";
  if (body.sceneId === CUSTOM_SCENE_ID && !customScene) {
    return Response.json(
      { error: "Describe the scene." },
      { status: 400 },
    );
  }

  return streamWordImageEvents(request, (signal, emit) =>
    generateWordPicture(
      {
        wordId,
        characterIds,
        sceneId,
        customScene,
        face: body.face !== false,
        imageModel,
        quality,
        origin: request.nextUrl.origin,
        signal,
      },
      emit,
    ),
  );
}
