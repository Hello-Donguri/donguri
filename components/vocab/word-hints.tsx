"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb, X } from "lucide-react";
import { Jyutping } from "@/components/vocab/jyutping";
import { useTranslations } from "@/components/i18n/locale-provider";
import type { HintTurn, HintWord } from "@/lib/daily-challenge-hints";

// How long a learner has to stop typing before hints are offered.
const PAUSE_MS = 10_000;
const STORAGE_KEY = "donguri:word-hints";

// Whether word hints are on — a per-browser preference, on unless turned
// off. Storage can be unavailable (private windows, blocked site data), so
// every read and write is guarded and the default stands in.
export function useWordHintsSetting(): [boolean, (on: boolean) => void] {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after mount, so the server render and first client render agree.
      if (localStorage.getItem(STORAGE_KEY) === "off") setEnabled(false);
    } catch {}
  }, []);

  const update = (on: boolean) => {
    setEnabled(on);
    try {
      localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    } catch {}
  };

  return [enabled, update];
}

// The switch for word hints, in the chat header.
export function WordHintsToggle({ enabled, onChange }: { enabled: boolean; onChange: (on: boolean) => void }) {
  const t = useTranslations();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      title={t("word_hints.toggle_hint", "Suggest words that could come next when you pause while typing")}
      className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-full px-2 py-1 text-xs font-medium text-sumi-soft transition hover:bg-sumi/5 hover:text-sumi"
    >
      <Lightbulb aria-hidden className={`h-4 w-4 ${enabled ? "fill-kin/30 text-kin" : ""}`} />
      <span className="hidden sm:inline">{t("word_hints.toggle", "Word hints")}</span>
      <span
        aria-hidden
        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${enabled ? "bg-matcha" : "bg-sumi/25"}`}
      >
        <span
          className={`inline-block h-3 w-3 rounded-full bg-washi shadow transition-transform ${enabled ? "translate-x-3.5" : "translate-x-0.5"}`}
        />
      </span>
    </button>
  );
}

const HAN = /\p{Script=Han}/u;

// A piece of text as the words in it the learner has finished typing:
// every Chinese character, and every Jyutping syllable (or English word)
// that has its tone number or a space after it. Lowercased, tones dropped,
// punctuation ignored — "gam1 go3 sin" → ["gam", "go"].
function finishedUnits(text: string): string[] {
  const tokens = [...text.matchAll(/\p{Script=Han}|[a-z]+[1-6]?/giu)];
  return tokens.flatMap((match, index) => {
    const token = match[0];
    if (HAN.test(token)) return [token];
    const isLast = index === tokens.length - 1;
    const finished = /[1-6]$/.test(token) || !isLast || /\s$/.test(text);
    return finished ? [token.toLowerCase().replace(/[1-6]/g, "")] : [];
  });
}

// A hint word as units, both ways it can be typed: its characters, and its
// Jyutping syllables.
function hintForms(word: HintWord): string[][] {
  const forms = [[...word.text].filter((char) => HAN.test(char))];
  if (word.romanization) forms.push(finishedUnits(`${word.romanization} `));
  return forms.filter((form) => form.length > 0);
}

// Whether the hints should go: once the learner has finished typing one
// new word since they appeared — unless what they've typed so far is the
// start of one of the hints (right or wrong), in which case they stay until
// that whole hint is typed, however many words it is (今個星期 is four).
function hintsUsedUp(base: string, draft: string, words: HintWord[]): boolean {
  let common = 0;
  while (common < base.length && common < draft.length && base[common] === draft[common]) common++;
  const typed = finishedUnits(draft.slice(common));
  if (typed.length === 0) return false;

  const midHint = words.some((word) =>
    hintForms(word).some(
      (form) => typed.length < form.length && typed.every((unit, index) => unit === form[index]),
    ),
  );
  return !midHint;
}

// When the learner stops typing mid-reply for PAUSE_MS, up to four words
// that would help them carry on appear above the reply box — ones they've
// learnt first, then simple everyday words if too few of those fit (see
// dailyChallengeHints). A gentle reminder rather than the answer: no
// meanings, and nothing to tap — they type it themselves.
// They go once the learner has typed another word — or, partway through
// typing one of the hints, once that whole hint is in (see hintsUsedUp) —
// or when the reply is sent or emptied, or they're dismissed.
export function WordHints({
  courseSlug,
  turns,
  draft,
  active,
}: {
  courseSlug: string;
  turns: HintTurn[];
  draft: string;
  // Hints on, and the learner is free to type (Charles isn't replying and
  // the chat isn't over).
  active: boolean;
}) {
  const t = useTranslations();
  // Tied to the turn they were asked on, so they never carry over to
  // Charles's next message.
  // `base` is the reply as it was when they appeared, to tell what's been
  // typed since (see hintsUsedUp).
  const [hints, setHints] = useState<{
    turn: number;
    base: string;
    words: HintWord[];
    dismissed: boolean;
  } | null>(null);

  const shown =
    active &&
    hints !== null &&
    !hints.dismissed &&
    hints.turn === turns.length &&
    draft.trim() !== "" &&
    !hintsUsedUp(hints.base, draft, hints.words)
      ? hints.words
      : null;

  // Restarts on every change to the draft; only asks once per pause, and
  // not while hints are already up.
  useEffect(() => {
    if (!active || !draft.trim() || shown) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch("/api/daily-challenge/hints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseSlug, turns, draft }),
        signal: controller.signal,
        priority: "low",
      })
        .then((response) => (response.ok ? response.json() : { words: [] }))
        .then((result: { words?: HintWord[] }) => {
          if (result.words && result.words.length > 0) {
            setHints({ turn: turns.length, base: draft, words: result.words, dismissed: false });
          }
        })
        .catch(() => {});
    }, PAUSE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `turns` is left out on purpose: it's a fresh array each render, and
    // the chat only changes alongside the draft being cleared anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, courseSlug, draft, Boolean(shown)]);

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="border-t border-card-border/70 bg-kin/10 px-3 py-2.5"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-sumi-soft">
              <Lightbulb aria-hidden className="h-3.5 w-3.5 fill-kin/30 text-kin" />
              {t("word_hints.title", "Stuck? Maybe one of these…")}
            </p>
            <button
              type="button"
              onClick={() => setHints((current) => current && { ...current, dismissed: true })}
              aria-label={t("common.close", "Close")}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-sumi-soft transition hover:bg-sumi/10 hover:text-sumi"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {shown.map((word) => (
              <li
                key={word.text}
                className="rounded-xl border border-card-border bg-washi px-3 py-1.5 text-sm font-semibold text-sumi shadow-sm"
              >
                {word.text}
                {word.romanization && (
                  <span className="ml-1.5 text-xs font-normal">
                    <Jyutping text={word.romanization} explain={false} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
