import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { Section, SectionHeading } from "@/components/landing/section";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/site";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Partner with us — Donguri",
};

// A starting point: the heading and a way to get in touch. The page's real
// content (who we partner with, how it works) goes in the section below.
export default async function PartnersPage() {
  const { t } = await getTranslator();

  return (
    <Section className="sm:pt-20">
      <SectionHeading
        as="h1"
        accent="matcha"
        eyebrow={t("partners.eyebrow", "Partner with us")}
        heading={t("partners.heading", "Partner with Hello Donguri.")}
        subtext={t(
          "partners.subtext",
          "Schools, teachers and companies helping Japanese speakers learn English — we'd love to work with you.",
        )}
      />

      <div className="mt-8 flex justify-center">
        <Button href={`mailto:${CONTACT_EMAIL}?subject=Partnership`}>
          <Mail className="h-4 w-4" aria-hidden="true" />
          {t("partners.cta", "Get in touch")}
        </Button>
      </div>
    </Section>
  );
}
