"use client";

import { useState, useTransition } from "react";
import { BookOpen, Flag, Search, X } from "lucide-react";
import type { FlaggedWord, LearntWord } from "@/lib/definitions";
import type { StageLevel } from "@/lib/srs";
import { LEVEL_STYLE } from "@/components/vocab/level-style";
import { setWordFlag } from "@/lib/actions/vocab";
import { useTranslations } from "@/components/i18n/locale-provider";
import { LessonButton } from "@/components/vocab/word-lesson";
import { Jyutping } from "@/components/vocab/jyutping";
import { cn } from "@/lib/utils";

// Past this many words, a search box helps find one.
const SEARCH_FROM = 9;

// Each review stage's name in the learner's language ("Seed 2", "タネ 2"),
// and the level it belongs to — stages 1-8, in order.
export type StageLabel = { name: string; level: StageLevel };

type WordListProps = { courseSlug: string; stages: StageLabel[] } & (
  | { mode: "flagged"; words: FlaggedWord[] }
  | { mode: "learnt"; words: LearntWord[] }
);



// A course's flagged lessons, or every word learnt in it — one card per
// word, opening its lesson in the same dialog as the review's "See the
// lesson". Flagged: each can be unflagged once it's sunk in, and goes
// straight away. Learnt: each shows its review stage and can be flagged or
// unflagged. Either way the change shows at once and is put back if saving
// fails.
export function WordList(props: WordListProps) {
  const { courseSlug, mode } = props;
  const t = useTranslations();
  const [query, setQuery] = useState("");
  // Flag changes made here, by word id, over what the page loaded with.
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  const isFlagged = (word: FlaggedWord | LearntWord) =>
    flags[word.id] ?? (mode === "flagged" ? true : (word as LearntWord).flagged);

  const setFlag = (wordId: string, flagged: boolean) => {
    setFlags((current) => ({ ...current, [wordId]: flagged }));
    startTransition(async () => {
      try {
        await setWordFlag(courseSlug, wordId, flagged);
      } catch {
        setFlags((current) => ({ ...current, [wordId]: !flagged }));
      }
    });
  };

  const needle = query.trim().toLowerCase();
  const words = (props.words as (FlaggedWord | LearntWord)[])
    // On the flagged list, unflagging takes it off.
    .filter((word) => mode !== "flagged" || isFlagged(word))
    .filter(
      (word) =>
        !needle ||
        word.term.toLowerCase().includes(needle) ||
        word.translation.toLowerCase().includes(needle) ||
        (word.romanization?.toLowerCase().includes(needle) ?? false),
    );

  const empty = props.words.length === 0 || (mode === "flagged" && !props.words.some(isFlagged));

  if (empty) {
    return (
      <p className="rounded-3xl border border-dashed border-card-border bg-washi-soft px-6 py-12 text-center text-sm text-sumi-soft">
        {mode === "flagged"
          ? t(
              "word_list.flagged_empty",
              "Nothing flagged yet. During a review, tap \"Flag for later\" on any word you'd like to come back to.",
            )
          : t("word_list.learnt_empty", "You haven't learnt any words in this course yet.")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {props.words.length >= SEARCH_FROM && (
        <label className="relative block max-w-sm">
          <span className="sr-only">{t("word_list.search", "Search your words")}</span>
          <Search aria-hidden className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-sumi-soft" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("word_list.search", "Search your words")}
            className="h-11 w-full rounded-full border border-card-border bg-raised pr-4 pl-10 text-sm text-sumi outline-none transition focus:border-ai/50 focus:ring-4 focus:ring-ai/10"
          />
        </label>
      )}

      {words.length === 0 ? (
        <p className="py-8 text-center text-sm text-sumi-soft">
          {t("word_list.no_match", "No words match \"{{query}}\".", { query: query.trim() })}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {words.map((word) => {
            const flagged = isFlagged(word);
            const stage = props.stages[Math.min(Math.max(word.stage, 1), props.stages.length) - 1];
            const level = LEVEL_STYLE[stage.level];
            return (
              <li
                key={word.id}
                className={cn(
                  "flex items-stretch overflow-hidden rounded-2xl border bg-raised shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                  word.path === "grammar" ? "border-matcha/30" : "border-ai/25",
                )}
              >
                <LessonButton
                  courseSlug={courseSlug}
                  wordId={word.id}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 p-3.5 text-left"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      word.path === "grammar" ? "bg-matcha-soft text-matcha-dark" : "bg-ai-soft text-ai-dark",
                    )}
                  >
                    <BookOpen aria-hidden className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-nunito text-base font-extrabold leading-tight text-sumi">
                      {word.term}
                    </span>
                    {word.romanization && (
                      <span className="block truncate text-xs text-sumi-soft">
                        {/* No tone-help button: the card is already a button,
                            and a button can't sit inside another. */}
                        <Jyutping text={word.romanization} explain={false} />
                      </span>
                    )}
                    <span className="block truncate text-xs text-sumi-soft">{word.translation}</span>
                    {/* Its review level — Seed 1 up to Master Oak. */}
                    <span
                      className={cn(
                        "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                        level.pill,
                      )}
                    >
                      <level.icon aria-hidden className="h-3 w-3" strokeWidth={2.5} />
                      {stage.name}
                    </span>
                  </span>
                </LessonButton>

                {mode === "flagged" ? (
                  <button
                    type="button"
                    onClick={() => setFlag(word.id, false)}
                    aria-label={t("flag.unflag", "Remove flag from {{term}}", { term: word.term })}
                    title={t("flag.unflag_short", "Remove flag")}
                    className="flex w-11 shrink-0 cursor-pointer items-center justify-center border-l border-card-border text-sumi-soft transition hover:bg-shu/10 hover:text-shu"
                  >
                    <X aria-hidden className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFlag(word.id, !flagged)}
                    aria-pressed={flagged}
                    aria-label={
                      flagged
                        ? t("flag.unflag", "Remove flag from {{term}}", { term: word.term })
                        : t("flag.flag_term", "Flag {{term}} for later", { term: word.term })
                    }
                    title={flagged ? t("flag.unflag_short", "Remove flag") : t("flag.flag", "Flag for later")}
                    className={cn(
                      "flex w-11 shrink-0 cursor-pointer items-center justify-center border-l border-card-border transition",
                      flagged ? "bg-shu/10 text-shu hover:bg-shu/15" : "text-sumi-soft hover:bg-sumi/5 hover:text-sumi",
                    )}
                  >
                    <Flag aria-hidden className={cn("h-4 w-4", flagged && "fill-current")} strokeWidth={2.25} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
