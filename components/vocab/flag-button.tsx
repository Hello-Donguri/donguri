"use client";

import { useTransition } from "react";
import { Flag } from "lucide-react";
import { setWordFlag } from "@/lib/actions/vocab";
import { useTranslations } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

type FlagButtonProps = {
  courseSlug: string;
  wordId: string;
  flagged: boolean;
  // Called straight away with the new state, so the button flips at once;
  // put back if saving fails.
  onChange: (flagged: boolean) => void;
  className?: string;
};

// Flags a word to come back to its lesson later — it's then listed on the
// course page (see FlaggedLessons). Controlled, so a review keeps each
// word's flag as the learner moves between questions.
export function FlagButton({ courseSlug, wordId, flagged, onChange, className }: FlagButtonProps) {
  const t = useTranslations();
  const [, startTransition] = useTransition();

  const toggle = () => {
    const next = !flagged;
    onChange(next);
    startTransition(async () => {
      try {
        await setWordFlag(courseSlug, wordId, next);
      } catch {
        onChange(!next);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={flagged}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
        flagged
          ? "bg-shu/10 text-shu hover:bg-shu/15"
          : "text-sumi-soft hover:bg-sumi/5 hover:text-sumi",
        className,
      )}
    >
      <Flag aria-hidden className={cn("h-3.5 w-3.5", flagged && "fill-current")} strokeWidth={2.25} />
      {flagged ? t("flag.flagged", "Flagged") : t("flag.flag", "Flag for later")}
    </button>
  );
}
