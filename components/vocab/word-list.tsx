"use client";

import { useState, useTransition } from "react";
import { Flag, Search } from "lucide-react";
import type { FlaggedWord, LearntWord } from "@/lib/definitions";
import type { StageLevel } from "@/lib/srs";
import { LEVEL_STYLE } from "@/components/vocab/level-style";
import { setWordFlag } from "@/lib/actions/vocab";
import { useTranslations } from "@/components/i18n/locale-provider";
import { LessonButton } from "@/components/vocab/word-lesson";
import { Jyutping } from "@/components/vocab/jyutping";
import { cn } from "@/lib/utils";

// On the flagged list, past this many words a search box helps find one.
// The learnt list always has its toolbar.
const SEARCH_FROM = 9;

// One review stage as the word lists show it — see stageLabels in
// lib/srs.ts: "Sapling", step 1 of 2.
export type StageLabel = {
  name: string;
  level: StageLevel;
  levelName: string;
  step: number;
  steps: number;
};

type WordListProps = { courseSlug: string; stages: StageLabel[] } & (
  | { mode: "flagged"; words: FlaggedWord[] }
  // `levels`: Seed to Master Oak, named — the learnt list's filters.
  | { mode: "learnt"; words: LearntWord[]; levels: { level: StageLevel; name: string }[] }
);

type Filter = StageLevel | "all" | "flagged";

