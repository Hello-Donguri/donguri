import Image from "next/image";
import {
  ArrowRight,
  Clock,
  ImageIcon,
  Volume2,
  BookOpen,
  MessageCircle,
  PencilLine,
  type LucideIcon,
} from "lucide-react";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { FallingLeaf } from "@/components/landing/falling-leaf";
import { ICON_CHIP, type Accent } from "@/components/landing/section";
import { cn } from "@/lib/utils";
import type { TFunction } from "@/lib/i18n/translate";

// The headline with one word picked out — "Grows" — on a slightly tilted
// acorn-coloured patch, like a sticker pressed on. The word comes from its
// own translation, so each language picks its own; if it isn't in the
// headline, the headline shows plain.
function Headline({ text, highlight }: { text: string; highlight: string }) {
  const index = highlight ? text.indexOf(highlight) : -1;
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <span className="inline-block -rotate-2 whitespace-nowrap rounded-2xl bg-acorn-soft px-3 pb-1">
        {highlight}
      </span>
      {text.slice(index + highlight.length)}
    </>
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
};

type Feature = { icon: LucideIcon; accent: Accent; title: string };

// One feature as a small, soft pill — a quiet row under the hero's iPad, so
// they say what's inside without pulling the eye from the button.
function FeatureChip({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-card-border bg-raised/80 py-1 pr-3.5 pl-1 text-sm font-semibold text-sumi-soft">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          ICON_CHIP[feature.accent],
        )}
      >
        <Icon aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
      {feature.title}
    </span>
  );
}

