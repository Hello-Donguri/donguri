import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cacheLife } from "next/cache";
import { AuthCard } from "@/components/auth/auth-card";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { getProfile, isProfileComplete, requireUser } from "@/lib/dal";
import { logout } from "@/lib/actions/auth";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Finish signing up — Donguri",
};

// Where requireProfile (lib/dal.ts) sends anyone without a username or
// first/last name: mostly OAuth sign-ups, whose provider gave us at best a
// display name. Names are prefilled from whatever the provider did send.
// Private cache scope for the session read's `Date.now()` — see the
// dashboard page. Completing onboarding revalidates the dashboard layout
// and redirects away, so a stale copy here is never acted on.
async function loadOnboarding() {
  "use cache: private";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });

  const [user, profile] = await Promise.all([requireUser(), getProfile()]);

  return { meta: user.user_metadata ?? {}, profile };
}

export default async function OnboardingPage() {
  const { t } = await getTranslator();
  const { meta, profile } = await loadOnboarding();

  if (profile && isProfileComplete(profile)) {
    redirect("/dashboard");
  }

  return (
    <AuthCard
      title={t("onboarding.title", "Almost there")}
      subtitle={t("onboarding.subtitle", "Tell us your name and pick a username for the leaderboards.")}
    >
      <OnboardingForm
        firstName={profile?.first_name ?? meta.given_name ?? meta.first_name ?? ""}
        lastName={profile?.last_name ?? meta.family_name ?? meta.last_name ?? ""}
        username={profile?.username ?? null}
        nativeLanguage={profile?.native_language ?? null}
        learningReason={profile?.learning_reason ?? null}
      />
      <form action={logout} className="mt-4 text-center">
        <button type="submit" className="text-sm text-sumi-soft hover:text-sumi">
          {t("onboarding.log_out", "Log out")}
        </button>
      </form>
    </AuthCard>
  );
}