// A course's flagged lessons, or every word learnt in it — one card per
// word, opening its lesson in the same dialog as the review's "See the
// lesson". Each card has a small flag toggle in its corner; on the flagged
// list, unflagging takes the word off it. The learnt list has a toolbar:
// level and Flagged filters on the left, search on the right. Flag changes
// show at once and are put back if saving fails.
export function WordList(props: WordListProps) {
  const { courseSlug, mode } = props;
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
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

  const stageOf = (word: FlaggedWord | LearntWord) =>
    props.stages[Math.min(Math.max(word.stage, 1), props.stages.length) - 1];
  const matchesFilter = (word: FlaggedWord | LearntWord, option: Filter) =>
    option === "all" || (option === "flagged" ? isFlagged(word) : stageOf(word).level === option);

  const allWords = props.words as (FlaggedWord | LearntWord)[];
  const needle = query.trim().toLowerCase();
  const words = allWords
    // On the flagged list, unflagging takes it off.
    .filter((word) => mode !== "flagged" || isFlagged(word))
    .filter((word) => matchesFilter(word, filter))
    .filter(
      (word) =>
        !needle ||
        word.term.toLowerCase().includes(needle) ||
        word.translation.toLowerCase().includes(needle) ||
        (word.romanization?.toLowerCase().includes(needle) ?? false),
    );

  const empty = allWords.length === 0 || (mode === "flagged" && !allWords.some(isFlagged));

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

  const showSearch = props.mode === "learnt" || allWords.length >= SEARCH_FROM;

  return (
    <div className="flex flex-col gap-4">
      {/* The toolbar: filters on the left, search on the right. */}
      {(props.mode === "learnt" || showSearch) && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {props.mode === "learnt" ? (
            <div
              role="group"
              aria-label={t("word_list.filter_label", "Show words at")}
              className="flex flex-wrap gap-2"
            >
              {(
                [
                  { key: "all", name: t("word_list.filter_all", "All") },
                  ...props.levels.map((level) => ({ key: level.level, name: level.name })),
                  { key: "flagged", name: t("word_list.filter_flagged", "Flagged") },
                ] as { key: Filter; name: string }[]
              ).map((option) => {
                const count = allWords.filter((word) => matchesFilter(word, option.key)).length;
                const active = filter === option.key;
                const style =
                  option.key === "all" || option.key === "flagged" ? null : LEVEL_STYLE[option.key];
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(option.key)}
                    disabled={count === 0 && option.key !== "all"}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-40 disabled:hover:translate-y-0",
                      active
                        ? cn(
                            "border-transparent shadow-sm",
                            style ? style.chip : option.key === "flagged" ? "bg-kin text-ink-on-light" : "bg-sumi text-washi",
                          )
                        : "border-card-border bg-raised text-sumi-soft hover:text-sumi",
                    )}
                  >
                    {style && <style.icon aria-hidden className="h-4 w-4" strokeWidth={2.25} />}
                    {option.key === "flagged" && (
                      <Flag aria-hidden className={cn("h-4 w-4", active && "fill-current")} strokeWidth={2.25} />
                    )}
                    {option.name}
                    <span className={cn("tabular-nums", active ? "opacity-80" : "text-sumi-soft/70")}>{count}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <span />
          )}

          {showSearch && (
            <label className="relative block w-full lg:w-72 lg:shrink-0">
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
        </div>
      )}

      {words.length === 0 ? (
        <p className="py-8 text-center text-sm text-sumi-soft">
          {needle
            ? t("word_list.no_match", "No words match \"{{query}}\".", { query: query.trim() })
            : t("word_list.none_here", "No words here yet.")}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {words.map((word) => (
            <WordCard
              key={word.id}
              courseSlug={courseSlug}
              word={word}
              stage={stageOf(word)}
              flagged={isFlagged(word)}
              onFlag={(flagged) => setFlag(word.id, flagged)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// One word: what it is (vocabulary or grammar), the word itself — the
// biggest thing on the card — its Jyutping and meaning beneath, and its
// review level. The whole card opens the lesson; the flag toggle sits in
// the corner, outside that button (a button can't hold another).
function WordCard({
  courseSlug,
  word,
  stage,
  flagged,
  onFlag,
}: {
  courseSlug: string;
  word: FlaggedWord | LearntWord;
  stage: StageLabel;
  flagged: boolean;
  onFlag: (flagged: boolean) => void;
}) {
  const t = useTranslations();
  const level = LEVEL_STYLE[stage.level];
  const stepLabel =
    stage.steps > 1
      ? t("word_list.step_of", "{{level}} — step {{step}} of {{steps}}", {
          level: stage.levelName,
          step: stage.step,
          steps: stage.steps,
        })
      : stage.levelName;

  return (
    <li className="relative rounded-2xl border border-card-border bg-raised shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <LessonButton
        courseSlug={courseSlug}
        wordId={word.id}
        className="flex h-full w-full cursor-pointer flex-col items-start p-4 pr-12 text-left"
      >
        <span className="rounded-full bg-sumi/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sumi-soft">
          {word.path === "grammar"
            ? t("course_home.grammar", "Grammar")
            : t("course_home.vocabulary", "Vocabulary")}
        </span>

        <span className="mt-2 block max-w-full truncate font-nunito text-2xl font-extrabold leading-tight text-sumi">
          {word.term}
        </span>
        {word.romanization && (
          <span className="mt-0.5 block max-w-full truncate text-sm">
            {/* No tone-help button: the card is already a button. */}
            <Jyutping text={word.romanization} explain={false} />
          </span>
        )}
        <span className="mt-0.5 block max-w-full truncate text-sm text-sumi-soft">{word.translation}</span>

        {/* Its review level, with dots for the step within it. */}
        <span
          title={stepLabel}
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
            level.pill,
          )}
        >
          <level.icon aria-hidden className="h-3 w-3" strokeWidth={2.5} />
          {stage.levelName}
          {stage.steps > 1 && (
            <span aria-hidden className="flex gap-0.5">
              {Array.from({ length: stage.steps }, (_, index) => (
                <span
                  key={index}
                  className={cn("h-1.5 w-1.5 rounded-full bg-current", index >= stage.step && "opacity-25")}
                />
              ))}
            </span>
          )}
          <span className="sr-only">{stepLabel}</span>
        </span>
      </LessonButton>

      <button
        type="button"
        onClick={() => onFlag(!flagged)}
        aria-pressed={flagged}
        aria-label={
          flagged
            ? t("flag.unflag", "Remove flag from {{term}}", { term: word.term })
            : t("flag.flag_term", "Flag {{term}} for later", { term: word.term })
        }
        title={flagged ? t("flag.unflag_short", "Remove flag") : t("flag.flag", "Flag for later")}
        className={cn(
          "absolute top-3 right-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition",
          flagged ? "bg-kin/25 text-acorn hover:bg-kin/35" : "text-sumi-soft/60 hover:bg-sumi/5 hover:text-sumi",
        )}
      >
        <Flag aria-hidden className={cn("h-4 w-4", flagged && "fill-current")} strokeWidth={2.25} />
      </button>
    </li>
  );
}
