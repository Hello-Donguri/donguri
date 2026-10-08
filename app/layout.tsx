import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import GoogleAnalytics from "@/components/vocab/GoogleAnalytics";
import { WebVitals } from "@/components/WebVitals";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import PeeringDonguriAcorn from "@/components/auth/peering-donguri";

// Self-hosted (app/fonts/) rather than next/font/google: Google started
// answering with font URLs (fonts.gstatic.com/l/font?kit=…&skey=…) that
// next/font/google can't parse ("queries have exactly one entry"), which
// broke the build. Each file is the Latin subset of the Google Fonts
// variable font, so one file covers every weight in its range.

// Site content — body text everywhere.
const openSans = localFont({
  src: "./fonts/open-sans-latin.woff2",
  variable: "--font-open-sans",
  weight: "400 700",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

// Site titles — headings and the wordmark (see the `h1`-`h6` rule in
// globals.css and font-nunito on the logo).
const nunito = localFont({
  src: "./fonts/nunito-latin.woff2",
  variable: "--font-nunito",
  weight: "400 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Donguri — Language learning, one word at a time",
  description:
    "A friendly, calm way to build real vocabulary and grammar in a new language, course by course.",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "Hello Donguri",
  },
};

// Allowed to block: `<html lang>` comes from the locale cookie, so this
// layout can't be part of a static shell. It only renders on full page
// loads — client navigations never re-render the root layout — so the
// dashboard's instant navigations (see app/dashboard/layout.tsx) aren't
// affected.
export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  return (
    <html
      lang={locale}
      className={`${openSans.variable} ${geistMono.variable} ${nunito.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LocaleProvider locale={locale} dictionary={dictionary}>
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </body>

      {/* Google Analytics - @next/third-parties optimized - loads after hydration */}
      <GoogleAnalytics />
      {/* Core Web Vitals Tracking */}
      <WebVitals />
    </html>
  );
}
