"use client";

import { TextField } from "@/components/ui/text-field";
import { useTranslations } from "@/components/i18n/locale-provider";

// Shared by the sign-up form and /onboarding — the two places a username is
// chosen. The hint's "can't be changed" is enforced server-side (see
// completeOnboarding in lib/actions/auth.ts and section 39 of
// supabase/schema.sql).
export function UsernameField({ errors }: { errors?: string[] }) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-1.5">
      <TextField
        label={t("auth.username_label", "Username")}
        name="username"
        autoComplete="username"
        placeholder="yuki_t"
        errors={errors}
      />
      <p className="text-xs text-sumi-soft">
        {t(
          "auth.username_hint",
          "Shown on leaderboards. 3–20 letters, numbers or underscores — you can't change it later.",
        )}
      </p>
    </div>
  );
}
