import { Plus } from "lucide-react";
import { Section, SectionHeading } from "@/components/landing/section";
import type { TFunction } from "@/lib/i18n/translate";

// The FAQ page (/faq) — once a home-page section, now its own page.
export function Faq({ t }: { t: TFunction }) {
  const faqs = [
    {
      q: t("home.faq.beginners_q", "I'm a complete beginner. Is this for me?"),
      a: t(
        "home.faq.beginners_a",
        "Yes. Decks start with everyday words and simple grammar, and every word comes with a picture, audio and a Japanese meaning, so you never have to guess.",
      ),
    },
    {
      q: t("home.faq.time_q", "How much time does it take each day?"),
      a: t(
        "home.faq.time_a",
        "A few minutes is enough. Three new words, a short quiz and whatever reviews are due usually take five to ten minutes. You can always do more.",
      ),
    },
    {
      q: t("home.faq.reviews_q", "What happens if I miss a day?"),
      a: t(
        "home.faq.reviews_a",
        "Nothing is lost. Due reviews wait for you on your dashboard. Your streak resets, but your words, XP and level stay.",
      ),
    },
    {
      q: t("home.faq.choose_q", "Can I choose what to learn?"),
      a: t(
        "home.faq.choose_a",
        "Yes. Browse the decks and add the ones you want to your word list. New words come from the decks you've added, and you can skip words you already know.",
      ),
    },
    {
      q: t("home.faq.free_q", "What can I do for free?"),
      a: t(
        "home.faq.free_a",
        "Learn your first 9 words straight away, with no sign-up. Make a free account to save your progress and learn up to 40 words and 20 grammar points, with reviews included. After that, a membership unlocks everything, and you can cancel anytime.",
      ),
    },
    {
      q: t("home.faq.cancel_q", "How do I cancel?"),
      a: t(
        "home.faq.cancel_a",
        "From the billing page in your account, at any time. You keep access until the end of the period you've paid for.",
      ),
    },
    {
      q: t("home.faq.device_q", "Is there an app to download?"),
      a: t(
        "home.faq.device_a",
        "No download needed. Hello Donguri runs in the browser on your phone, tablet or computer, and your progress is saved to your account.",
      ),
    },
  ];

  return (
    <Section className="sm:pt-20">
      <SectionHeading
        as="h1"
        eyebrow={t("home.faq.eyebrow", "Questions")}
        heading={t("home.faq.heading", "Good to know before you start.")}
      />

      <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-3">
        {faqs.map((faq) => (
          <details
            key={faq.q}
            className="group rounded-2xl border border-card-border bg-washi-soft px-5 py-4"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-sumi marker:content-none [&::-webkit-details-marker]:hidden">
              {faq.q}
              <Plus
                aria-hidden
                className="h-5 w-5 shrink-0 text-sumi-soft transition-transform group-open:rotate-45"
              />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-sumi-soft">{faq.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
