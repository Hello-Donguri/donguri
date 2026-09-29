import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LessonPreviewCard } from "@/components/landing/lesson-preview-card";
import { Eyebrow } from "@/components/landing/section";
import type { TFunction } from "@/lib/i18n/translate";

export function Hero({ t }: { t: TFunction }) {
  const points = [
    t("home.hero.point_trial", "14 days free"),
    t("home.hero.point_cancel", "Cancel anytime"),
    t("home.hero.point_japanese", "Explained in Japanese"),
  ];

  return (
    <section className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-14 px-6 py-16 sm:py-20 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:py-24">
      <div className="flex flex-col items-center text-center md:items-start md:text-left">
        <Eyebrow>{t("home.hero.eyebrow", "English for Japanese speakers")}</Eyebrow>

        <h1 className="mt-6 max-w-xl font-nunito text-4xl font-extrabold tracking-tight text-sumi text-balance sm:text-5xl">
          {t("home.hero.headline", "English that sticks, five minutes at a time.")}
        </h1>

        <p className="mt-5 max-w-lg text-lg text-sumi-soft text-pretty">
          {t(
            "home.hero.subtext",
            "Learn three words at a time, test yourself straight away, and review each one just before you'd forget it. Then put it to use in a quick chat with Charles Duck.",
          )}
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button href="/signup" size="lg" className="h-14 px-8 text-base">
            {t("home.hero.cta_primary", "Start your free trial")}
          </Button>
          <Button href="#how-it-works" variant="outline" size="lg" className="h-14 px-8 text-base">
            {t("home.hero.cta_secondary", "See how it works")}
          </Button>
        </div>

        <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-sumi-soft md:justify-start">
          {points.map((point) => (
            <li key={point} className="inline-flex items-center gap-1.5">
              <Check aria-hidden className="h-4 w-4 text-matcha" strokeWidth={3} />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-center px-3">
        <LessonPreviewCard t={t} />
      </div>
    </section>
  );
}
