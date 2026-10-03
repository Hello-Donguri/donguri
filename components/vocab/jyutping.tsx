"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useTranslations } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

// Cantonese tones as Chao pitch contours (5 = highest, 1 = lowest): where
// each tone starts and ends. Drives both the per-word contour chart and
// the tone picker, so the two always draw the same shapes.
export const TONES = [
  { tone: 1, contour: [5, 5] },
  { tone: 2, contour: [2, 5] },
  { tone: 3, contour: [3, 3] },
  { tone: 4, contour: [2, 1] },
  { tone: 5, contour: [2, 3] },
  { tone: 6, contour: [2, 2] },
] as const;

type Tone = (typeof TONES)[number]["tone"];

// Full class names (not built from the number) so Tailwind picks them up.
const TONE_TEXT: Record<Tone, string> = {
  1: "text-tone-1",
  2: "text-tone-2",
  3: "text-tone-3",
  4: "text-tone-4",
  5: "text-tone-5",
  6: "text-tone-6",
};
const TONE_STROKE: Record<Tone, string> = {
  1: "stroke-tone-1",
  2: "stroke-tone-2",
  3: "stroke-tone-3",
  4: "stroke-tone-4",
  5: "stroke-tone-5",
  6: "stroke-tone-6",
};
const TONE_BG: Record<Tone, string> = {
  1: "bg-tone-1",
  2: "bg-tone-2",
  3: "bg-tone-3",
  4: "bg-tone-4",
  5: "bg-tone-5",
  6: "bg-tone-6",
};

// A Jyutping syllable: letters then a tone digit ("keoi5"). Anything else
// — punctuation, "___" blanks, a grammar note like "(no 係 needed)" — is
// passed through untouched, so this is safe on any romanization string.
const SYLLABLE = /([a-z]+)([1-6])(?![0-9])/gi;

type Segment = { text: string; tone: Tone | null };

function parseJyutping(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(SYLLABLE)) {
    if (match.index > last)
      segments.push({ text: text.slice(last, match.index), tone: null });
    segments.push({ text: match[0], tone: Number(match[2]) as Tone });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), tone: null });
  return segments;
}

export function jyutpingTones(text: string): Tone[] {
  return parseJyutping(text).flatMap((segment) =>
    segment.tone ? [segment.tone] : [],
  );
}

export type SyllableRange = { first: number; length: number };

// Each syllable in its tone's colour, with its pitch contour drawn small
// underneath (see SyllableContour) — so the tones read the same in a single
// word and in a whole sentence. `explain` adds the "?" that says what the
// numbers, colours and lines mean (see ToneHelp); turn it off where it would
// repeat (each piece of a longer line) or sit inside a button. `highlight`
// picks out syllables by position (see syllableRange in lib/cloze.ts) —
// e.g. the word being taught, inside an example sentence — keeping their
// tone colour.
export const Jyutping = ({
  text,
  explain = true,
  highlight = [],
}: {
  text: string;
  explain?: boolean;
  highlight?: SyllableRange[];
}) => {
  const segments = parseJyutping(text);
  const hasTones = segments.some((segment) => segment.tone);
  const isHighlighted = (position: number) =>
    highlight.some(
      ({ first, length }) => position >= first && position < first + length,
    );

  // Which segments are emphasised: each highlighted syllable, plus the
  // spacing between two of them, so a word of several syllables sits in one
  // box rather than a box per syllable.
  let syllable = 0;
  const marked = segments.map((segment) => (segment.tone ? isHighlighted(syllable++) : false));
  const inBox = marked.map((isMarked, index) => {
    if (isMarked) return true;
    if (segments[index].tone) return false;
    const before = marked.slice(0, index).lastIndexOf(true);
    const after = marked.indexOf(true, index + 1);
    const tonedBetween = (from: number, to: number) => segments.slice(from + 1, to).some((part) => part.tone);
    return before !== -1 && after !== -1 && !tonedBetween(before, index) && !tonedBetween(index, after);
  });

  const renderSegment = (segment: Segment, index: number) =>
    segment.tone ? (
      <span key={index} className="inline-flex flex-col items-center align-baseline">
        <span className={`${TONE_TEXT[segment.tone]} ${marked[index] ? "font-bold" : "font-medium"}`}>
          {segment.text}
        </span>
        <SyllableContour tone={segment.tone} />
      </span>
    ) : (
      <span key={index}>{segment.text}</span>
    );

  // Runs of boxed segments become one bordered span — the highlight,
  // instead of an underline (which doubled up with the tone contours).
  const parts: React.ReactNode[] = [];
  for (let index = 0; index < segments.length; index++) {
    if (!inBox[index]) {
      parts.push(renderSegment(segments[index], index));
      continue;
    }
    const start = index;
    while (index + 1 < segments.length && inBox[index + 1]) index++;
    parts.push(
      <span
        key={`box-${start}`}
        className="inline-block whitespace-pre rounded-md px-1 pb-0.5 ring-1 ring-sumi/30"
      >
        {segments.slice(start, index + 1).map((segment, offset) => renderSegment(segment, start + offset))}
      </span>,
    );
  }

  const coloured = <span>{parts}</span>;

  if (!explain || !hasTones) return coloured;

  return (
    <span>
      {coloured}
      <ToneHelp />
    </span>
  );
};

