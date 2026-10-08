import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, Mail } from "lucide-react";
import { Section, SectionHeading } from "@/components/landing/section";
import { SocialLinks } from "@/components/landing/social-icons";
import { CONTACT_EMAIL } from "@/lib/site";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Contact us — Donguri",
};

export default async function ContactPage() {
  const { t } = await getTranslator();

  return (
    <Section className="sm:pt-20">
      <SectionHeading
        as="h1"
        eyebrow={t("contact.eyebrow", "Contact us")}
        heading={t("contact.heading", "We'd love to hear from you.")}
        subtext={t(
          "contact.subtext",
          "Questions, feedback or a word you'd like us to add — send us a message and we'll get back to you.",
        )}
      />

      <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="flex flex-col gap-3 rounded-2xl border border-card-border bg-washi-soft p-6 transition hover:border-sumi/30"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ai-soft text-ai-dark">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-semibold text-sumi">{t("contact.email_title", "Email us")}</span>
          <span className="text-sm break-all text-sumi-soft">{CONTACT_EMAIL}</span>
        </a>

        <Link
          href="/faq"
          className="flex flex-col gap-3 rounded-2xl border border-card-border bg-washi-soft p-6 transition hover:border-sumi/30"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-matcha-soft text-matcha-dark">
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-semibold text-sumi">{t("contact.faq_title", "Read the FAQ")}</span>
          <span className="text-sm text-sumi-soft">
            {t("contact.faq_body", "Answers to the questions we hear most.")}
          </span>
        </Link>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        <p className="text-sm text-sumi-soft">{t("contact.social", "Or follow us for news and updates")}</p>
        <SocialLinks />
      </div>
    </Section>
  );
}
