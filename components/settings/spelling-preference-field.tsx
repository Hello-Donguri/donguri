"use client";

import { useState, useTransition } from "react";
import { SelectField } from "@/components/ui/select";
import { useTranslations } from "@/components/i18n/locale-provider";
import { setSpellingPreference } from "@/lib/actions/profile";
import { SPELLING_PREFERENCES, type SpellingPreference } from "@/lib/definitions";
import { cn } from "@/lib/utils";

// A few of the everyday words that differ — shown beside each choice so
// the difference is plain without having to explain it.
const EXAMPLES: Record<SpellingPreference, string[]> = {
  uk: ["colour", "centre", "organise", "travelling"],
  us: ["color", "center", "organize", "traveling"],
};

function useSpellingOptions() {
  const t = useTranslations();
  const labels: Record<SpellingPreference, string> = {
    uk: t("spelling_preference.uk", "UK spelling (colour, centre)"),
    us: t("spelling_preference.us", "US spelling (color, center)"),
  };
  return SPELLING_PREFERENCES.map((value) => ({ value, label: labels[value] }));
}

// The spelling question on the sign-up and onboarding forms — submitted
// with the rest of the form as `spellingPreference`.
export function SpellingPreferenceField({
  defaultValue,
  errors,
}: {
  defaultValue?: SpellingPreference | null;
  errors?: string[];
}) {
  const t = useTranslations();
  return (
    <SelectField
      label={t("spelling_preference.label", "English spelling")}
      name="spellingPreference"
      options={useSpellingOptions()}
      defaultValue={defaultValue ?? ""}
      placeholder={t("spelling_preference.placeholder", "Choose…")}
      errors={errors}
    />
  );
}

// The two choices side by side, each with its example words — used by
// account settings and the one-off prompt. Saved as soon as one is picked.
function SpellingChoice({
  value,
  onPick,
  disabled,
}: {
  value: SpellingPreference | null;
  onPick: (preference: SpellingPreference) => void;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const titles: Record<SpellingPreference, string> = {
    uk: t("spelling_preference.uk_title", "UK spelling"),
    us: t("spelling_preference.us_title", "US spelling"),
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup">
      {SPELLING_PREFERENCES.map((preference) => (
        <button
          key={preference}
          type="button"
          role="radio"
          aria-checked={value === preference}
          disabled={disabled}
          onClick={() => onPick(preference)}
          className={cn(
            "flex flex-col items-start gap-1 rounded-xl border-2 bg-washi px-4 py-3 text-left transition disabled:opacity-60",
            value === preference
              ? "border-ai ring-2 ring-ai-soft"
              : "border-sumi/15 hover:border-ai/60",
          )}
        >
          <span className="font-semibold text-sumi">{titles[preference]}</span>
          <span className="text-sm text-sumi-soft">{EXAMPLES[preference].join(", ")}</span>
        </button>
      ))}
    </div>
  );
}

// Account settings: the same choice, changeable any time.
export function SpellingPreferenceSetting({ initial }: { initial: SpellingPreference | null }) {
  const t = useTranslations();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <SpellingChoice
        value={value}
        disabled={pending}
        onPick={(next) => {
          setValue(next);
          setSaved(false);
          startTransition(async () => {
            await setSpellingPreference(next);
            setSaved(true);
          });
        }}
      />
      {saved && !pending && (
        <p className="text-sm text-matcha-dark">{t("spelling_preference.saved", "Saved.")}</p>
      )}
    </div>
  );
}

// Asked once of everyone who signed up before the question existed (their
// preference is still null — see DashboardSpellingPrompt), over whatever
// dashboard page they land on. There's no wrong answer, so it can't be
// dismissed without one: picking either saves it and closes the prompt.
export function SpellingPreferencePrompt() {
  const t = useTranslations();
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState<SpellingPreference | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spelling-prompt-title"
      className="fixed inset-0 z-50 flex overflow-y-auto bg-sumi/70 p-4"
    >
      <div className="relative m-auto w-full max-w-lg rounded-3xl bg-washi-soft p-6 shadow-2xl sm:p-8">
        <h2 id="spelling-prompt-title" className="font-nunito text-2xl font-black text-sumi text-balance">
          {t("spelling_prompt.title", "UK or US spelling?")}
        </h2>
        <p className="mt-3 text-sm text-sumi-soft">
          {t(
            "spelling_prompt.body",
            "Some English words are spelt differently in the UK and the US. They mean the same thing and sound the same, only the spelling changes: “colour” and “color”, “centre” and “center”, “organise” and “organize”.",
          )}
        </p>
        <p className="mt-2 text-sm text-sumi-soft">
          {t(
            "spelling_prompt.body_choice",
            "Pick the one you'd like to learn. We'll show words that way, and you can type either.",
          )}
        </p>
        <div className="mt-5">
          <SpellingChoice
            value={value}
            disabled={pending}
            onPick={(next) => {
              setValue(next);
              startTransition(async () => {
                await setSpellingPreference(next);
                setOpen(false);
              });
            }}
          />
        </div>
        <p className="mt-4 text-xs text-sumi-soft">
          {t("spelling_prompt.change_later", "You can change this any time in Account settings.")}
        </p>
      </div>
    </div>
  );
}
