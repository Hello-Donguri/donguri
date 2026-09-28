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
  const { error } = await searchParams;

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
      <OAuthButtons error={error === "oauth"} />
      <LoginForm />
    </AuthCard>
  );
}
