import { Check, Languages, LogIn, MessageSquareText, Smartphone } from "lucide-react";
import { Section, SectionHeading, FeatureList, Eyebrow } from "@/components/landing/section";
import { StartFreeButton } from "@/components/landing/start-free-button";
import type { TFunction } from "@/lib/i18n/translate";

// "Made for Japanese speakers" beside the membership card — the two
// questions a visitor has left once they've seen how it works.
// `priceLabel` is the membership price ("¥850/month"), or null when it
// couldn't be fetched from Stripe — then the price line is just left out.
export function ForJapaneseSpeakers({ t, priceLabel }: { t: TFunction; priceLabel: string | null }) {
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
            <FeatureList items={items} accent="sage" />
          </div>
        </div>

        <div id="pricing" className="scroll-mt-6 rounded-4xl border border-card-border bg-raised p-7 shadow-lg sm:p-9">
          <Eyebrow accent="kin">{t("home.pricing.eyebrow", "Membership")}</Eyebrow>
          <h2 className="mt-5 font-nunito text-3xl font-extrabold tracking-tight text-sumi">
            {t("home.pricing.heading_free", "Start free. Become a member when you're ready.")}
          </h2>
          <p className="mt-3 text-sumi-soft text-pretty">
            {t(
              "home.pricing.subtext_free",
              "Try 9 words without signing up, then learn 40 words and 20 grammar points free with an account. A membership unlocks everything, including daily chats with Charles Duck.",
            )}
          </p>
          {priceLabel && (
            <p className="mt-5 font-nunito text-sumi">
              <span className="text-4xl font-black tracking-tight">{priceLabel.split("/")[0]}</span>
              <span className="text-sumi-soft"> / {t("billing.per_month", "month")}</span>
            </p>
          )}

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

          <div className="mt-8">
            <StartFreeButton label={t("home.pricing.cta_start", "Start learning free")} fullWidth />
          </div>
          <p className="mt-3 text-center text-xs text-sumi-soft">
            {t("home.pricing.microcopy_free", "No card needed to start. Cancel your membership anytime.")}
          </p>
        </div>
      </div>
    </Section>
  );
}
