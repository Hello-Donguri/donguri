"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { buildWordAudioKey, buildWordImageKey, uploadImage } from "@/lib/bunny";
import { isSafeSvg, UNSAFE_SVG_MESSAGE } from "@/lib/svg";
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

export async function uploadWordMedia(formData: FormData): Promise<{ error?: string }> {
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

  const updated = await prisma.word.updateMany({ where: { id: wordId }, data: { [COLUMN[kind]]: key } });
  if (updated.count === 0) return { error: "That word no longer exists." };

  await revalidateWord(wordId);
  return {};
}

export async function removeWordMedia(wordId: string, kind: WordMediaKind): Promise<void> {
  if (!(await isAdmin()) || !isKind(kind)) return;
  await prisma.word.updateMany({ where: { id: wordId }, data: { [COLUMN[kind]]: null } });
  await revalidateWord(wordId);
}
