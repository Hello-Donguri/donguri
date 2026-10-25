"use client";

import { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import type { LinkableWord } from "@/lib/dal";
import { useTranslations } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

const MAX_SUGGESTIONS = 8;

// The admin word form's linked words (see WordLink): the chosen words as
// pills, each with an × to take it off, and a box that suggests words from
// the same deck as you type — only those can be added, so a link can't point
// at a word that doesn't exist. Submits each as a hidden `linkedWordIds`.
export function LinkedWordsPicker({
  words,
  wordId,
  initialIds,
  errors,
}: {
  words: LinkableWord[];
  // The word being edited, left out of the suggestions.
  wordId: string;
  initialIds: string[];
  errors?: string[];
}) {
  const t = useTranslations();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(initialIds);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const byId = new Map(words.map((word) => [word.id, word]));
  const needle = query.trim().toLowerCase();
  // Exact and starts-with matches first, then the term or meaning
  // containing it anywhere.
  const suggestions = needle
    ? words
        .filter((word) => word.id !== wordId && !selected.includes(word.id))
        .map((word) => {
          const term = word.term.toLowerCase();
          const rank =
            term === needle
              ? 0
              : term.startsWith(needle)
                ? 1
                : term.includes(needle)
                  ? 2
                  : word.translation.toLowerCase().includes(needle)
                    ? 3
                    : -1;
          return { word, rank };
        })
        .filter((entry) => entry.rank >= 0)
        .sort((a, b) => a.rank - b.rank)
        .slice(0, MAX_SUGGESTIONS)
        .map((entry) => entry.word)
    : [];
  const showList = open && suggestions.length > 0;

  const add = (word: LinkableWord) => {
    setSelected((current) => [...current, word.id]);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  };
  const remove = (id: string) => setSelected((current) => current.filter((value) => value !== id));

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${listId}-input`} className="text-sm font-medium text-sumi">
        {t("admin_word_form.linked_words", "Linked words")}
      </label>
      <div className="relative">
        <div
          onClick={() => inputRef.current?.focus()}
          className={cn(
            "flex min-h-12 w-full flex-wrap items-center gap-1.5 rounded-xl border bg-washi px-2.5 py-2 transition focus-within:border-ai focus-within:ring-2 focus-within:ring-ai/20",
            errors?.length ? "border-shu" : "border-card-border",
          )}
        >
          {selected.map((id) => {
            const word = byId.get(id);
            if (!word) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-ai-soft py-1 pr-1 pl-3 text-sm font-semibold text-ai-dark"
              >
                {word.term}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    remove(id);
                  }}
                  aria-label={t("admin_word_form.remove_linked", "Remove {{term}}", { term: word.term })}
                  className="flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-ai/20"
                >
                  <X aria-hidden className="h-3.5 w-3.5" />
                </button>
                <input type="hidden" name="linkedWordIds" value={id} />
              </span>
            );
          })}
          <input
            ref={inputRef}
            id={`${listId}-input`}
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            value={query}
            placeholder={
              selected.length === 0 ? t("admin_word_form.linked_words_search", "Search this deck's words…") : ""
            }
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && suggestions.length > 0) {
                event.preventDefault();
                setActive((current) => (current + 1) % suggestions.length);
              } else if (event.key === "ArrowUp" && suggestions.length > 0) {
                event.preventDefault();
                setActive((current) => (current - 1 + suggestions.length) % suggestions.length);
              } else if (event.key === "Enter") {
                // Never submits the whole form from here.
                event.preventDefault();
                if (showList) add(suggestions[active]);
              } else if (event.key === "Escape") {
                setOpen(false);
              } else if (event.key === "Backspace" && query === "" && selected.length > 0) {
                remove(selected[selected.length - 1]);
              }
            }}
            className="min-w-40 flex-1 bg-transparent px-1.5 py-1 text-sumi outline-none placeholder:text-sumi-soft/70"
          />
        </div>

        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-card-border bg-raised py-1 shadow-lg"
          >
            {suggestions.map((word, index) => (
              <li
                key={word.id}
                role="option"
                aria-selected={index === active}
                // Before the input's blur closes the list.
                onMouseDown={(event) => {
                  event.preventDefault();
                  add(word);
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex cursor-pointer items-baseline gap-3 px-3 py-2 text-sm",
                  index === active && "bg-ai-soft/60",
                )}
              >
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-sumi">{word.term}</span>
                  <span className="text-sumi-soft"> — {word.translation}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {errors?.map((error) => (
        <p key={error} className="text-sm text-shu">
          {error}
        </p>
      ))}
    </div>
  );
}
