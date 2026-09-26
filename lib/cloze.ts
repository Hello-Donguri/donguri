// Shared by the quiz generator (lib/dal.ts) and the admin quiz-questions
// preview (also lib/dal.ts, for the admin page) — cross-references a word's
// forms against its example sentences with no admin tagging required, and
// blanks out whichever form's value an example literally contains as a
// whole word. Because the match is verified against the actual sentence
// text, there's no risk of asking the learner to fill in a form the
// sentence doesn't really demonstrate.

import { isLatinTypeable } from "@/lib/language";

// `sentence` is the target-language example with the answer blanked out,
// `translation` the same example in the learner's own language, shown
// underneath as context. Which of an example's `en`/`ja` is which depends
// on the course (see exampleSides). `romanization` is the sentence's
// romanization with the answer's syllables blanked the same way — null
// when the example has none or it can't be lined up (see
// blankRomanization).
export type ClozeMatch = {
  formId: string | null;
  sentence: string;
  translation: string;
  romanization: string | null;
};

type Example = { en: string; ja: string; romanization?: string | null };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// `en` is always an example's English sentence and `ja` the other
// language's — the target sentence for an English course, the translation
// for any other (e.g. Cantonese for English speakers).
function exampleSides(example: Example, targetLanguage: string) {
  return targetLanguage === "en"
    ? { target: example.en, translation: example.ja }
    : { target: example.ja, translation: example.en };
}

// Blanks `value` out of `sentence`, or null if it isn't there. Latin text
// matches whole words only, case-insensitively — so a form value like "you"
// doesn't match inside "yourself", and "Went" still matches "went". Other
// scripts (Chinese, Japanese) don't put spaces between words, so there it's
// a plain substring match.
function blankOut(sentence: string, value: string): string | null {
  const pattern = isLatinTypeable(value)
    ? new RegExp(`\\b${escapeRegExp(value)}\\b`, "i")
    : new RegExp(escapeRegExp(value));
  return pattern.test(sentence) ? sentence.replace(pattern, "___") : null;
}

const HAN = /\p{Script=Han}/u;
const SYLLABLE = /[a-z]+[1-6]/gi;
const countHan = (text: string) => [...text].filter((char) => HAN.test(char)).length;

// Which syllables of a Jyutping-style romanization spell `value` inside
// `target` (我係老師 / ngo5 hai6 lou5 si1 → 係 is syllable 1, one long).
// Relies on one numbered syllable per Chinese character; null when the
// value isn't there or the counts don't line up, rather than guess.
export function syllableRange(
  target: string,
  value: string,
  romanization: string,
): { first: number; length: number } | null {
  const start = target.indexOf(value);
  const length = countHan(value);
  const syllableCount = romanization.match(SYLLABLE)?.length ?? 0;
  if (start === -1 || length === 0 || syllableCount !== countHan(target)) return null;
  return { first: countHan(target.slice(0, start)), length };
}

// Every place `value` appears in `target`, as syllable ranges — for
// highlighting a word each time an example sentence uses it. Empty when the
// romanization can't be lined up (see syllableRange).
export function syllableRanges(
  target: string,
  value: string,
  romanization: string,
): { first: number; length: number }[] {
  if (!syllableRange(target, value, romanization)) return [];

  const length = countHan(value);
  const ranges: { first: number; length: number }[] = [];
  for (
    let start = target.indexOf(value);
    start !== -1;
    start = target.indexOf(value, start + value.length)
  ) {
    ranges.push({ first: countHan(target.slice(0, start)), length });
  }
  return ranges;
}

// Blanks the answer's syllables out of the romanization ("ngo5 hai2 uk1
// kei2." → "ngo5 ___ uk1 kei2."), so it can sit under the cloze without
// giving the answer away. Null (and so not shown) when it can't be lined
// up — see syllableRange.
function blankRomanization(target: string, value: string, romanization: string): string | null {
  const range = syllableRange(target, value, romanization);
  if (!range) return null;

  let index = 0;
  return romanization
    .replace(SYLLABLE, (syllable) => {
      const position = index++;
      if (position === range.first) return "___";
      return position > range.first && position < range.first + range.length
        ? "\u0000"
        : syllable;
    })
    .replace(/\s*\u0000/g, "");
}

// A form's own romanization ("hai2" for 喺), read off the first example
// whose romanization lines up with it (see syllableRange). Null for English
// courses, or when no example can supply it.
export function romanizeFromExamples(
  value: string,
  examples: Example[],
  targetLanguage: string,
): string | null {
  if (targetLanguage === "en") return null;

  for (const example of examples) {
    if (!example.romanization) continue;
    const range = syllableRange(example.ja, value, example.romanization);
    if (!range) continue;
    const syllables = example.romanization.match(SYLLABLE) ?? [];
    return syllables.slice(range.first, range.first + range.length).join(" ").toLowerCase();
  }

  return null;
}

// One example as a cloze on `value`, or null if the value isn't in it.
function buildMatch(
  example: Example,
  value: string,
  formId: string | null,
  targetLanguage: string,
): ClozeMatch | null {
  const { target, translation } = exampleSides(example, targetLanguage);
  const sentence = blankOut(target, value);
  if (sentence === null) return null;

  const romanization =
    targetLanguage !== "en" && example.romanization
      ? blankRomanization(target, value, example.romanization)
      : null;
  return { formId, sentence, translation, romanization };
}

// Grouped by form (not a flat list) so a random pick can treat every
// qualifying form as equally likely, regardless of how many example
// sentences happen to demonstrate it — a word's own examples often lean
// heavily on its base form (e.g. "hot" appearing far more than "hottest"),
// and picking uniformly across the flat list would drown out the rarer
// forms.
export function findClozeMatchesByForm(
  forms: { id: string; value: string }[],
  examples: Example[],
  targetLanguage: string,
): Map<string, ClozeMatch[]> {
  const byForm = new Map<string, ClozeMatch[]>();

  for (const form of forms) {
    const matches: ClozeMatch[] = [];

    for (const example of examples) {
      const match = buildMatch(example, form.value, form.id, targetLanguage);
      if (match) matches.push(match);
    }

    if (matches.length > 0) {
      byForm.set(form.id, matches);
    }
  }

  return byForm;
}

// Fallback for words with no form matches: blanks the word's own term out
// of whichever examples contain it (e.g. "I have ___ pencils" for "four").
// `formId: null` marks the answer as the term itself (see submitFormAnswer).
export function findTermClozeMatches(
  term: string,
  examples: Example[],
  targetLanguage: string,
): ClozeMatch[] {
  return examples.flatMap((example) => buildMatch(example, term, null, targetLanguage) ?? []);
}

// Two-stage pick — a random form, then a random example for it — so every
// qualifying form gets an equal shot regardless of example count.
export function pickRandomClozeMatch(byForm: Map<string, ClozeMatch[]>): ClozeMatch | undefined {
  const formIds = [...byForm.keys()];
  if (formIds.length === 0) return undefined;

  const formId = formIds[Math.floor(Math.random() * formIds.length)];
  const candidates = byForm.get(formId)!;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
