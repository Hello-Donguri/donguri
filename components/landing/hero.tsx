import Image from "next/image";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  ImageIcon,
  Layers,
  MessageCircle,
  PencilLine,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { Eyebrow, ICON_CHIP, type Accent } from "@/components/landing/section";
import { cn } from "@/lib/utils";
import type { TFunction } from "@/lib/i18n/translate";

type Feature = { icon: LucideIcon; accent: Accent; title: string; body: string };

// A small lifted card naming one feature — floated around the headline on
// wide screens (see FeatureChip for narrower ones).
function FeatureCard({ feature, className, style }: { feature: Feature; className?: string; style?: CSSProperties }) {
  const Icon = feature.icon;
  return (
    <div
      style={style}
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-card-border bg-raised p-4 text-left shadow-sm",
        className,
      )}
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", ICON_CHIP[feature.accent])}>
        <Icon aria-hidden className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="min-w-0">
        <span className="block font-nunito text-base font-extrabold leading-tight text-sumi">{feature.title}</span>
        <span className="mt-1 block text-xs leading-snug text-sumi-soft">{feature.body}</span>
      </span>
    </div>
  );
}

// The same feature as a compact pill — icon and title only — for screens
// too narrow to float the cards beside the headline.
function FeatureChip({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-card-border bg-raised py-1.5 pr-4 pl-1.5 text-sm font-semibold text-sumi shadow-sm">
      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", ICON_CHIP[feature.accent])}>
        <Icon aria-hidden className="h-4 w-4" strokeWidth={2.25} />
      </span>
      {feature.title}
    </span>
  );
}

type Area = {
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
  image: { src: string; width: number; height: number; className: string };
  // Written out in full so Tailwind finds each class.
  card: string;
  badge: string;
  titleText: string;
  arrow: string;
};

