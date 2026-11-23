"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Copy, EyeOff } from "lucide-react";
import { useTranslations } from "@/components/i18n/locale-provider";
import type { DuplicateWordGroup } from "@/lib/dal";
import { cn } from "@/lib/utils";

// On the admin course page: the vocab words that are in the live decks
// more than once (see getCourseDuplicateWords), folded away until opened. Each
// copy links to its card on its deck page; groups with two copies in one
// deck are marked, as those are almost always a mistake.
export function DuplicateWords({ groups, courseSlug }: { groups: DuplicateWordGroup[]; courseSlug: string }) {
  const t = useTranslations();
  const [expanded, setExpanded] = useState(false);
  const sameDeck = groups.filter((group) => group.sameDeck).length;

  if (groups.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-card-border bg-washi-soft px-4 py-3 text-sm text-sumi-soft">
        <Copy aria-hidden className="h-4 w-4 text-matcha-dark" />
        {t("admin_duplicate_words.none", "No duplicate words in the live decks.")}
      </p>
    );
  }

  return (
    <section className="rounded-2xl border border-kin/40 bg-washi-soft shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left"
      >
        <Copy aria-hidden className="h-4 w-4 shrink-0 text-acorn" />
        <span className="font-nunito text-lg font-bold text-sumi">
          {t("admin_duplicate_words.title", "Duplicate words")}
        </span>
        <span className="rounded-full bg-kin/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-sumi">
          {groups.length}
        </span>
        {sameDeck > 0 && (
          <span className="rounded-full bg-shu/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-shu-dark">
            {t("admin_duplicate_words.same_deck_count", "{{count}} in the same deck", { count: sameDeck })}
          </span>
        )}
        <ChevronDown
          aria-hidden
          className={cn("ml-auto h-4 w-4 text-sumi-soft transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-card-border px-4 py-3">
          <p className="text-xs text-sumi-soft">
            {t(
              "admin_duplicate_words.hint",
              "Words that appear more than once in the live decks, ignoring case, “to”/“a”/“the” at the start, and UK/US spelling. Check the translations — some may be different meanings on purpose.",
            )}
          </p>
          <ul className="flex flex-col divide-y divide-card-border">
            {groups.map((group) => (
              <li key={group.words[0].id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex shrink-0 items-center gap-2 sm:w-44">
                  <span className="font-semibold text-sumi">{group.term}</span>
                  {group.sameDeck && (
                    <span className="rounded-full bg-shu/10 px-2 py-0.5 text-[11px] font-semibold text-shu-dark">
                      {t("admin_duplicate_words.same_deck", "Same deck")}
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {group.words.map((word) => (
                    <Link
                      key={word.id}
                      href={`/dashboard/admin/courses/${courseSlug}/categories/${word.deck.id}#word-${word.id}`}
                      className={cn(
                        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-card-border bg-washi px-2.5 py-1 text-xs text-sumi transition hover:border-ai hover:text-ai",
                        (!word.active || !word.deck.active) && "opacity-60",
                      )}
                    >
                      {(!word.active || !word.deck.active) && <EyeOff aria-hidden className="h-3 w-3 shrink-0" />}
                      <span className="truncate font-semibold">
                        {word.deck.title}
                      </span>
                      <span className="truncate text-sumi-soft">
                        {word.term === group.term ? word.translation : `${word.term} · ${word.translation}`}
                      </span>
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
