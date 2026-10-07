// hellodonguri.com landing page.
// The original app homepage is preserved below, commented out, so it can be
// restored by deleting the /* ... */ wrapper and the new code beneath it.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getProfile, getSession } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { getTranslator } from "@/lib/i18n/server";
import { getMembershipPriceLabel } from "@/lib/billing";
import { Hero } from "@/components/landing/hero";
import { Decks } from "@/components/landing/decks";
import { Story } from "@/components/landing/story/story";
import { Progress } from "@/components/landing/progress";
import { ForJapaneseSpeakers } from "@/components/landing/for-japanese-speakers";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";

export default async function Home() {
  const user = await getSession();

  // A guest's session can outlive the guest (merged into a real account, or
  // cleaned up) while its cookies are still being cleared — only send on to
  // the dashboard a session whose account still exists, or this bounces
  // between here and the dashboard's sign-in check.
  if (user && (!user.is_anonymous || (await getProfile()))) {
    redirect("/dashboard");
  }

  const { t, locale } = await getTranslator();
  // Shown on the pricing card; left off rather than failing the page if
  // Stripe can't be reached.
  const priceLabel = await getMembershipPriceLabel(locale, t("billing.per_month", "month")).catch(
    (error) => {
      console.error("Couldn't load the membership price:", error);
      return null;
    },
  );

  return (
    <div className="flex min-h-screen flex-col bg-washi">
      <header className="border-b border-header-border bg-header">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
          <Logo />

          <nav className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/login"
              className="rounded-full px-3 py-2 text-sm font-medium text-sumi-soft transition hover:text-sumi sm:px-4"
            >
              {t("nav.log_in", "Log in")}
            </Link>

            <Button href="/signup" size="sm">
              {t("nav.sign_up", "Sign up")}
            </Button>

            <ThemeToggle className="ml-1" />
            <LocaleSwitcher />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Hero t={t} />
        <Decks t={t} />
        <Story t={t} />
        <Progress t={t} />
        <ForJapaneseSpeakers t={t} priceLabel={priceLabel} />
        <Faq t={t} />
      </main>

      <FinalCta t={t} />

      <footer className="border-t border-sumi/10 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-sm text-sumi-soft sm:flex-row sm:justify-between">
          <p>{t("footer.tagline", "Hello Donguri — English learning designed for Japanese speakers.")}</p>
          <nav className="flex gap-5">
            <a href="#lessons" className="transition hover:text-sumi">
              {t("home.footer.how", "How it works")}
            </a>
            <a href="#pricing" className="transition hover:text-sumi">
              {t("home.footer.pricing", "Pricing")}
            </a>
            <a href="#faq" className="transition hover:text-sumi">
              {t("home.footer.faq", "FAQ")}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// import type { Metadata } from "next";
// import Image from "next/image";
// import { redirect } from "next/navigation";
// import { getSession } from "@/lib/dal";

// // Page-specific metadata (merges with, and overrides, the root layout's
// // metadata for this route only — other pages are unaffected).
// const title = "Hello Donguri — もうすぐ公開！";
// const description =
//   "Hello Donguri is a friendly, character-led way for Japanese speakers to learn everyday English. Launching soon.";
// // OG image file to be added at public/images/og-image.png.
// const ogImage = "/images/og-image.png";

// export const metadata: Metadata = {
//   metadataBase: new URL("https://hellodonguri.com"),
//   title,
//   description,
//   openGraph: {
//     title,
//     description,
//     url: "https://hellodonguri.com",
//     siteName: "Hello Donguri",
//     images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
//     locale: "ja_JP",
//     type: "website",
//   },
//   twitter: {
//     card: "summary_large_image",
//     title,
//     description,
//     images: [ogImage],
//   },
// };

// // Brand palette — dark brown / muted red, per the Hello Donguri brief.
// const BROWN = "#4A2414";
// const RED = "#C4312B";

// export default async function Home() {
//   const user = await getSession();

//   if (user) {
//     redirect("/dashboard");
//   }

//   return (
//     <main className="flex min-h-dvh items-center justify-center bg-washi px-5 py-8 text-center sm:px-8 sm:py-14">
//       <div className="flex w-full max-w-2xl flex-col items-center">
//         <Image
//           src="/images/mascots.webp"
//           alt="Hello Donguri acorn mascot"
//           width={500}
//           height={500}
//           priority
//           sizes="(max-width: 640px) 280px, 500px"
//           className="h-auto w-full max-w-[280px] object-contain xs:max-w-[320px] sm:max-w-[500px]"
//         />
//         <h1
//           className="font-zen-maru mt-5 text-[clamp(2.25rem,12vw,3.75rem)] leading-tight font-bold tracking-tight sm:mt-7"
//           style={{ color: BROWN }}
//         >
//           もうすぐ公開！
//         </h1>
//         <p className="font-fredoka tracking-tight mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-2xl font-bold sm:mt-3 sm:gap-3 sm:text-6xl">
//           <span style={{ color: BROWN }}>Hello</span>
//           <span style={{ color: RED }}>Donguri</span>
//         </p>
//         <p className="mt-5 max-w-xl text-[15px] leading-7 text-pretty text-sumi-soft sm:mt-6 sm:text-lg sm:leading-8">
//           Hello
//           Donguriは、かわいいキャラクターたちと一緒に、楽しく英語を学べる新しい学習サービスです。
//           日常で使える英語を、少しずつ、自分のペースで身につけていきましょう。
//           現在、公開に向けて準備中です。もうしばらくお待ちください。
//         </p>
//         <div
//           aria-hidden="true"
//           className="my-4 h-px w-12 bg-current opacity-15 sm:my-5"
//           style={{ color: BROWN }}
//         />
//         <p className="max-w-lg text-sm leading-6 text-pretty text-sumi-soft sm:text-base sm:leading-7">
//           Hello Donguri is a new way for Japanese speakers to learn everyday
//           English with a friendly cast of characters—a little at a time, at your
//           own pace. We&apos;re putting the finishing touches on it now.
//         </p>
//       </div>
//     </main>
//   );
// }
