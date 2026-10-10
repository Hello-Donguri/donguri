"use client";

import { useState, useTransition } from "react";
import { SelectField } from "@/components/ui/select";
import { useTranslations } from "@/components/i18n/locale-provider";
import { setLearningReason } from "@/lib/actions/profile";
import { LEARNING_REASONS, type LearningReason } from "@/lib/definitions";

function useReasonOptions() {
  const t = useTranslations();
  const labels: Record<LearningReason, string> = {
    friends: t("learning_reason.friends", "Make new friends"),
    travel: t("learning_reason.travel", "Travel"),
    work: t("learning_reason.work", "Work and business"),
    study: t("learning_reason.study", "School or exams"),
    living_abroad: t("learning_reason.living_abroad", "Living abroad"),
    culture: t("learning_reason.culture", "Films, music and games"),
    family: t("learning_reason.family", "Family or a partner"),
    fun: t("learning_reason.fun", "Just for fun"),
    other: t("learning_reason.other", "Something else"),
  };
  return LEARNING_REASONS.map((value) => ({ value, label: labels[value] }));
}

// The "why are you learning?" question on the sign-up and onboarding forms
// — submitted with the rest of the form as `learningReason`.
export function LearningReasonField({
  defaultValue,
  errors,
}: {
  defaultValue?: LearningReason | null;
  errors?: string[];
}) {
  const t = useTranslations();
  return (
    <SelectField
      label={t("learning_reason.label", "Why are you learning?")}
      name="learningReason"
      options={useReasonOptions()}
      defaultValue={defaultValue ?? ""}
      placeholder={t("learning_reason.placeholder", "Choose…")}
      errors={errors}
    />
  );
}

// The profile page: the same choice, saved as soon as it's changed.
export function LearningReasonSetting({ initial }: { initial: LearningReason | null }) {
  const t = useTranslations();
  const options = useReasonOptions();
  const [value, setValue] = useState(initial ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="learningReason" className="sr-only">
        {t("learning_reason.label", "Why are you learning?")}
      </label>
      <select
        id="learningReason"
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as LearningReason;
          setValue(next);
          setSaved(false);
          startTransition(async () => {
            await setLearningReason(next);
            setSaved(true);
          });
        }}
        className="rounded-lg border border-sumi/15 bg-washi px-4 py-2.5 text-sumi outline-none transition focus:border-ai focus:ring-2 focus:ring-ai-soft disabled:opacity-60"
      >
        {!value && (
          <option value="" disabled>
            {t("learning_reason.placeholder", "Choose…")}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {saved && !pending && <p className="text-sm text-matcha-dark">{t("learning_reason.saved", "Saved.")}</p>}
    </div>
  );
}
