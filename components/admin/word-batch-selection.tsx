"use client";

import { createContext, useContext, useState } from "react";
import { CheckSquare, XSquare } from "lucide-react";
import { BatchWordImages } from "@/components/admin/batch-word-images";
import { useTranslations } from "@/components/i18n/locale-provider";

type Selection = {
  selected: ReadonlySet<string>;
  toggle: (id: string) => void;
};

const SelectionContext = createContext<Selection | null>(null);

// On the admin deck page: ticking words to draw pictures for together.
// Wraps the word grid, whose cards each have a WordSelectCheckbox, and puts
// a bar above it with the count, select all / clear, and the batch window
// for the ticked words (see BatchWordImages). `words` is every word in the
// deck, so ticks survive switching the list's filter; `shownIds` the ones
// the list is showing now, for "Select all shown".
export function WordBatchSelection({
  courseSlug,
  deckTitle,
  words,
  shownIds,
  children,
}: {
  courseSlug: string;
  deckTitle: string;
  words: { id: string; term: string }[];
  shownIds: string[];
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const chosen = words
    .filter((word) => selected.has(word.id))
    .map((word) => ({ ...word, deckTitle }));
  const allShownSelected =
    shownIds.length > 0 && shownIds.every((id) => selected.has(id));

  return (
    <SelectionContext.Provider value={{ selected, toggle }}>
      <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-card-border bg-washi/95 px-3 py-2 text-sm shadow-sm">
        <span className="mr-auto font-semibold text-sumi">
          {chosen.length
            ? t("admin_category_words.selected_count", "{{count}} selected", {
                count: chosen.length,
              })
            : t(
                "admin_category_words.select_hint",
                "Tick words to draw their pictures together",
              )}
        </span>
        <button
          type="button"
          onClick={() =>
            setSelected((current) => {
              const next = new Set(current);
              for (const id of shownIds) {
                if (allShownSelected) next.delete(id);
                else next.add(id);
              }
              return next;
            })
          }
          disabled={shownIds.length === 0}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-ghost-border px-3 text-xs font-semibold text-ghost-text transition hover:bg-ghost-hover disabled:opacity-60"
        >
          <CheckSquare aria-hidden className="h-3.5 w-3.5" />
          {allShownSelected
            ? t("admin_category_words.unselect_shown", "Unselect shown")
            : t(
                "admin_category_words.select_shown",
                "Select all shown ({{count}})",
                { count: shownIds.length },
              )}
        </button>
        {chosen.length > 0 && (
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-ghost-border px-3 text-xs font-semibold text-ghost-text transition hover:bg-ghost-hover"
          >
            <XSquare aria-hidden className="h-3.5 w-3.5" />
            {t("admin_category_words.clear_selection", "Clear")}
          </button>
        )}
        <BatchWordImages
          courseSlug={courseSlug}
          presetWords={chosen}
          onSaved={() => setSelected(new Set())}
        />
      </div>
      {children}
    </SelectionContext.Provider>
  );
}

// A word card's tick box. The card highlights itself while it's ticked
// (it styles `has-[[data-word-select]:checked]`).
export function WordSelectCheckbox({
  wordId,
  label,
}: {
  wordId: string;
  label: string;
}) {
  const t = useTranslations();
  const selection = useContext(SelectionContext);
  if (!selection) return null;
  return (
    <input
      type="checkbox"
      data-word-select
      checked={selection.selected.has(wordId)}
      onChange={() => selection.toggle(wordId)}
      aria-label={t("admin_category_words.select_word", "Select {{label}}", {
        label,
      })}
      className="h-4 w-4 shrink-0 cursor-pointer accent-ai"
    />
  );
}
