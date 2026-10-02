"use client";

import { useState, useTransition } from "react";
import { SelectField } from "@/components/ui/select";
import { useTranslations } from "@/components/i18n/locale-provider";
import { setNativeLanguage } from "@/lib/actions/profile";
import { NATIVE_LANGUAGES, type NativeLanguage } from "@/lib/definitions";

function useLanguageOptions() {
  const t = useTranslations();
  const labels: Record<NativeLanguage, string> = {
    en: t("native_language.en", "English"),
    ja: t("native_language.ja", "Japanese (日本語)"),
    other: t("native_language.other", "Other"),
  };
  return NATIVE_LANGUAGES.map((value) => ({ value, label: labels[value] }));
}

// The native language question on the sign-up and onboarding forms —
// submitted with the rest of the form as `nativeLanguage`.
export function NativeLanguageField({
  defaultValue,
  errors,
}: {
  defaultValue?: NativeLanguage | null;
  errors?: string[];
}) {
  const t = useTranslations();
  return (
    <SelectField
      label={t("native_language.label", "Native language")}
      name="nativeLanguage"
      options={useLanguageOptions()}
      defaultValue={defaultValue ?? ""}
      placeholder={t("native_language.placeholder", "Choose…")}
      errors={errors}
    />
  );
}

// Account settings: the same choice, saved as soon as it's changed.
export function NativeLanguageSetting({ initial }: { initial: NativeLanguage | null }) {
  const t = useTranslations();
  const options = useLanguageOptions();
  const [value, setValue] = useState(initial ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="nativeLanguage" className="sr-only">
        {t("native_language.label", "Native language")}
      </label>
      <select
        id="nativeLanguage"
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as NativeLanguage;
          setValue(next);
          setSaved(false);
          startTransition(async () => {
            await setNativeLanguage(next);
            setSaved(true);
          });
        }}
        className="rounded-lg border border-sumi/15 bg-washi px-4 py-2.5 text-sumi outline-none transition focus:border-ai focus:ring-2 focus:ring-ai-soft disabled:opacity-60"
      >
        {!value && (
          <option value="" disabled>
            {t("native_language.placeholder", "Choose…")}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {saved && !pending && (
        <p className="text-sm text-matcha-dark">{t("native_language.saved", "Saved.")}</p>
      )}
    </div>
  );
}