export function Hero({ t }: { t: TFunction }) {
  // Where each pill sits around the iPad on wide screens: one pinned to
  // each corner, the same distance in, with mirrored tilts — the top pair
  // leaning in towards each other, the bottom pair leaning out.
  const chipPlacement = [
    "lg:left-0 lg:top-0 lg:-rotate-2",
    "lg:right-0 lg:top-0 lg:rotate-2",
    "lg:left-0 lg:bottom-0 lg:rotate-2",
    "lg:right-0 lg:bottom-0 lg:-rotate-2",
  ];

  const features: Feature[] = [
    {
      icon: ImageIcon,
      accent: "ai",
      title: t("home.hero.chip_pictures", "Learn with pictures"),
    },
    {
      icon: Volume2,
      accent: "matcha",
      title: t("home.hero.chip_audio", "Hear every word"),
    },
    {
      icon: Clock,
      accent: "kin",
      title: t("home.hero.chip_reviews", "Reviews that stick"),
    },
    {
      icon: MessageCircle,
      accent: "sakura",
      title: t("home.hero.chip_chat", "Practise real chats"),
    },
  ];

  // The daily routine, in order — each a numbered step in its own colour,
  // linking to the section that explains it. Classes written out in full
  // so Tailwind finds them.
  const areas: Area[] = [
    {
      href: "#lessons",
      icon: BookOpen,
      title: t("home.routine.learn_title", "Learn"),
      body: t(
        "home.routine.learn_body",
        "Three new words, with pictures and sound.",
      ),
      image: {
        src: "/images/rabbit-reading.webp",
        width: 905,
        height: 929,
        className: "h-24",
      },
      card: "border-ai/20 bg-ai-soft/50 hover:border-ai/40",
      badge: "bg-ai text-washi",
      titleText: "text-ai-dark",
    },
    {
      href: "#quizzes",
      icon: PencilLine,
      title: t("home.routine.quiz_title", "Quiz"),
      body: t("home.routine.quiz_body", "Test yourself straight away."),
      image: {
        src: "/images/rabbit-flash.webp",
        width: 599,
        height: 1019,
        className: "h-28",
      },
      card: "border-sakura/20 bg-sakura-soft/50 hover:border-sakura/40",
      badge: "bg-sakura text-washi",
      titleText: "text-sakura-dark",
    },
    {
      href: "#reviews",
      icon: Clock,
      title: t("home.routine.review_title", "Review"),
      body: t(
        "home.routine.review_body",
        "Words come back just before you'd forget.",
      ),
      image: {
        src: "/images/donguri-peering.webp",
        width: 434,
        height: 834,
        className: "h-28",
      },
      card: "border-kin/30 bg-kin/10 hover:border-kin/50",
      badge: "bg-kin text-ink-on-light",
      titleText: "text-acorn",
    },
    {
      href: "#daily-challenge",
      icon: MessageCircle,
      title: t("home.routine.chat_title", "Daily chat"),
      body: t(
        "home.routine.chat_body",
        "Use it all in a quick chat with Charles Duck.",
      ),
      image: {
        src: "/images/charles.webp",
        width: 1254,
        height: 1254,
        className: "h-24",
      },
      card: "border-matcha/20 bg-matcha-soft/50 hover:border-matcha/40",
      badge: "bg-matcha text-washi",
      titleText: "text-matcha-dark",
    },
  ];

  return (
    <section className="relative mx-auto max-w-7xl overflow-hidden px-4 pt-12 pb-16 sm:px-6 sm:pt-14 sm:pb-20">
      {/* Two columns on wide screens: the pitch on the left, Donguri at the
          iPad on the right. Stacked, centred, on narrower ones. */}
      {/* The leaf falls through this part only — behind the headline and
          iPad — and has faded away before the panel below. */}
      <div className="relative">
        {/* First, so it's underneath: the content sits above it. */}
        <FallingLeaf />
        <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <h1 className="font-nunito text-5xl font-black leading-[1.05] tracking-tight text-sumi text-balance sm:text-6xl xl:text-7xl">
              <Headline
                text={t("home.hero.headline", "English That Grows With You")}
                highlight={t("home.hero.headline_highlight", "Grows")}
              />
            </h1>

            <p className="mt-7 max-w-md text-lg text-sumi-soft text-pretty sm:text-xl">
              {t(
                "home.hero.subtext",
                "Learn English with bite-sized lessons and quick quizzes, then practise real conversations with Charles Duck, your friendly chat buddy.",
              )}
            </p>

            {/* The one thing to do here: start, as a guest — with the
              reassurance in the button itself. As wide as the text above. */}
            <div className="mt-9 w-full max-w-md">
              <StartFreeButton
                label={t("home.hero.cta_start", "Start learning free")}
                note={t(
                  "home.hero.point_no_signup",
                  "No sign-up needed to start",
                )}
                fullWidth
                className="h-auto min-h-16 py-2.5 px-10 text-lg shadow-lg shadow-ai/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-ai/30"
              />
            </div>
          </div>

          {/* Donguri at the iPad, with one sticker slapped on its corner —
            free to start, like the button — and the features as quiet
            pills: one at each corner of the iPad on wide screens (padded top
            and bottom so they sit beside it; the sticker moves down its
            right edge to make room),
            in a 2×2 grid under it on narrower ones. */}
          <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 lg:relative lg:max-w-none lg:py-14">
            <div className="relative w-full">
              <Image
                src="/images/ipad3.webp"
                alt=""
                width={1485}
                height={937}
                priority
                className="h-auto w-full"
              />
              <span
                aria-hidden
                className="absolute -top-3 right-2 flex h-24 w-24 rotate-12 lg:top-[20%] lg:-right-14 flex-col items-center justify-center rounded-full border-4 border-raised bg-kin text-center font-nunito leading-none text-ink-on-light shadow-lg sm:-top-4 sm:right-4 sm:h-28 sm:w-28"
              >
                <span className="px-2 text-[11px] font-bold sm:text-xs">
                  {t("home.hero.sticker_top", "Get started")}
                </span>
                <span className="mt-1 text-xl font-black sm:text-2xl">
                  {t("home.hero.sticker_main", "for free")}
                </span>
              </span>
            </div>

            <ul className="grid grid-cols-1 justify-items-center gap-2 sm:grid-cols-2">
              {features.map((feature, index) => (
                <li
                  key={feature.title}
                  className={cn(
                    index % 2 === 0
                      ? "sm:justify-self-end"
                      : "sm:justify-self-start",
                    "lg:absolute",
                    chipPlacement[index],
                  )}
                >
                  <FeatureChip feature={feature} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* The mascots stand behind the panel, so only their top halves peek
          over its edge. */}
      <div className="relative mx-auto mt-32 max-w-6xl lg:mt-40">
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
          <div className="text-center">
            <h2 className="font-nunito text-2xl font-black tracking-tight text-sumi text-balance sm:text-3xl">
              {t("home.routine.heading", "Your daily routine")}
            </h2>
            <p className="mt-1.5 text-sm text-sumi-soft sm:text-base">
              {t(
                "home.routine.subtext",
                "Four quick steps. A few minutes a day.",
              )}
            </p>
          </div>

          <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {areas.map((area, index) => {
              const Icon = area.icon;
              return (
                <li key={area.href} className="relative">
                  <a
                    href={area.href}
                    className={cn(
                      "group relative flex h-full min-h-44 flex-col overflow-hidden rounded-3xl border p-5 transition hover:-translate-y-1",
                      area.card,
                    )}
                  >
                    <div className="relative z-10 flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 -rotate-6 items-center justify-center rounded-2xl font-nunito text-xl font-black shadow-sm transition-transform group-hover:rotate-0",
                          area.badge,
                        )}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={cn(
                          "flex items-center gap-1.5 font-nunito text-xl font-black",
                          area.titleText,
                        )}
                      >
                        <Icon
                          aria-hidden
                          className="h-5 w-5"
                          strokeWidth={2.5}
                        />
                        {area.title}
                      </span>
                    </div>
                    <p className="relative z-10 mt-3 max-w-[60%] text-sm font-medium leading-snug text-sumi-soft">
                      {area.body}
                    </p>

                    <Image
                      src={area.image.src}
                      alt=""
                      width={area.image.width}
                      height={area.image.height}
                      className={cn(
                        "absolute right-3 -bottom-2 w-auto transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105",
                        area.image.className,
                      )}
                    />
                  </a>

                  {/* On to the next step — between the cards on wide screens. */}
                  {index < areas.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute top-1/2 -right-4 z-20 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-card-border bg-raised text-sumi-soft shadow-sm lg:flex"
                    >
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.75} />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
