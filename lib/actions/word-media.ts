"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { buildWordAudioKey, buildWordImageKey, uploadImage } from "@/lib/bunny";
import { isSafeSvg, UNSAFE_SVG_MESSAGE } from "@/lib/svg";
import { deleteUnusedAudio } from "@/lib/audio-cleanup";
import { GENERATED_IMAGE_MAX_BYTES, SAVE_BATCH_MAX } from "@/lib/generated-word-image";
import {
  AUDIO_MAX_BYTES,
  AUDIO_SIZE_ERROR,
  AUDIO_TYPE_ERROR,
  IMAGE_MAX_BYTES,
  WORD_IMAGE_TYPES,
  WORD_IMAGE_TYPE_ERROR,
  audioMime,
  typedAudio,
} from "@/lib/word-media";

// The deck page's quick uploads (see WordMediaSlots): a word's picture or
// one of its pronunciation recordings, set or cleared straight from the
// word list without opening the word. A replaced file is left on
// bunny.net, as the word form does.

export type WordMediaKind = "image" | "audioFemale" | "audioMale";

const COLUMN = { image: "imageKey", audioFemale: "audioFemaleKey", audioMale: "audioMaleKey" } as const;

async function isAdmin(): Promise<boolean> {
  const profile = await requireProfile();
  return profile.role === "admin";
}

function isKind(value: unknown): value is WordMediaKind {
  return value === "image" || value === "audioFemale" || value === "audioMale";
}

// Refreshes the admin deck page and the learner deck page the word is on.
async function revalidateWord(wordId: string) {
  const word = await prisma.word.findUnique({
    where: { id: wordId },
    select: { languageDeckId: true, languageDeck: { select: { course: { select: { slug: true } } } } },
  });
  if (!word) return;
  const slug = word.languageDeck.course.slug;
  revalidatePath(`/dashboard/admin/courses/${slug}/categories/${word.languageDeckId}`);
  revalidatePath(`/dashboard/courses/${slug}/decks/${word.languageDeckId}`);
}

// A new picture for a word whose current one is shared with words in other
// decks (copied decks point at the same file — the admin deck page finds
// these and asks which to update): with
// `applyToShared` set, every word using the old picture gets the new one;
// otherwise only this word changes. `updated` is how many words did.
export async function uploadWordMedia(formData: FormData): Promise<{ error?: string; updated?: number }> {
  if (!(await isAdmin())) return { error: "You don't have permission to do that." };

  const wordId = formData.get("wordId");
  const kind = formData.get("kind");
  const file = formData.get("file");
  if (typeof wordId !== "string" || !isKind(kind) || !(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  let key: string;
  let upload: File = file;
  if (kind === "image") {
    if (!WORD_IMAGE_TYPES.includes(file.type)) return { error: WORD_IMAGE_TYPE_ERROR };
    if (file.size > IMAGE_MAX_BYTES) return { error: "Image must be under 5MB." };
    if (file.type === "image/svg+xml" && !(await isSafeSvg(file))) return { error: UNSAFE_SVG_MESSAGE };
    key = buildWordImageKey(file.type);
  } else {
    const mime = audioMime(file);
    if (!mime) return { error: AUDIO_TYPE_ERROR };
    if (file.size > AUDIO_MAX_BYTES) return { error: AUDIO_SIZE_ERROR };
    key = buildWordAudioKey(mime);
    upload = typedAudio(file, mime);
  }

  try {
    await uploadImage(upload, key);
  } catch (error) {
    console.error("Bunny upload failed:", error);
    return { error: "Upload failed. Try again." };
  }

  const current = await prisma.word.findUnique({
    where: { id: wordId },
    select: { imageKey: true, audioFemaleKey: true, audioMaleKey: true },
  });
  if (!current) return { error: "That word no longer exists." };

  const applyToShared = kind === "image" && formData.get("applyToShared") === "1" && current.imageKey;
  const affected = applyToShared
    ? await prisma.word.findMany({ where: { imageKey: current.imageKey }, select: { id: true } })
    : [{ id: wordId }];
  const ids = affected.map((word) => word.id);
  const updated = await prisma.word.updateMany({ where: { id: { in: ids } }, data: { [COLUMN[kind]]: key } });
  // A replaced recording's old file goes from bunny.net too.
  if (kind !== "image") await deleteUnusedAudio([current[COLUMN[kind]]]);

  await Promise.all(ids.map(revalidateWord));
  return { updated: updated.count };
}

// Uploads a generated SVG and sets it as the word's image — the shared
// part of saving one (chooseGeneratedWordImage) or many
// (chooseGeneratedWordImages). The size cap is checked here too, not just
// by the buttons. The pages are refreshed by the caller.
async function saveGeneratedSvg(wordId: string, svg: string): Promise<string | null> {
  const file = new File([svg], "generated.svg", { type: "image/svg+xml" });
  if (file.size > GENERATED_IMAGE_MAX_BYTES) {
    return `Too big to use — keep it under ${GENERATED_IMAGE_MAX_BYTES / 1024}KB.`;
  }
  if (!(await isSafeSvg(file))) return UNSAFE_SVG_MESSAGE;

  const key = buildWordImageKey(file.type);
  try {
    await uploadImage(file, key);
  } catch (error) {
    console.error("Bunny upload failed:", error);
    return "Upload failed. Try again.";
  }

  const updated = await prisma.word.updateMany({ where: { id: wordId }, data: { imageKey: key } });
  return updated.count === 0 ? "That word no longer exists." : null;
}

// Sets a picture generated on the deck page (see generateWordImage) as the
// word's image. Only SVGs are used as word pictures; the PNG is just to
// look at. Only this word changes, even if its current picture is shared
// with other decks.
export async function chooseGeneratedWordImage(
  wordId: string,
  image: { type: "image/svg+xml"; svg: string } | { type: "image/png"; base64: string },
): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: "You don't have permission to do that." };
  if (image.type !== "image/svg+xml") return { error: WORD_IMAGE_TYPE_ERROR };

  const error = await saveGeneratedSvg(wordId, image.svg);
  if (error) return { error };
  await revalidateWord(wordId);
  return {};
}

