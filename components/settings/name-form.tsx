"use client";

import { useActionState } from "react";
import { updateName } from "@/lib/actions/profile";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useTranslations } from "@/components/i18n/locale-provider";

export function NameForm({ firstName, lastName }: { firstName: string; lastName: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(updateName, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField
        label={t("auth.first_name_label", "First name")}
        name="firstName"
        autoComplete="given-name"
        defaultValue={firstName}
        errors={state?.errors?.firstName}
      />
      <TextField
        label={t("auth.last_name_label", "Last name")}
        name="lastName"
        autoComplete="family-name"
        defaultValue={lastName}
        errors={state?.errors?.lastName}
      />
      {state?.message && (
        <p className={`text-sm ${state.success ? "text-matcha-dark" : "text-shu"}`}>{state.message}</p>
      )}
      <SubmitButton pending={pending} pendingText={t("profile_form.saving", "Saving…")}>
        {t("profile_form.save_changes", "Save changes")}
      </SubmitButton>
    </form>
  );
}
