import { revalidatePath } from "next/cache";
import { connection, type NextRequest } from "next/server";
import { getProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { buildWordAudioKey, imageUrl, uploadImage } from "@/lib/bunny";
import { deleteUnusedAudio } from "@/lib/audio-cleanup";
import { AUDIO_MAX_BYTES, AUDIO_SIZE_ERROR, AUDIO_TYPE_ERROR, audioMime, typedAudio } from "@/lib/word-media";

const COLUMN = { female: "audioFemaleKey", male: "audioMaleKey" } as const;

// One recording from the admin deck page's recording window (see
// RecordDeckAudio): a word or example sentence said in a female or male
// voice, already trimmed and encoded in the browser. Uploaded to bunny.net
// and set on the word or example, replacing any recording it had (whose
// file is deleted from bunny.net — see deleteUnusedAudio). A route handler rather
// than a server action, so the window's uploads run in the background
// without holding up anything else on the page.
export async function POST(request: NextRequest) {
  await connection();
  const profile = await getProfile();
  if (profile?.role !== "admin") return Response.json({ error: "Admins only." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const target = form?.get("target");
  const id = form?.get("id");
  const voice = form?.get("voice");
  const file = form?.get("file");
  if (
    (target !== "word" && target !== "example") ||
    typeof id !== "string" ||
    (voice !== "female" && voice !== "male") ||
    !(file instanceof File) ||
    file.size === 0
  ) {
    return Response.json({ error: "Missing recording." }, { status: 400 });
  }
  const mime = audioMime(file);
  if (!mime) return Response.json({ error: AUDIO_TYPE_ERROR }, { status: 400 });
  if (file.size > AUDIO_MAX_BYTES) return Response.json({ error: AUDIO_SIZE_ERROR }, { status: 400 });

  // Which deck page to refresh, and that the word or example still exists.
  const deck =
    target === "word"
      ? await prisma.word.findUnique({
          where: { id },
          select: { languageDeckId: true, languageDeck: { select: { course: { select: { slug: true } } } } },
        })
      : (
          await prisma.wordExample.findUnique({
            where: { id },
            select: {
              word: {
                select: { languageDeckId: true, languageDeck: { select: { course: { select: { slug: true } } } } },
              },
            },
          })
        )?.word;
  if (!deck) return Response.json({ error: "That word or sentence no longer exists." }, { status: 404 });

  const key = buildWordAudioKey(mime);
  try {
    await uploadImage(typedAudio(file, mime), key);
  } catch (error) {
    console.error("Bunny upload failed:", error);
    return Response.json({ error: "Upload failed." }, { status: 502 });
  }

  // The recording this replaces, if any, so its file can go once it's off
  // the word or sentence.
  const select = { audioFemaleKey: true, audioMaleKey: true } as const;
  const previous =
    target === "word"
      ? await prisma.word.findUnique({ where: { id }, select })
      : await prisma.wordExample.findUnique({ where: { id }, select });

  const data = { [COLUMN[voice]]: key };
  if (target === "word") await prisma.word.update({ where: { id }, data });
  else await prisma.wordExample.update({ where: { id }, data });
  await deleteUnusedAudio([previous?.[COLUMN[voice]]]);

  const slug = deck.languageDeck.course.slug;
  revalidatePath(`/dashboard/admin/courses/${slug}/categories/${deck.languageDeckId}`);
  revalidatePath(`/dashboard/courses/${slug}/decks/${deck.languageDeckId}`);
  return Response.json({ url: imageUrl(key) });
}
