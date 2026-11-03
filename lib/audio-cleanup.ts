import "server-only";

import { deleteFile } from "@/lib/bunny";
import { prisma } from "@/lib/prisma";

// Recordings that have just stopped being used — removed, replaced, or
// gone with a deleted word, sentence or deck — are deleted from bunny.net,
// so nothing's left there that nothing points at. Called after the
// database change, with the keys that were in use before it; each is only
// deleted once no word or example sentence uses it any more (a sentence
// saved again keeps its recording — see exampleRecordingKeeper — and the
// same file can be on more than one). Never throws: a file that can't be
// deleted is logged and left, and the change it followed stands.
export async function deleteUnusedAudio(keys: (string | null | undefined)[]): Promise<void> {
  // Only recordings (see buildWordAudioKey) — never a picture by mistake.
  const candidates = [...new Set(keys.filter((key): key is string => Boolean(key?.startsWith("audio/"))))];
  if (candidates.length === 0) return;

  const [words, examples] = await Promise.all([
    prisma.word.findMany({
      where: { OR: [{ audioFemaleKey: { in: candidates } }, { audioMaleKey: { in: candidates } }] },
      select: { audioFemaleKey: true, audioMaleKey: true },
    }),
    prisma.wordExample.findMany({
      where: { OR: [{ audioFemaleKey: { in: candidates } }, { audioMaleKey: { in: candidates } }] },
      select: { audioFemaleKey: true, audioMaleKey: true },
    }),
  ]);
  const inUse = new Set([...words, ...examples].flatMap((row) => [row.audioFemaleKey, row.audioMaleKey]));

  await Promise.all(
    candidates
      .filter((key) => !inUse.has(key))
      .map((key) =>
        deleteFile(key).catch((error) => console.error(`Couldn't delete ${key} from bunny.net:`, error)),
      ),
  );
}