// How many uploads a batch save runs side by side.
const SAVE_AT_ONCE = 25;

// The batch and auto image windows' save: many SVGs in one call, uploaded
// side by side, with each deck page refreshed once at the end rather than
// once per word. `errors` has a reason for each word that didn't save.
export async function chooseGeneratedWordImages(
  images: { wordId: string; svg: string }[],
): Promise<{ errors: Record<string, string> }> {
  if (!(await isAdmin())) {
    return { errors: Object.fromEntries(images.map((image) => [image.wordId, "You don't have permission to do that."])) };
  }
  const errors: Record<string, string> = {};
  const saved: string[] = [];
  const queue = images.slice(0, SAVE_BATCH_MAX);
  for (const image of images.slice(SAVE_BATCH_MAX)) errors[image.wordId] = "Too many at once. Try again.";

  await Promise.all(
    Array.from({ length: Math.min(SAVE_AT_ONCE, queue.length) }, async () => {
      for (let image = queue.shift(); image; image = queue.shift()) {
        const error = typeof image.svg === "string" ? await saveGeneratedSvg(image.wordId, image.svg) : WORD_IMAGE_TYPE_ERROR;
        if (error) errors[image.wordId] = error;
        else saved.push(image.wordId);
      }
    }),
  );

  if (saved.length) {
    const decks = await prisma.word.findMany({
      where: { id: { in: saved } },
      distinct: ["languageDeckId"],
      select: { languageDeckId: true, languageDeck: { select: { course: { select: { slug: true } } } } },
    });
    for (const { languageDeckId, languageDeck } of decks) {
      const slug = languageDeck.course.slug;
      revalidatePath(`/dashboard/admin/courses/${slug}/categories/${languageDeckId}`);
      revalidatePath(`/dashboard/courses/${slug}/decks/${languageDeckId}`);
    }
  }
  return { errors };
}

// Clears one of a word's media slots. A recording is deleted from
// bunny.net as well (once nothing else uses the file — see
// deleteUnusedAudio); a picture's file is kept, since copied decks share
// pictures.
export async function removeWordMedia(wordId: string, kind: WordMediaKind): Promise<void> {
  if (!(await isAdmin()) || !isKind(kind)) return;
  const current = await prisma.word.findUnique({
    where: { id: wordId },
    select: { audioFemaleKey: true, audioMaleKey: true },
  });
  await prisma.word.updateMany({ where: { id: wordId }, data: { [COLUMN[kind]]: null } });
  if (current && kind !== "image") await deleteUnusedAudio([current[COLUMN[kind]]]);
  await revalidateWord(wordId);
}

// The words the course page's batch image window can draw pictures for
// (see BatchWordImages): the vocab in one deck, or every deck in the
// course, with whether each has a picture yet and whether it's an SVG.
// Grammar points don't show pictures, so they're left out.
export async function listWordsForBatchImages(
  courseSlug: string,
  languageDeckId: string | null,
): Promise<{ error?: string; words?: { id: string; term: string; deckTitle: string; hasImage: boolean; hasSvg: boolean }[] }> {
  if (!(await isAdmin())) return { error: "You don't have permission to do that." };

  const words = await prisma.word.findMany({
    where: {
      path: "vocab",
      languageDeck: { course: { slug: courseSlug }, ...(languageDeckId ? { id: languageDeckId } : {}) },
    },
    orderBy: [{ languageDeck: { position: "asc" } }, { position: "asc" }],
    select: { id: true, term: true, imageKey: true, languageDeck: { select: { title: true } } },
  });
  return {
    words: words.map((word) => ({
      id: word.id,
      term: word.term,
      deckTitle: word.languageDeck.title,
      hasImage: Boolean(word.imageKey),
      hasSvg: Boolean(word.imageKey?.toLowerCase().endsWith(".svg")),
    })),
  };
}

