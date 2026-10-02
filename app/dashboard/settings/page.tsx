import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { requireProfile } from "@/lib/dal";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { NameForm } from "@/components/settings/name-form";
import { VisibilityToggle } from "@/components/ui/visibility-toggle";
import { setOvertakenEmails, setProfileVisible } from "@/lib/actions/profile";
import { NativeLanguageSetting } from "@/components/settings/native-language-field";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Account settings — Donguri",
};

// Private cache scope, like loadCourseHome on the course page: the session
// read checks token expiry against `Date.now()`, which Cache Components only
// allows inside a cache scope during a (runtime) prerender.
async function loadProfile() {
  "use cache: private";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });

  return requireProfile();
}

export default async function SettingsPage() {
  const profile = await loadProfile();
  const { t } = await getTranslator();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Breadcrumbs
          items={[
            { href: "/dashboard", label: t("breadcrumbs.dashboard", "Dashboard") },
            { label: t("settings_page.title", "Account settings") },
          ]}
        />
        <PageTitle>{t("settings_page.heading", "Account settings")}</PageTitle>
        <PageSubtitle>
          {t("settings_page.subtitle", "Manage the details tied to your account.")}
        </PageSubtitle>
      </div>

      <div className="max-w-lg rounded-2xl border border-card-border bg-washi-soft p-6">
        <h2 className="font-semibold text-sumi">{t("settings_page.account_title", "Account")}</h2>
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-card-border pt-4">
          <span className="text-sm text-sumi-soft">{t("settings_page.username_label", "Username")}</span>
          <span className="text-sm font-medium text-sumi">@{profile.username}</span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-card-border pt-4">
          <span className="text-sm text-sumi-soft">{t("settings_page.email_label", "Email")}</span>
          <span className="text-sm font-medium text-sumi">{profile.email}</span>
        </div>
      </div>

      <div className="max-w-lg rounded-2xl border border-card-border bg-washi-soft p-6">
        <h2 className="font-semibold text-sumi">{t("settings_page.name_title", "Your name")}</h2>
        <p className="mt-1 mb-4 text-sm text-sumi-soft">
          {t(
            "settings_page.name_description",
            "Only used to greet you — the leaderboards show your username.",
          )}
        </p>
        <NameForm firstName={profile.first_name ?? ""} lastName={profile.last_name ?? ""} />
      </div>

      <div className="max-w-lg rounded-2xl border border-card-border bg-washi-soft p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-sumi">
              {t("settings_page.profile_visibility_title", "Public profile")}
            </h2>
            <p className="mt-1 text-sm text-sumi-soft">
              {t(
                "settings_page.profile_visibility_description",
                "Other learners can see your username, XP, when you were last active and your badges. Hide it to keep it to yourself.",
              )}
            </p>
          </div>
          <VisibilityToggle
            active={!profile.profile_hidden}
            toggleAction={setProfileVisible}
            label={t("settings_page.profile_visibility_label", "your profile")}
          />
        </div>
        <Button
          href={`/user/${profile.username}`}
          variant="outline"
          size="sm"
          className="mt-4"
        >
          {t("settings_page.view_profile", "View your profile")}
        </Button>
      </div>

      <div className="max-w-lg rounded-2xl border border-card-border bg-washi-soft p-6">
        <h2 className="font-semibold text-sumi">
          {t("settings_page.native_language_title", "Native language")}
        </h2>
        <p className="mt-1 mb-4 text-sm text-sumi-soft">
          {t("settings_page.native_language_description", "The language you grew up speaking.")}
        </p>
        <NativeLanguageSetting initial={profile.native_language} />
      </div>

      <div className="max-w-lg rounded-2xl border border-card-border bg-washi-soft p-6">
        <h2 className="font-semibold text-sumi">
          {t("settings_page.notifications_title", "Email notifications")}
        </h2>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-sumi">
              {t("settings_page.overtaken_title", "Leaderboard crown")}
            </p>
            <p className="mt-0.5 text-sm text-sumi-soft">
              {t(
                "settings_page.overtaken_description",
                "Email me when someone takes my #1 spot on the weekly leaderboard. At most once a day.",
              )}
            </p>
          </div>
          <VisibilityToggle
            active={profile.email_overtaken}
            toggleAction={setOvertakenEmails}
            label={t("settings_page.overtaken_label", "leaderboard crown emails")}
            statusLabels={{
              on: t("settings_page.on", "On"),
              off: t("settings_page.off", "Off"),
            }}
          />
        </div>
      </div>

      <div className="max-w-lg rounded-2xl border border-card-border bg-washi-soft p-6">
        <h2 className="font-semibold text-sumi">{t("settings_page.security_title", "Security")}</h2>
        <p className="mt-1 text-sm text-sumi-soft">
          {t(
            "settings_page.security_description",
            "Send yourself a password reset link by email.",
          )}
        </p>
        <Button href="/forgot-password" variant="outline" size="sm" className="mt-4">
          {t("settings_page.change_password", "Change password")}
        </Button>
      </div>
    </div>
  );
}
