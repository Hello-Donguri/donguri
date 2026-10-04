import Image from "next/image";
import { ArrowDown, Gauge, Lightbulb, MessageCircle, Sparkles, Target } from "lucide-react";
import { Section, SectionHeading, FeatureList } from "@/components/landing/section";
import type { TFunction } from "@/lib/i18n/translate";

export function DailyChallenge({ t }: { t: TFunction }) {
  const icon = "h-5 w-5";
  const items = [
    {
      icon: <Target aria-hidden className={icon} />,
      title: t("home.challenge.target_title", "A word you've learnt, in a real conversation"),
      body: t(
        "home.challenge.target_body",
        "Charles chats about everyday things and steers towards a word or grammar point you've studied. Use it to finish.",
      ),
    },
    {
      icon: <Gauge aria-hidden className={icon} />,
      title: t("home.challenge.scores_title", "Scored on four things"),
      body: t(
        "home.challenge.scores_body",
        "Grammar, natural phrasing, whether you answered what he asked, and how much you said.",
      ),
    },
    {
      icon: <Lightbulb aria-hidden className={icon} />,
      title: t("home.challenge.tips_title", "A more natural way to say it"),
      body: t(
        "home.challenge.tips_body",
        "See your own sentence rewritten the way a native speaker would say it, with tips in Japanese.",
      ),
    },
    {
      icon: <Sparkles aria-hidden className={icon} />,
      title: t("home.challenge.xp_title", "Up to 7 XP a chat"),
      body: t("home.challenge.xp_body", "Three challenges a day. The better your answer, the more you earn."),
    },
  ];

  return (
    <Section id="daily-challenge" tone="washi-soft">
      <div className="grid items-center gap-14 md:grid-cols-2">
        <div>
          <SectionHeading
            center={false}
            accent="matcha"
            eyebrow={t("home.challenge.eyebrow", "Daily challenge")}
            heading={t("home.challenge.heading", "Then use it, in a chat with Charles Duck.")}
            subtext={t(
              "home.challenge.subtext",
              "Knowing a word and using it are different skills. The daily challenge is where you practise the second one.",
            )}
          />
          <div className="mt-10">
            <FeatureList items={items} accent="matcha" />
          </div>
        </div>

        <ChatMock t={t} />
      </div>
    </Section>
  );
}

// One finished challenge: Charles's question, the learner's reply using the
// target, then the "Try" rewrite and scores (see FeedbackDetail in
// components/vocab/daily-challenge-chat.tsx).
function ChatMock({ t }: { t: TFunction }) {
  const scores = [
    { label: t("home.mock.score_grammar", "Grammar"), score: 9 },
    { label: t("home.mock.score_natural", "Natural phrasing"), score: 7 },
    { label: t("home.mock.score_relevance", "Relevance"), score: 10 },
    { label: t("home.mock.score_complexity", "Complexity"), score: 8 },
  ];

  return (
    <div className="rounded-4xl border border-card-border bg-raised p-5 shadow-lg sm:p-7">
      <div className="flex items-center gap-3 border-b border-sumi/10 pb-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-card-border">
          <Image src="/images/charles.webp" alt="" width={1254} height={1254} className="h-10 w-10" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sumi">Charles Duck</p>
          <p className="text-xs text-sumi-soft">
            {t("home.mock.todays_word", "Today's word:")}{" "}
            <span className="font-semibold text-matcha-dark">because</span>
          </p>
        </div>
        <MessageCircle aria-hidden className="h-5 w-5 text-sumi-soft" />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <p className="max-w-[85%] self-start rounded-2xl rounded-tl-md bg-washi-soft px-4 py-2.5 text-sumi">
          Nice! Why did you go to the cafe yesterday?
        </p>
        <p className="max-w-[85%] self-end rounded-2xl rounded-tr-md bg-ai px-4 py-2.5 text-washi">
          I go to the cafe because it is quiet and I can study.
        </p>
      </div>

      <div className="mt-5 flex flex-col">
        <span className="relative z-10 mx-auto -mb-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-washi text-sumi-soft ring-1 ring-card-border">
          <ArrowDown aria-hidden className="h-4 w-4" />
        </span>
        <div className="rounded-2xl bg-ai-soft/70 px-4 py-3">
          <p className="text-xs font-semibold text-ai">{t("home.mock.try", "Try")}</p>
          <p className="mt-0.5 font-semibold text-ai">
            I went to the cafe because it was quiet and I could study.
          </p>
        </div>
        <div className="mt-3 flex gap-3 rounded-2xl bg-kin/10 px-4 py-3 text-sm text-sumi">
          <Lightbulb aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-kin" />
          <p lang="ja">
            &quot;went&quot; のように過去形にすると、昨日のことだと自然に伝わります。
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {scores.map(({ label, score }) => (
          <div key={label} className="rounded-xl bg-washi-soft px-3 py-2 text-center">
            <dt className="truncate text-[11px] text-sumi-soft">{label}</dt>
            <dd className="font-nunito text-lg font-extrabold text-sumi">
              {score}
              <span className="text-xs font-semibold text-sumi-soft">/10</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
