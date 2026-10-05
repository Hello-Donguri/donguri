// Finds where a word appears in its own example sentences so the learn card
// can bold it. Best-effort, with no admin tagging: candidates come from the
// word's term, its forms and its translation, and each sentence only tries
// the ones in its own script — Latin candidates against the English line
// (whole word, case-insensitive, so "you" doesn't light up "yourself"),
// Japanese ones against the Japanese line (plain substring, since Japanese
// has no word boundaries). Works in either course direction: whichever of
// term/translation is Japanese ends up matching the Japanese sentence.

export type HighlightSegment = { text: string; match: boolean };

const JAPANESE = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;
const KANJI = /[㐀-鿿]/;
const HIRAGANA_ENDING = /[぀-ゟ]$/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "2 ・ 二（に）" → ["2", "二"]: readings in brackets are dropped (a lone
// "に" would light up every particle), and 〜 placeholders are stripped.
function splitCandidates(value: string): string[] {
  return value
    .replace(/[（(][^）)]*[）)]/g, " ")
    .split(/[・•,，、;；/／\n]+/)
    .map((part) => part.replace(/[〜~]/g, "").trim())
    .filter(Boolean);
}

// Japanese verbs/adjectives conjugate on their last kana (食べる → 食べました,
// 高い → 高かった), so if the dictionary form isn't in the sentence, try
// its stem — as long as that still says something (a kanji, or 2+ kana).
function japaneseStem(value: string): string | null {
  if (!HIRAGANA_ENDING.test(value) || value.length < 2) return null;
  const stem = value.slice(0, -1);
  return KANJI.test(stem) || stem.length >= 2 ? stem : null;
}

function segment(text: string, pattern: RegExp): HighlightSegment[] {
  // A single capture group makes split() alternate text / match / text…
  return text
    .split(pattern)
    .map((part, index) => ({ text: part, match: index % 2 === 1 }))
    .filter((part) => part.text.length > 0);
}

const byLengthDesc = (a: string, b: string) => b.length - a.length;

export function highlightEnglish(text: string, candidates: string[]): HighlightSegment[] {
  const terms = [...new Set(candidates.flatMap(splitCandidates))]
    .filter((term) => /[a-z0-9]/i.test(term) && !JAPANESE.test(term))
    .sort(byLengthDesc);

  if (terms.length === 0) return [{ text, match: false }];

  // Word edges by lookaround rather than `\b`, which only knows ASCII
  // letters — so accented Latin words (French "taillé") still match.
  return segment(
    text,
    new RegExp(`(?<![\\p{L}\\p{N}_])(${terms.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}_])`, "giu"),
  );
}

export function highlightJapanese(text: string, candidates: string[]): HighlightSegment[] {
  const terms = [...new Set(candidates.flatMap(splitCandidates))].filter(
    (term) => JAPANESE.test(term) && (term.length >= 2 || KANJI.test(term)),
  );

  const present = terms.filter((term) => text.includes(term));
  const matched =
    present.length > 0
      ? present
      : terms
          .map(japaneseStem)
          .filter((stem): stem is string => stem !== null && text.includes(stem));

  if (matched.length === 0) return [{ text, match: false }];

  return segment(text, new RegExp(`(${[...new Set(matched)].sort(byLengthDesc).map(escapeRegExp).join("|")})`, "g"));
}

// The part of a sentence an admin marked as the word (see
// WordExample.enHighlight) — every place it appears. Null when nothing is
// marked or the mark isn't in the sentence (e.g. edited since), so the
// caller can fall back to the automatic highlightEnglish/highlightJapanese.
export function highlightMarked(text: string, highlight: string | null): HighlightSegment[] | null {
  if (!highlight || !text.includes(highlight)) return null;
  return segment(text, new RegExp(`(${escapeRegExp(highlight)})`, "g"));
}
