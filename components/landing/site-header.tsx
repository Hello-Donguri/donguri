import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { SiteMobileMenu, SiteNavLinks } from "@/components/landing/site-nav";
import { getSession } from "@/lib/dal";
import { getTranslator } from "@/lib/i18n/server";

// The public site's header — the home page and the info pages (FAQ, about,
// contact, partners), which it links to: inline from lg, behind a menu
// button below that. Someone already signed in gets a way back to their
// dashboard instead of the log in / sign up buttons.
export async function SiteHeader() {
  const [{ t }, user] = await Promise.all([getTranslator(), getSession()]);
  const signedIn = Boolean(user && !user.is_anonymous);

  return (
    // Same width as the home page's content (max-w-6xl inside the side
    // padding), so the logo and buttons line up with the hero's edges.
    <header className="relative z-30 border-b border-header-border bg-header px-4 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center gap-3 py-4">
        <Logo wordmarkClassName="sr-only sm:not-sr-only" />

        <SiteNavLinks className="ml-4 hidden lg:flex" />

        <div className="ml-auto flex items-center gap-2">
          <LanguageSelector />

          {signedIn ? (
            <Button href="/dashboard" size="sm">
              {t("nav.dashboard", "Dashboard")}
            </Button>
          ) : (
            <>
              <Button href="/login" variant="outline" size="sm" className="px-3.5 sm:px-4">
                {t("nav.log_in", "Log in")}
              </Button>
              <Button href="/signup" size="sm" className="px-3.5 sm:px-4">
                {t("nav.sign_up", "Sign up")}
              </Button>
            </>
          )}

          <ThemeToggle className="hidden sm:inline-flex" />
          <SiteMobileMenu className="lg:hidden" />
        </div>
      </div>
    </header>
  );
}
