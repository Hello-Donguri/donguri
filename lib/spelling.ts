import type { SpellingPreference } from "@/lib/definitions";

// UK and US spelling (see section 65 of supabase/schema.sql). The content
// is written in UK spelling; a word whose US spelling differs carries it in
// `usSpelling`. A learner who prefers US spelling has it swapped in where
// the word is loaded for them — its term, its forms ("colours" becomes
// "colors") and its example sentences — so everything built from it
// (cloze blanks, multiple-choice options, the learn card) follows without
// knowing about spelling at all. Whichever they prefer, a typed answer in
// either spelling is accepted (see spellingVariants).

// The endings a form or a sentence's word can add to the term and still be
// that word: "colour" → "colours", "coloured", "colouring". Kept to the
// usual inflections so a short term doesn't rewrite an unrelated longer
// word ("mum" mustn't turn "mumble" into "momble").
const INFLECTIONS = "(s|es|d|ed|ing|er|ers|r|rs)?";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Keeps a capital first letter, for a word at the start of a sentence.
function matchCase(replacement: string, original: string): string {
  const first = original.charAt(0);
  return first !== first.toLowerCase()
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;
}

// `text` with every whole-word use of `uk` (and its inflections) spelt `us`
// instead. Text without it comes back unchanged.
export function toUsSpelling(text: string, uk: string, us: string): string {
  if (!uk.trim() || !us.trim() || uk === us) return text;
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${escapeRegExp(uk)})${INFLECTIONS}(?![\\p{L}\\p{N}])`, "giu");
  return text.replace(pattern, (_match, stem: string, ending: string | undefined) =>
    matchCase(us, stem) + (ending ?? ""),
  );
}

// Whether this learner sees the US spelling of words in this course: only
// where English is the language being learnt, since that's where `term` is
// the English word.
export function usesUsSpelling(
  preference: SpellingPreference | null,
  targetLanguage: string,
): boolean {
  return preference === "us" && targetLanguage === "en";
}

type SpellableWord = {
  term: string;
  usSpelling: string | null;
  exampleSentence?: string | null;
  forms?: { value: string }[];
  examples?: { en: string; enHighlight: string | null }[];
};

// The word as this learner should see it — unchanged unless they prefer US
// spelling and it has one. Everything else on the word is carried over.
export function withPreferredSpelling<W extends SpellableWord>(word: W, useUs: boolean): W {
  const us = word.usSpelling?.trim();
  if (!useUs || !us) return word;
  const swap = (text: string) => toUsSpelling(text, word.term, us);
  return {
    ...word,
    term: swap(word.term),
    ...(word.exampleSentence != null && { exampleSentence: swap(word.exampleSentence) }),
    ...(word.forms && { forms: word.forms.map((form) => ({ ...form, value: swap(form.value) })) }),
    ...(word.examples && {
      examples: word.examples.map((example) => ({
        ...example,
        en: swap(example.en),
        enHighlight: example.enHighlight === null ? null : swap(example.enHighlight),
      })),
    }),
  };
}

// Every spelling a typed answer may take for `text` (the term, or one of
// its forms): as written, and — when the word has a US spelling — that too.
// The first is the one shown back to the learner, in their preference.
export function spellingVariants(
  text: string,
  word: { term: string; usSpelling: string | null },
  useUs: boolean,
): string[] {
  const us = word.usSpelling?.trim();
  if (!us) return [text];
  const usText = toUsSpelling(text, word.term, us);
  if (usText === text) return [text];
  return useUs ? [usText, text] : [text, usText];
}
