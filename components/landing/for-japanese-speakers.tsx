import { Check, Languages, LogIn, MessageSquareText, Smartphone } from "lucide-react";
import { Section, SectionHeading, FeatureList } from "@/components/landing/section";
import { Button } from "@/components/ui/button";
import type { TFunction } from "@/lib/i18n/translate";

// "Made for Japanese speakers" beside the membership card — the two
// questions a visitor has left once they've seen how it works.
export function ForJapaneseSpeakers({ t }: { t: TFunction }) {
  const icon = "h-5 w-5";
  const items = [
    {
      icon: <Languages aria-hidden className={icon} />,
      title: t("home.japanese.ui_title", "The whole app in Japanese"),
      body: t(
        "home.japanese.ui_body",
        "Switch between Japanese and English at any time. Meanings and example translations are always in Japanese.",
      ),
    },
    {
      icon: <MessageSquareText aria-hidden className={icon} />,
      title: t("home.japanese.feedback_title", "Feedback you can understand"),
      body: t(
        "home.japanese.feedback_body",
        "Daily challenge tips come in simple Japanese as well as English.",
      ),
    },
    {
      icon: <LogIn aria-hidden className={icon} />,
      title: t("home.japanese.login_title", "Sign in with LINE or Google"),
      body: t("home.japanese.login_body", "Or use your email. No new password needed."),
    },
    {
      icon: <Smartphone aria-hidden className={icon} />,
      title: t("home.japanese.phone_title", "On your phone or computer"),
      body: t(
        "home.japanese.phone_body",
        "It runs in your browser, with nothing to install, and your progress follows you.",
      ),
    },
  ];

  const included = [
    t("home.pricing.included_decks", "Every vocabulary and grammar deck"),
    t("home.pricing.included_reviews", "Every lesson, quiz and review, at your own pace"),
    t("home.pricing.included_challenge", "Three daily challenges with Charles Duck"),
    t("home.pricing.included_progress", "XP, levels, outfits, streaks and leaderboards"),
  ];

  return (
    <Section tone="washi-soft">
      <div className="grid items-start gap-14 md:grid-cols-2">
        <div>
          <SectionHeading
            center={false}
            eyebrow={t("home.japanese.eyebrow", "Made for Japanese speakers")}
            heading={t("home.japanese.heading", "Everything explained in the language you think in.")}
          />
          <div className="mt-10">
            <FeatureList items={items} accent="ai" />
          </div>
        </div>

        <div id="pricing" className="scroll-mt-6 rounded-4xl border border-card-border bg-washi p-7 shadow-lg sm:p-9">
          <span className="rounded-full bg-kin/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sumi">
            {t("home.pricing.eyebrow", "Membership")}
          </span>
          <h2 className="mt-5 font-nunito text-3xl font-extrabold tracking-tight text-sumi">
            {t("home.pricing.heading", "Try everything free for 14 days.")}
          </h2>
          <p className="mt-3 text-sumi-soft text-pretty">
            {t(
              "home.pricing.subtext",
              "One membership unlocks the whole app. Add a card to start your trial. You won't be charged until day 15, and you can cancel before then from your account.",
            )}
          </p>

          <ul className="mt-6 flex flex-col gap-3 border-t border-sumi/10 pt-6">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sumi">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-matcha text-washi">
                  <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <Button href="/signup" size="lg" fullWidth className="mt-8 h-14 text-base">
            {t("home.pricing.cta", "Start your free trial")}
          </Button>
          <p className="mt-3 text-center text-xs text-sumi-soft">
            {t("home.pricing.microcopy", "Cancel anytime. The trial is for first-time members.")}
          </p>
        </div>
      </div>
    </Section>
  );
}
