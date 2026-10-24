// Marks typed into a grammar example sentence (alongside "**" for the
// highlight — see lib/star-mark.ts):
//
//   &&&am&&&   a word the learner types in a review — each pair is its own
//              blank, so "&&&I&&& &&&am&&&" asks for two
//   $$tall$$   a secondary highlight, shown with a dotted underline (the
//              word the pattern wraps around, and its translation)
//
// Stored as typed and read here, so the marks are never shown.

const INPUT_PAIR = /&&&([^&]+?)&&&/g;
const HINT_PAIR = /\$\$([^$]+?)\$\$/g;

export const BLANK = "___";

// Whether the sentence has any blanks to type.
export function hasInputMarks(sentence: string): boolean {
  return new RegExp(INPUT_PAIR.source).test(sentence);
}

// What each blank asks for, in order.
export function inputAnswers(sentence: string): string[] {
  return [...sentence.matchAll(INPUT_PAIR)].map((match) => match[1].trim());
}

// The sentence with each blank as "___" (the question's prompt, keeping its
// "$$" hints for HintText to draw).
export function blankInputs(sentence: string): string {
  return sentence.replace(INPUT_PAIR, BLANK);
}

// The sentence with its blanks filled back in — for reading it out, or
// showing it on the learn card — keeping its "$$" hints.
export function fillInputs(sentence: string): string {
  return sentence.replace(INPUT_PAIR, "$1");
}

// The sentence with every mark gone, for reading out or comparing.
export function stripGrammarMarks(sentence: string): string {
  return fillInputs(sentence).replace(HINT_PAIR, "$1");
}

export type HintSegment = { text: string; hint: boolean };

// Splits text into plain runs and "$$" hints. A stray "$$" without its
// pair is dropped rather than shown.
export function hintSegments(text: string): HintSegment[] {
  const segments: HintSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(HINT_PAIR)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), hint: false });
    segments.push({ text: match[1], hint: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), hint: false });
  return segments.map((segment) => ({ ...segment, text: segment.text.replaceAll("$$", "") }));
}
