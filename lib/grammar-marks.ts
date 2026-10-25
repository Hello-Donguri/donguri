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

// Whether the text has any grammar marks at all.
export function hasGrammarMarks(text: string): boolean {
  return /&&&[^&]+?&&&|\$\$[^$]+?\$\$/.test(text);
}

export type GrammarSegment = { text: string; kind: "key" | "slot" | "plain" };

// A grammar example split the way the learn card draws it, like the
// pattern chart: "key" for what the pattern itself says ("&&&" parts, and
// the "**" highlight — 私 in 私は…), "slot" for the word it wraps around
// ("$$" parts), "plain" for the rest. The highlight is only picked out
// when it isn't already one of the "&&&" parts.
export function grammarSegments(text: string, highlight: string | null): GrammarSegment[] {
  const segments: GrammarSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(/&&&([^&]+?)&&&|\$\$([^$]+?)\$\$/g)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), kind: "plain" });
    segments.push(match[1] !== undefined ? { text: match[1], kind: "key" } : { text: match[2], kind: "slot" });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), kind: "plain" });

  const clean = segments.map((segment) => ({
    ...segment,
    text: segment.text.replaceAll("&&&", "").replaceAll("$$", ""),
  }));
  const wanted = highlight?.trim();
  if (!wanted || clean.some((segment) => segment.kind === "key" && segment.text.trim() === wanted)) {
    return clean;
  }

  // The highlight's first appearance in the plain text becomes a key part.
  const index = clean.findIndex((segment) => segment.kind === "plain" && segment.text.includes(wanted));
  if (index === -1) return clean;
  const { text: plain } = clean[index];
  const at = plain.indexOf(wanted);
  const pieces: GrammarSegment[] = [
    { text: plain.slice(0, at), kind: "plain" as const },
    { text: wanted, kind: "key" as const },
    { text: plain.slice(at + wanted.length), kind: "plain" as const },
  ].filter((piece) => piece.text !== "");
  return [...clean.slice(0, index), ...pieces, ...clean.slice(index + 1)];
}
