// "Do you **know** where it is?" / "Do you *know* where it is?" — asterisks
// typed into an example sentence to mark the part to highlight as the word
// (see WordExample.enHighlight/jaHighlight). Pulled out into the clean
// sentence plus that highlight, so the asterisks are never shown. Only a
// pair hugging its text counts (as in Markdown), so a lone "*" or "2 * 3 * 4"
// is left as is.
const STAR_PAIR = /\*\*(?!\s)([^*]+?)(?<!\s)\*\*|\*(?!\s)([^*]+?)(?<!\s)\*/;
const STAR_PAIRS = new RegExp(STAR_PAIR.source, "g");

export type StarMarkedSentence = { text: string; highlight: string | null };

export function extractStarMark(sentence: string): StarMarkedSentence {
  const match = sentence.match(STAR_PAIR);
  if (!match) return { text: sentence, highlight: null };

  const text = sentence.replace(STAR_PAIRS, (_, double, single) => double ?? single);
  const highlight = (match[1] ?? match[2]).trim();

  return { text, highlight: highlight && highlight !== text.trim() ? highlight : null };
}

// Stored highlight wins; otherwise one marked with asterisks in the sentence.
export function withStarMark(
  sentence: string,
  highlight: string | null | undefined,
): StarMarkedSentence {
  const marked = extractStarMark(sentence);
  return { text: marked.text, highlight: highlight || marked.highlight };
}
