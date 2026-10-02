import "server-only";

import { cacheLife } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { WordGloss } from "@/lib/daily-challenge";

const HAN = /\p{Script=Han}/u;
const SYLLABLE = /[a-z]+[1-6]/gi;

const countHan = (text: string) => [...text].filter((char) => HAN.test(char)).length;

// Every multi-character Cantonese word in the courses with its Jyutping —
// the readings learners were taught — longest first, so a longer word wins
// over one inside it. Single characters are left out on purpose: many have
// more than one reading depending on the word around them (行 is haang4 in
// 行街 but hong4 in 銀行), so overriding them could make things worse.
export async function jyutpingDictionary(): Promise<[string, string][]> {
  "use cache";
  cacheLife("hours");

  const words = await prisma.word.findMany({
    where: {
      active: true,
      romanization: { not: null },
      languageDeck: { course: { targetLanguage: "yue" } },
    },
    select: { term: true, romanization: true },
    orderBy: { createdAt: "asc" },
  });

  const dictionary = new Map<string, string>();
  for (const { term, romanization } of words) {
    const text = term.trim();
    const reading = romanization!.trim().toLowerCase();
    // Whole words of characters only, whose reading lines up syllable for
    // character — not grammar patterns ("X 係 Y") or notes.
    if (dictionary.has(text) || [...text].some((char) => !HAN.test(char))) continue;
    if (countHan(text) < 2 || (reading.match(SYLLABLE)?.length ?? 0) !== countHan(text)) continue;
    dictionary.set(text, reading);
  }
  return [...dictionary].sort(([a], [b]) => b.length - a.length);
}

// The model writes Charles's Jyutping fresh each time, so a word can come
// out in different readings — 生日 as saang1 jat6 one time, sang1 jat6 the
// next. This puts every course word in `text` back to the reading the course
// teaches, syllable by syllable, leaving everything else (and the spacing
// and punctuation) as it was. Unchanged when the romanization doesn't line
// up one syllable per character, rather than guess.
export function standardiseJyutping(
  text: string,
  romanization: string,
  dictionary: [string, string][],
): string {
  const syllables = [...romanization.matchAll(SYLLABLE)];
  const hanCount = countHan(text);
  if (hanCount === 0 || syllables.length !== hanCount) return romanization;

  const replacements = new Map<number, string>();
  for (const [term, reading] of dictionary) {
    const readingSyllables = reading.match(SYLLABLE) ?? [];
    for (let start = text.indexOf(term); start !== -1; start = text.indexOf(term, start + term.length)) {
      const first = countHan(text.slice(0, start));
      const span = readingSyllables.map((_, offset) => first + offset);
      // A longer word already claimed some of these characters.
      if (span.some((index) => replacements.has(index))) continue;
      span.forEach((index, offset) => replacements.set(index, readingSyllables[offset]));
    }
  }
  if (replacements.size === 0) return romanization;

  let result = "";
  let cursor = 0;
  syllables.forEach((match, index) => {
    result += romanization.slice(cursor, match.index) + (replacements.get(index) ?? match[0]);
    cursor = match.index! + match[0].length;
  });
  return result + romanization.slice(cursor);
}

// The same, for a hover gloss's own reading.
export function standardiseGlosses(
  glosses: WordGloss[] | null,
  dictionary: [string, string][],
): WordGloss[] | null {
  return (
    glosses?.map((gloss) =>
      gloss.romanization
        ? { ...gloss, romanization: standardiseJyutping(gloss.text, gloss.romanization, dictionary) }
        : gloss,
    ) ?? null
  );
}
