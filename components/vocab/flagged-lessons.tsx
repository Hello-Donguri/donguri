"use client";

import { useState, useTransition } from "react";
import { BookOpen, Flag, X } from "lucide-react";
import type { FlaggedWord } from "@/lib/definitions";
import { setWordFlag } from "@/lib/actions/vocab";
import { useTranslations } from "@/components/i18n/locale-provider";
import { LessonButton } from "@/components/vocab/word-lesson";
import { Jyutping } from "@/components/vocab/jyutping";
import { cn } from "@/lib/utils";

// The course page's list of lessons flagged during reviews (see
// FlagButton): each opens its lesson in the same dialog as the review's
// "See the lesson", and can be unflagged once it's sunk in. Unflagging
// hides it straight away; it comes back if saving fails. Nothing is drawn
// when nothing is flagged.
export function FlaggedLessons({ courseSlug, words }: { courseSlug: string; words: FlaggedWord[] }) {
  const t = useTranslations();
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [, startTransition] = useTransition();

  const visible = words.filter((word) => !removed.has(word.id));
  if (visible.length === 0) return null;

  const unflag = (wordId: string) => {
    setRemoved((current) => new Set(current).add(wordId));
    startTransition(async () => {
      try {
        await setWordFlag(courseSlug, wordId, false);
      } catch {
        setRemoved((current) => {
          const next = new Set(current);
          next.delete(wordId);
          return next;
        });
      }
    });
  };

  return (
    <section className="rounded-3xl border border-card-border bg-washi-soft p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-shu/10 text-shu">
          <Flag aria-hidden className="h-5 w-5 fill-current" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-nunito text-lg font-extrabold leading-tight text-sumi">
            {t("course_home.flagged_title", "Flagged lessons")}
            <span className="rounded-full bg-shu/10 px-2 py-0.5 text-xs font-bold tabular-nums text-shu">
              {visible.length}
            </span>
          </h2>
          <p className="text-sm text-sumi-soft">
            {t("course_home.flagged_subtitle", "Lessons you flagged during a review, to look at again.")}
          </p>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((word) => (
          <li
            key={word.id}
            className={cn(
              "group flex items-stretch overflow-hidden rounded-2xl border bg-raised shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
              word.path === "grammar" ? "border-matcha/30" : "border-ai/25",
            )}
          >
            <LessonButton
              courseSlug={courseSlug}
              wordId={word.id}
              className="flex min-w-0 flex-1 items-center gap-3 p-3.5 text-left"
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
                    <Jyutping text={word.romanization} />
                  </span>
                )}
                <span className="block truncate text-xs text-sumi-soft">{word.translation}</span>
              </span>
            </LessonButton>

            <button
              type="button"
              onClick={() => unflag(word.id)}
              aria-label={t("flag.unflag", "Remove flag from {{term}}", { term: word.term })}
              title={t("flag.unflag_short", "Remove flag")}
              className="flex w-11 shrink-0 items-center justify-center border-l border-card-border text-sumi-soft transition hover:bg-shu/10 hover:text-shu"
            >
              <X aria-hidden className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