// One syllable's pitch, as a short line over faint top/middle/bottom guides
// — high level, rising, falling — sized to sit under the syllable.
const SyllableContour = ({ tone }: { tone: Tone }) => {
  const [from, to] = TONES[tone - 1].contour;
  const y = (level: number) => 9 - (level - 1) * 2;
  return (
    <svg aria-hidden viewBox="0 0 18 10" width={18} height={10} className="mt-0.5 shrink-0 overflow-visible">
      {[5, 3, 1].map((level) => (
        <line key={level} x1={0} x2={18} y1={y(level)} y2={y(level)} className="stroke-sumi/10" strokeWidth={1} />
      ))}
      <line
        x1={2}
        x2={16}
        y1={y(from)}
        y2={y(to)}
        className={TONE_STROKE[tone]}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  );
};

// The "?" beside Jyutping: what the tone numbers, colours and lines mean,
// with a key to all six. Click to toggle (works on touch), dismissed by
// clicking anywhere else; clicks don't reach the card or link around it.
export function ToneHelp() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useLayoutEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const names: Record<Tone, string> = {
    1: t("tone_help.tone_1", "high level"),
    2: t("tone_help.tone_2", "high rising"),
    3: t("tone_help.tone_3", "mid level"),
    4: t("tone_help.tone_4", "low falling"),
    5: t("tone_help.tone_5", "low rising"),
    6: t("tone_help.tone_6", "low level"),
  };

  return (
    <span ref={containerRef} className="relative ml-1.5 inline-block align-middle">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        aria-label={t("tone_help.aria_label", "What do the tone numbers mean?")}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-sumi/10 text-[10px] font-bold leading-none text-sumi-soft transition hover:bg-sumi/20 hover:text-sumi"
      >
        ?
      </button>

      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-1/2 top-full z-30 mt-2 block w-64 -translate-x-1/2 rounded-xl border border-sumi/10 bg-washi p-3 text-left text-xs font-normal leading-relaxed text-sumi normal-case shadow-lg"
        >
          <span className="block font-semibold">{t("tone_help.title", "Cantonese tones")}</span>
          <span className="mt-1 block text-sumi-soft">
            {t(
              "tone_help.body",
              "Cantonese has six tones, and changing the tone changes the word. The number after each syllable is its tone; the colour and the little line under it show how your voice moves.",
            )}
          </span>
          <span className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {TONES.map(({ tone }) => (
              <span key={tone} className="flex items-center gap-1.5">
                <SyllableContour tone={tone} />
                <span className={`font-semibold ${TONE_TEXT[tone]}`}>{tone}</span>
                <span className="text-sumi-soft">{names[tone]}</span>
              </span>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}

// Typed Jyutping with each toned syllable in its tone's colour, and
// nothing else changed — no weight or spacing, unlike Jyutping above — so
// it stays exactly as wide as the plain text in the input under it (see
// JyutpingInput). Syllables still missing a tone stay the normal colour.
// All in one inline span: laid out straight inside a flex box, each run of
// text would become its own flex item, and a run that's only a space (the
// gap between two coloured syllables) is dropped — shifting everything
// after it out of line with the input.
const ToneColouredText = ({ text }: { text: string }) => (
  <span className="shrink-0 whitespace-pre">
    {parseJyutping(text).map((segment, index) =>
      segment.tone ? (
        <span key={index} className={TONE_TEXT[segment.tone]}>
          {segment.text}
        </span>
      ) : (
        segment.text
      ),
    )}
  </span>
);

const LEVEL_Y = (level: number) => 16 - (level - 1) * 3.5;

// A small pitch chart: one contour per syllable, left to right, each in
// its tone's colour, over faint guides for the top, middle and bottom of
// the voice. `keoi5 dei6` draws a low rise, then a low level line.
export const ToneContour = ({
  tones,
  size = "sm",
}: {
  tones: Tone[];
  size?: "sm" | "md";
}) => {
  const t = useTranslations();
  const slot = 14;
  const gap = 5;
  const width = tones.length * slot + (tones.length - 1) * gap + 4;
  const scale = size === "md" ? 1.6 : 1;

  return (
    <svg
      role="img"
      aria-label={t("jyutping.tones_label", "Tones: {{tones}}", {
        tones: tones.join(", "),
      })}
      viewBox={`0 0 ${width} 20`}
      width={width * scale}
      height={20 * scale}
      className="shrink-0 overflow-visible"
    >
      {[5, 3, 1].map((level) => (
        <line
          key={level}
          x1={0}
          x2={width}
          y1={LEVEL_Y(level)}
          y2={LEVEL_Y(level)}
          className="stroke-sumi/10"
          strokeWidth={1}
        />
      ))}
      {tones.map((tone, index) => {
        const [from, to] = TONES[tone - 1].contour;
        const x = 2 + index * (slot + gap);
        return (
          <line
            key={index}
            x1={x}
            x2={x + slot}
            y1={LEVEL_Y(from)}
            y2={LEVEL_Y(to)}
            className={TONE_STROKE[tone]}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};

// The syllable just before the caret, if it still needs a tone ("keoi" in
// "nei5 keoi|"). Null once it ends in a digit, or when there's no syllable.
function tonelessSyllable(textBeforeCaret: string): string | null {
  return /[a-z]+$/i.exec(textBeforeCaret)?.[0] ?? null;
}

type JyutpingInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  maxLength?: number;
  autoFocus?: boolean;
  // The "press space…" line under the input.
  showHint?: boolean;
  // Where the tone chart opens — "above" for an input pinned to the bottom
  // of something, like the daily-challenge chat box.
  placement?: "above" | "below";
  // For callers that also need the input element (e.g. to focus it).
  inputRef?: (element: HTMLInputElement | null) => void;
};

// A text input for typing Jyutping answers. Every syllable needs a tone:
// pressing space (or Enter) straight after one without a tone opens a
// colour-coded tone chart below the input instead, and picking a tone —
// click, arrow keys + Enter, or its number — adds the digit. Typing the
// digit directly still works, so the chart never gets in the way of
// someone who already knows the tones. It also stays out of the way of a
// Chinese input method (which uses space to pick characters), and Escape
// dismisses it so the next space is an ordinary one — e.g. after an
// English word.
export const JyutpingInput = ({
  value,
  onChange,
  disabled,
  placeholder,
  className = "",
  id,
  name,
  maxLength,
  autoFocus = true,
  showHint = true,
  placement = "below",
  inputRef: onInputElement,
}: JyutpingInputProps) => {
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [plainSpaceNext, setPlainSpaceNext] = useState(false);
  const setRefs = (element: HTMLInputElement | null) => {
    inputRef.current = element;
    onInputElement?.(element);
  };
  const listId = useId();
  const [picker, setPicker] = useState<{
    syllable: string;
    addSpace: boolean;
  } | null>(null);
  const [active, setActive] = useState(0);

  const caret = () => inputRef.current?.selectionStart ?? value.length;

  // The coloured copy (see the overlay below) scrolls with the input once
  // the text is wider than the box.
  const overlayRef = useRef<HTMLDivElement>(null);
  const syncOverlayScroll = () => {
    if (overlayRef.current && inputRef.current) {
      overlayRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };
  useLayoutEffect(syncOverlayScroll);

  const openPicker = (addSpace: boolean) => {
    const syllable = tonelessSyllable(value.slice(0, caret()));
    if (!syllable) return false;
    setPicker({ syllable, addSpace });
    setActive(0);
    return true;
  };

  const choose = (tone: Tone) => {
    if (!picker) return;
    const at = caret();
    const insert = `${tone}${picker.addSpace ? " " : ""}`;
    onChange(value.slice(0, at) + insert + value.slice(at));
    setPicker(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(
        at + insert.length,
        at + insert.length,
      );
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Mid-composition in a Chinese input method: its keys, not ours.
    if (event.nativeEvent.isComposing || event.key === "Process") return;

    if (picker) {
      if (/^[1-6]$/.test(event.key)) {
        event.preventDefault();
        choose(Number(event.key) as Tone);
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setActive((current) => (current + 1) % TONES.length);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setActive((current) => (current + TONES.length - 1) % TONES.length);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose(TONES[active].tone);
      } else if (event.key === "Escape") {
        // Stop it reaching a surrounding <dialog>, which would close too.
        event.preventDefault();
        event.stopPropagation();
        setPicker(null);
        setPlainSpaceNext(true);
      } else {
        // Carry on typing (e.g. fixing the syllable) — the chart comes
        // back at the next space.
        setPicker(null);
      }
      return;
    }

    if (event.key === " " && plainSpaceNext) {
      setPlainSpaceNext(false);
    } else if (event.key === " " && openPicker(true)) {
      event.preventDefault();
    } else if (
      event.key === "Enter" &&
      caret() === value.length &&
      openPicker(false)
    ) {
      // The last syllable still needs a tone: pick it before submitting.
      event.preventDefault();
    }
  };

  const activeId = picker ? `${listId}-${TONES[active].tone}` : undefined;
  const toneNames: Record<Tone, string> = {
    1: t("jyutping.tone_1", "High level"),
    2: t("jyutping.tone_2", "High rising"),
    3: t("jyutping.tone_3", "Mid level"),
    4: t("jyutping.tone_4", "Low falling"),
    5: t("jyutping.tone_5", "Low rising"),
    6: t("jyutping.tone_6", "Low level"),
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={setRefs}
          id={id}
          name={name}
          maxLength={maxLength}
          type="text"
          role="combobox"
          aria-expanded={Boolean(picker)}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-autocomplete="none"
          value={value}
          onChange={(event) => {
            setPicker(null);
            setPlainSpaceNext(false);
            onChange(event.target.value);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setPicker(null)}
          onScroll={syncOverlayScroll}
          onSelect={syncOverlayScroll}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={placeholder}
          // The typed text itself is invisible — the tone-coloured copy on
          // top shows it — but the caret, selection and placeholder aren't.
          className={cn(
            className,
            "text-transparent! caret-sumi selection:bg-ai/25 selection:text-transparent placeholder:text-sumi-soft/70",
          )}
        />

        {/* Each syllable in its tone's colour as it's typed ("nei5" turns
          tone 5's colour once the digit's added). Drawn over the input with
          the same box, padding and font, so it lines up letter for letter;
          it ignores the pointer, so clicks and selection go to the input. */}
        <div
          ref={overlayRef}
          aria-hidden="true"
          className={cn(
            className,
            "pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre border-transparent! bg-transparent! shadow-none! ring-0! text-sumi",
            // Fades with the input when it's disabled.
            disabled && "opacity-60",
          )}
        >
          <ToneColouredText text={value} />
        </div>
      </div>

      {showHint && (
        <p className="mt-1.5 text-center text-xs text-sumi-soft">
          {t(
            "jyutping.hint",
            "Press space after each syllable to pick its tone, or type the number.",
          )}
        </p>
      )}

      {picker && (
        <div
          className={`absolute inset-x-0 z-20 rounded-2xl border border-card-border bg-washi p-3 shadow-xl ${
            placement === "above" ? "bottom-full mb-2" : "top-16"
          }`}
        >
          <p className="mb-2 text-center text-xs text-sumi-soft">
            {t("jyutping.pick_tone", "Which tone is “{{syllable}}”?", {
              syllable: picker.syllable,
            })}
          </p>
          <ul
            id={listId}
            role="listbox"
            className="grid grid-cols-3 gap-2 sm:grid-cols-6"
          >
            {TONES.map(({ tone }, index) => (
              <li
                key={tone}
                id={`${listId}-${tone}`}
                role="option"
                aria-selected={index === active}
                // mousedown, not click: keeps focus in the input, so the
                // blur handler doesn't close the chart first.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(tone);
                }}
                onMouseEnter={() => setActive(index)}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2 transition ${
                  index === active
                    ? "border-sumi/30 bg-washi-soft"
                    : "border-transparent hover:bg-washi-soft"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-washi ${TONE_BG[tone]}`}
                >
                  {tone}
                </span>
                <ToneContour tones={[tone]} size="md" />
                <span className={`text-sm font-semibold ${TONE_TEXT[tone]}`}>
                  {picker.syllable}
                  {tone}
                </span>
                <span className="text-[10px] leading-tight text-sumi-soft">
                  {toneNames[tone]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