export function Hero({ t }: { t: TFunction }) {
  const points = [
    t("home.hero.point_no_signup", "No sign-up needed to start"),
    t("home.hero.point_cancel", "Cancel anytime"),
    t("home.hero.point_japanese", "Explained in Japanese"),
  ];

  const features: Feature[] = [
    {
      icon: ImageIcon,
      accent: "ai",
      title: t("home.lessons.picture_title", "A picture for every word"),
      body: t("home.lessons.picture_body", "So you link the English to the thing itself, not just a translation."),
    },
    {
      icon: Volume2,
      accent: "matcha",
      title: t("home.lessons.audio_title", "Hear it said"),
      body: t("home.lessons.audio_body", "Play the word and every example sentence out loud."),
    },
    {
      icon: Clock,
      accent: "kin",
      title: t("home.how.review_title", "Review when it's due"),
      body: t("home.how.review_body", "Words come back after hours, then days, then weeks, until you know them for good."),
    },
    {
      icon: Layers,
      accent: "sakura",
      title: t("home.lessons.forms_title", "Every form in one place"),
      body: t("home.lessons.forms_body", "go, goes, went, gone, going — laid out side by side."),
    },
  ];

  // Where each feature card floats on wide screens — two either side of the
  // headline, each tilted slightly and bobbing out of step with the others.
  const floatPlacement = [
    "left-0 top-2 -rotate-2",
    "left-8 top-40 rotate-1",
    "right-0 top-6 rotate-2",
    "right-10 top-44 -rotate-1",
  ];

  const areas: Area[] = [
    {
      href: "#lessons",
      icon: BookOpen,
      title: t("home.lessons.eyebrow", "Lessons"),
      body: t("home.lessons.heading", "Lessons that explain, not just list."),
      image: { src: "/images/rabbit-reading.webp", width: 905, height: 929, className: "h-28" },
      card: "border-ai/20 bg-ai-soft/50 hover:border-ai/40",
      badge: "bg-ai",
      titleText: "text-ai-dark",
      arrow: "text-ai",
    },
    {
      href: "#quizzes",
      icon: PencilLine,
      title: t("home.practice.eyebrow", "Quizzes"),
      body: t("home.practice.heading", "Recall it yourself, and it stays with you."),
      image: { src: "/images/rabbit-flash.webp", width: 599, height: 1019, className: "right-16 h-32" },
      card: "border-sakura/20 bg-sakura-soft/50 hover:border-sakura/40",
      badge: "bg-sakura",
      titleText: "text-sakura-dark",
      arrow: "text-sakura",
    },
    {
      href: "#daily-challenge",
      icon: MessageCircle,
      title: t("home.challenge.eyebrow", "Daily challenge"),
      body: t("home.challenge.heading", "Then use it, in a chat with Charles Duck."),
      image: { src: "/images/charles.webp", width: 1254, height: 1254, className: "h-28" },
      card: "border-matcha/20 bg-matcha-soft/50 hover:border-matcha/40",
      badge: "bg-matcha",
      titleText: "text-matcha-dark",
      arrow: "text-matcha",
    },
  ];

  return (
    <section className="relative mx-auto max-w-7xl overflow-hidden px-4 pt-12 pb-16 sm:px-6 sm:pt-14 sm:pb-20">
      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              className={cn("hero-float absolute w-60", floatPlacement[index])}
              style={{ animationDelay: `${index * -1.3}s` }}
            />
          ))}
        </div>

        <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
          <Eyebrow>{t("home.hero.eyebrow", "English for Japanese speakers")}</Eyebrow>

          <h1 className="mt-5 font-nunito text-4xl font-black leading-[1.06] tracking-tight text-sumi text-balance sm:text-6xl xl:text-[4rem]">
            {t("home.hero.headline", "English that sticks, five minutes at a time.")}
          </h1>

          <p className="mt-5 max-w-xl text-lg text-sumi-soft text-pretty">
            {t(
              "home.hero.subtext",
              "Learn three words at a time, test yourself straight away, and review each one just before you'd forget it. Then put it to use in a quick chat with Charles Duck.",
            )}
          </p>

          <div className="mt-7 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <StartFreeButton label={t("home.hero.cta_start", "Start learning free")} fullWidth className="sm:w-auto" />
            <Button href="#how-it-works" variant="outline" size="lg" className="h-14 bg-raised px-8 text-base">
              {t("home.hero.cta_secondary", "See how it works")}
            </Button>
          </div>

          <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-sumi-soft">
            {points.map((point) => (
              <li key={point} className="inline-flex items-center gap-1.5">
                <Check aria-hidden className="h-4 w-4 text-matcha" strokeWidth={3} />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2 xl:hidden">
          {features.map((feature) => (
            <li key={feature.title}>
              <FeatureChip feature={feature} />
            </li>
          ))}
        </ul>
      </div>

      {/* The mascots stand behind the panel, so only their top halves peek
          over its edge. */}
      <div className="relative mx-auto mt-24 max-w-6xl">
        <Image
          src="/images/mascot.png"
          alt=""
          width={1224}
          height={1285}
          priority
          className="profile-bob absolute bottom-full left-4 h-32 w-auto translate-y-[34%] sm:left-10 sm:h-40"
        />
        <Image
          src="/images/charles.webp"
          alt=""
          width={1254}
          height={1254}
          priority
          className="absolute right-4 bottom-full h-32 w-auto translate-y-[30%] -scale-x-100 sm:right-10 sm:h-40"
        />

        <div className="relative rounded-4xl border border-card-border bg-raised p-4 shadow-lg sm:p-7">
          <h2 className="text-center font-nunito text-xl font-extrabold text-sumi text-balance sm:text-2xl">
            {t("home.how.heading", "A short routine you can keep every day.")}
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 md:grid-cols-3 md:gap-4">
            {areas.map((area) => {
              const Icon = area.icon;
              return (
                <a
                  key={area.href}
                  href={area.href}
                  className={cn(
                    "group relative flex min-h-40 overflow-hidden rounded-3xl border p-5 transition hover:-translate-y-0.5",
                    area.card,
                  )}
                >
                  <div className="relative z-10 flex flex-col">
                    <div className="flex items-center gap-3">
                      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-washi", area.badge)}>
                        <Icon aria-hidden className="h-5 w-5" strokeWidth={2.25} />
                      </span>
                      <span className={cn("font-nunito text-lg font-extrabold", area.titleText)}>{area.title}</span>
                    </div>
                    <p className="mt-3 max-w-[52%] text-sm leading-snug text-sumi-soft">{area.body}</p>
                  </div>

                  <Image
                    src={area.image.src}
                    alt=""
                    width={area.image.width}
                    height={area.image.height}
                    className={cn(
                      "absolute right-9 -bottom-2 w-auto transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105",
                      area.image.className,
                    )}
                  />

                  <span
                    aria-hidden
                    className={cn(
                      "absolute right-4 bottom-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-raised shadow-sm transition group-hover:translate-x-0.5",
                      area.arrow,
                    )}
                  >
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
