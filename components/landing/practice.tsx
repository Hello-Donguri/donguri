import { BookOpen, Check, Keyboard, Scale, Sparkles } from "lucide-react";
import { Section, SectionHeading, FeatureList } from "@/components/landing/section";
import type { TFunction } from "@/lib/i18n/translate";

export function Practice({ t }: { t: TFunction }) {
  const icon = "h-5 w-5";
  const items = [
    {
      icon: <Keyboard aria-hidden className={icon} />,
      title: t("home.practice.type_title", "Type it, don't just tap it"),
      body: t(
        "home.practice.type_body",
        "Pick the right answer first, then write it yourself — including filling gaps in real sentences.",
      ),
    },
    {
      icon: <Scale aria-hidden className={icon} />,
      title: t("home.practice.fair_title", "Marked fairly"),
      body: t(
        "home.practice.fair_body",
        "Capital letters and extra spaces don't count against you, and any accepted answer is fine.",
      ),
    },
    {
      icon: <BookOpen aria-hidden className={icon} />,
      title: t("home.practice.lesson_title", "The lesson is one tap away"),
      body: t(
        "home.practice.lesson_body",
        "Got one wrong? Open the word's lesson right from the question to see why.",
      ),
    },
    {
      icon: <Sparkles aria-hidden className={icon} />,
      title: t("home.practice.xp_title", "Earn XP as you go"),
      body: t(
        "home.practice.xp_body",
        "+1 XP for every correct answer, and a +5 bonus when you get the whole quiz right.",
      ),
    },
  ];

  return (
    <Section tone="washi-soft">
      <div className="grid items-center gap-14 md:grid-cols-2">
        {/* Text first on a phone; the mock-up on the left from md up. */}
        <div className="order-last md:order-first">
          <ClozeMock t={t} />
        </div>

        <div>
          <SectionHeading
            center={false}
            accent="sakura"
            eyebrow={t("home.practice.eyebrow", "Quizzes")}
            heading={t("home.practice.heading", "Recall it yourself, and it stays with you.")}
            subtext={t(
              "home.practice.subtext",
              "Straight after each lesson, a short quiz makes you bring every word back from memory.",
            )}
          />
          <div className="mt-10">
            <FeatureList items={items} accent="sakura" />
          </div>
        </div>
      </div>
    </Section>
  );
}

// A fill-in-the-blank question after a correct answer, mirroring ClozeCard
// and the feedback banner in components/vocab/session-ui.tsx and
// test-session.tsx.
function ClozeMock({ t }: { t: TFunction }) {
  return (
    <div className="rounded-4xl border border-card-border bg-raised p-6 shadow-lg sm:p-8">
      <div className="rounded-3xl border border-card-border bg-washi-soft p-5 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-sumi-soft">
          {t("home.mock.fill_blank", "Fill in the blank")}
        </p>
        <p lang="ja" className="mt-3 text-sumi-soft">
          昨日、公園に
          <mark className="rounded-md bg-ai-soft px-1 font-semibold text-ai-dark">行きました</mark>。
        </p>
        <p className="mt-2 text-2xl font-semibold leading-relaxed text-sumi">
          I
          <span className="mx-1.5 inline-block min-w-[2.5em] rounded-lg bg-matcha-soft px-2 text-matcha-dark ring-2 ring-matcha">
            went
          </span>
          to the park yesterday.
        </p>
      </div>

      <div className="mt-4 flex h-14 items-center rounded-2xl border-2 border-sumi/10 bg-washi-soft/60 px-6 text-xl text-sumi">
        went
      </div>

      <div className="mt-4 flex items-center gap-4 rounded-3xl bg-matcha-soft px-5 py-4 text-matcha-dark ring-2 ring-matcha/30">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-matcha text-washi shadow-sm">
          <Check aria-hidden className="h-6 w-6" strokeWidth={3} />
        </span>
        <p className="font-bold">{t("home.mock.great_job", "Great job! You got it.")}</p>
      </div>
    </div>
  );
}
