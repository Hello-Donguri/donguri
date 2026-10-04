import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Log in — Donguri",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { t } = await getTranslator();
  const { error, notice } = await searchParams;
  // From an email link (see app/auth/confirm).
  const noticeText =
    notice === "confirmed"
      ? t("auth.notice_confirmed", "Your email is confirmed — log in to continue.")
      : notice === "link_invalid"
        ? t(
            "auth.notice_link_invalid",
            "That link has expired or has already been used. If you've already confirmed your email, just log in.",
          )
        : null;

  return (
    <AuthCard
      title={t("auth.login_title", "Welcome back")}
      subtitle={t("auth.login_subtitle", "Log in to continue your practice.")}
      footer={{
        text: t("auth.login_footer_text", "Don't have an account?"),
        linkText: t("auth.login_footer_link", "Sign up"),
        href: "/signup",
      }}
    >
      {noticeText && (
        <p
          role="status"
          className={
            notice === "confirmed"
              ? "mb-5 rounded-2xl bg-matcha-soft/60 px-4 py-3 text-sm text-matcha-dark"
              : "mb-5 rounded-2xl bg-kin/15 px-4 py-3 text-sm text-sumi"
          }
        >
          {noticeText}
        </p>
      )}
      <OAuthButtons error={error === "oauth"} />
      <LoginForm />
    </AuthCard>
  );
}
