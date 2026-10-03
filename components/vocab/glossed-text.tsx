"use client";

import { useId, type ReactNode } from "react";
import type { WordGloss } from "@/lib/daily-challenge";
import { Jyutping, ToneHelp } from "@/components/vocab/jyutping";

// Charles's message with each word hoverable (or tappable — the words are
// focusable) for its meaning, and its Jyutping for Cantonese. The glosses
// are matched against the message in order, so the text itself is always
// shown exactly as written; a gloss that can't be found is just skipped,
// and with no glosses at all it's the plain text.
export function GlossedText({ text, glosses }: { text: string; glosses: WordGloss[] | null | undefined }) {
  return (
    <>
      {glossParts(text, glosses, (gloss) => gloss.text, (word, gloss, key) => (
        <GlossWord key={key} tooltip={<GlossTooltip gloss={gloss} />}>
          {word}
        </GlossWord>
      ))}
    </>
  );
}

// The Jyutping line under Charles's Cantonese message, hoverable the same
// way: each word's syllables show its characters and meaning. Tone colours
// are kept throughout.
export function GlossedJyutping({
  romanization,
  glosses,
}: {
  romanization: string;
  glosses: WordGloss[] | null | undefined;
}) {
  return (
    <>
      {glossParts(
        romanization,
        glosses,
        (gloss) => gloss.romanization,
        (word, gloss, key) => (
          <GlossWord
            key={key}
            tooltip={
              <>
                <span className="font-medium">{gloss.text}</span>
                <span>{gloss.meaning}</span>
              </>
            }
          >
            <Jyutping text={word} explain={false} />
          </GlossWord>
        ),
        (plain, key) => <Jyutping key={key} text={plain} explain={false} />,
      )}
      <ToneHelp />
    </>
  );
}

// Walks `text` matching each gloss (by `key`, e.g. its characters or its
// Jyutping) in order from where the last one ended, wrapping matches and
// leaving everything between as-is — so the text is always shown exactly
// as written, and a gloss that can't be found is skipped.
function glossParts(
  text: string,
  glosses: WordGloss[] | null | undefined,
  key: (gloss: WordGloss) => string | null,
  wrap: (word: string, gloss: WordGloss, key: number) => ReactNode,
  plain: (text: string, key: string) => ReactNode = (value) => value,
): ReactNode[] {
  if (!glosses || glosses.length === 0) return [plain(text, "all")];

  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;

  glosses.forEach((gloss, index) => {
    const needle = key(gloss)?.toLowerCase();
    if (!needle) return;
    const at = lower.indexOf(needle, cursor);
    if (at === -1) return;
    if (at > cursor) parts.push(plain(text.slice(cursor, at), `plain-${index}`));
    parts.push(wrap(text.slice(at, at + needle.length), gloss, index));
    cursor = at + needle.length;
  });
  if (cursor < text.length) parts.push(plain(text.slice(cursor), "rest"));

  return parts;
}

function GlossTooltip({ gloss }: { gloss: WordGloss }) {
  return (
    <>
      {gloss.romanization && (
        <span className="font-medium">
          <Jyutping text={gloss.romanization} explain={false} />
        </span>
      )}
      <span>{gloss.meaning}</span>
    </>
  );
}

function GlossWord({
  tooltip,
  children,
}: {
  tooltip: ReactNode;
  children: ReactNode;
}) {
  const tooltipId = useId();

  return (
    <span
      tabIndex={0}
      aria-describedby={tooltipId}
      className="group relative cursor-help rounded underline decoration-sumi/25 decoration-dotted underline-offset-4 outline-none transition-colors hover:bg-ai-soft/70 focus-visible:bg-ai-soft/70"
    >
      {children}
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-1.5 flex -translate-x-1/2 flex-col items-center whitespace-nowrap rounded-lg border border-card-border bg-washi px-2.5 py-1.5 text-xs text-sumi opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100"
      >
        {tooltip}
      </span>
    </span>
  );
}
