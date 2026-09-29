import { BookOpen, MessageCircle, PenLine, RotateCcw } from "lucide-react";
import { Section, SectionHeading, ICON_CHIP, type Accent } from "@/components/landing/section";
import { cn } from "@/lib/utils";
import type { TFunction } from "@/lib/i18n/translate";

const STEP_BAR: Partial<Record<Accent, string>> = {
  ai: "bg-ai",
  sakura: "bg-sakura",
  kin: "bg-kin",
  matcha: "bg-matcha",
};

export function HowItWorks({ t }: { t: TFunction }) {
  const steps: { icon: React.ReactNode; accent: Accent; title: string; body: string }[] = [
    {
      icon: <BookOpen aria-hidden className="h-5 w-5" />,
      accent: "ai",
      title: t("home.how.learn_title", "Learn three new words"),
      body: t(
        "home.how.learn_body",
        "Each one gets a picture, audio, a Japanese meaning and real example sentences.",
      ),
    },
    {
      icon: <PenLine aria-hidden className="h-5 w-5" />,
      accent: "sakura",
      title: t("home.how.quiz_title", "Test yourself straight away"),
      body: t(
        "home.how.quiz_body",
        "A quick quiz checks you can recognise each word, then type it yourself.",
      ),
    },
    {
      icon: <RotateCcw aria-hidden className="h-5 w-5" />,
      accent: "kin",
      title: t("home.how.review_title", "Review when it's due"),
      body: t(
        "home.how.review_body",
        "Words come back after hours, then days, then weeks, until you know them for good.",
      ),
    },
    {
      icon: <MessageCircle aria-hidden className="h-5 w-5" />,
      accent: "matcha",
      title: t("home.how.challenge_title", "Use it in a real chat"),
      body: t(
        "home.how.challenge_body",
        "The daily challenge asks you to use what you've learnt in a friendly chat with Charles Duck.",
      ),
    },
  ];

  return (
    <Section id="how-it-works" tone="washi-soft">
      <SectionHeading
        eyebrow={t("home.how.eyebrow", "How it works")}
        heading={t("home.how.heading", "A short routine you can keep every day.")}
        subtext={t(
          "home.how.subtext",
          "Four steps, a few minutes each. Your dashboard always shows what's next.",
        )}
      />

      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="relative flex flex-col overflow-hidden rounded-3xl border border-header-border bg-raised p-6 shadow-md shadow-sumi/5 dark:border-card-border dark:shadow-sm"
          >
            {/* Each step's own colour as a thin top bar — enough to tell the
                four apart without competing with the buttons. */}
            <span
              aria-hidden="true"
              className={cn("absolute inset-x-0 top-0 h-1 dark:hidden", STEP_BAR[step.accent])}
            />
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl",
                  ICON_CHIP[step.accent],
                )}
              >
                {step.icon}
              </span>
              <span className="font-nunito text-3xl font-extrabold text-acorn/30 dark:text-sumi/10">
                {index + 1}
              </span>
            </div>
            <h3 className="mt-5 font-semibold text-sumi">{step.title}</h3>
            <p className="mt-1.5 text-sm text-sumi-soft text-pretty">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
