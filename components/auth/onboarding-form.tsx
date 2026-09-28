"use client";

import { useActionState } from "react";
import { completeOnboarding } from "@/lib/actions/auth";
import { TextField } from "@/components/ui/text-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { UsernameField } from "@/components/auth/username-field";
import { useTranslations } from "@/components/i18n/locale-provider";

type OnboardingFormProps = {
  firstName: string;
  lastName: string;
  // Already chosen — shown for reference only, since it can't change.
  username: string | null;
};

export function OnboardingForm({ firstName, lastName, username }: OnboardingFormProps) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(completeOnboarding, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField
        label={t("auth.first_name_label", "First name")}
        name="firstName"
        autoComplete="given-name"
        placeholder="Yuki"
        defaultValue={firstName}
        errors={state?.errors?.firstName}
      />
      <TextField
        label={t("auth.last_name_label", "Last name")}
        name="lastName"
        autoComplete="family-name"
        placeholder="Tanaka"
        defaultValue={lastName}
        errors={state?.errors?.lastName}
      />
      {username ? (
        <p className="text-sm text-sumi-soft">
          {t("auth.username_label", "Username")}:{" "}
          <span className="font-medium text-sumi">@{username}</span>
        </p>
      ) : (
        <UsernameField errors={state?.errors?.username} />
      )}
      {state?.message && <p className="text-sm text-shu">{state.message}</p>}
      <SubmitButton pending={pending} pendingText={t("onboarding.saving", "Saving…")}>
        {t("onboarding.continue", "Continue")}
      </SubmitButton>
    </form>
  );
}
