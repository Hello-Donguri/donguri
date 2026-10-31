"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { buildWordAudioKey, buildWordImageKey, uploadImage } from "@/lib/bunny";
import { isSafeSvg, UNSAFE_SVG_MESSAGE } from "@/lib/svg";
import { GENERATED_IMAGE_MAX_BYTES } from "@/lib/generated-word-image";
import {
  AUDIO_MAX_BYTES,
  AUDIO_SIZE_ERROR,
  AUDIO_TYPE_ERROR,
  IMAGE_MAX_BYTES,
  WORD_IMAGE_TYPES,
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
    if (!WORD_IMAGE_TYPES.includes(file.type)) return { error: "Use a WebP, PNG, JPEG or SVG image." };
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

  const current = await prisma.word.findUnique({ where: { id: wordId }, select: { imageKey: true } });
  if (!current) return { error: "That word no longer exists." };

  const applyToShared = kind === "image" && formData.get("applyToShared") === "1" && current.imageKey;
  const affected = applyToShared
    ? await prisma.word.findMany({ where: { imageKey: current.imageKey }, select: { id: true } })
    : [{ id: wordId }];
  const ids = affected.map((word) => word.id);
  const updated = await prisma.word.updateMany({ where: { id: { in: ids } }, data: { [COLUMN[kind]]: key } });

  await Promise.all(ids.map(revalidateWord));
  return { updated: updated.count };
}

// Sets a picture generated on the deck page (see generateWordImage) as the
// word's image: an SVG trace as its text, or the PNG as base64. Only this
// word changes, even if its current picture is shared with other decks.
// The size cap is checked here too, not just by the button.
export async function chooseGeneratedWordImage(
  wordId: string,
  image: { type: "image/svg+xml"; svg: string } | { type: "image/png"; base64: string },
): Promise<{ error?: string }> {
  if (!(await isAdmin())) return { error: "You don't have permission to do that." };

  const file =
    image.type === "image/svg+xml"
      ? new File([image.svg], "generated.svg", { type: image.type })
      : new File([Buffer.from(image.base64, "base64")], "generated.png", { type: image.type });

  if (file.size > GENERATED_IMAGE_MAX_BYTES) {
    return { error: `Too big to use — keep it under ${GENERATED_IMAGE_MAX_BYTES / 1024}KB.` };
  }
  if (image.type === "image/svg+xml" && !(await isSafeSvg(file))) return { error: UNSAFE_SVG_MESSAGE };

  const key = buildWordImageKey(file.type);
  try {
    await uploadImage(file, key);
  } catch (error) {
    console.error("Bunny upload failed:", error);
    return { error: "Upload failed. Try again." };
  }

  const updated = await prisma.word.updateMany({ where: { id: wordId }, data: { imageKey: key } });
  if (updated.count === 0) return { error: "That word no longer exists." };

  await revalidateWord(wordId);
  return {};
}

export async function removeWordMedia(wordId: string, kind: WordMediaKind): Promise<void> {
  if (!(await isAdmin()) || !isKind(kind)) return;
  await prisma.word.updateMany({ where: { id: wordId }, data: { [COLUMN[kind]]: null } });
  await revalidateWord(wordId);
}
