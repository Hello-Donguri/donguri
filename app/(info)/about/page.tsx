import type { Metadata } from "next";
import Image from "next/image";
import { BookOpen, Clock, Heart } from "lucide-react";
import { FeatureList, Section, SectionHeading } from "@/components/landing/section";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "About us — Donguri",
};

export default async function AboutPage() {
  const { t } = await getTranslator();

  return (
    <>
      <Section className="sm:pt-20">
        <SectionHeading
          as="h1"
          accent="acorn"
          eyebrow={t("about.eyebrow", "About us")}
          heading={t("about.heading", "English made for Japanese speakers.")}
          subtext={t(
            "about.subtext",
            "Hello Donguri is a friendlier way to learn everyday English — a few words at a time, with a cast of characters to keep you company.",
          )}
        />
        <Image
          src="/images/mascots.webp"
          alt=""
          width={500}
          height={500}
          sizes="(max-width: 640px) 240px, 320px"
          className="mx-auto mt-10 h-auto w-full max-w-60 object-contain sm:max-w-80"
        />
      </Section>

      <Section tone="washi-soft">
        <div className="grid gap-10 sm:grid-cols-2 sm:items-start">
          <SectionHeading
            center={false}
            accent="acorn"
            eyebrow={t("about.why_eyebrow", "Why we built it")}
            heading={t("about.why_heading", "Learning a language should feel like making friends.")}
            subtext={t(
              "about.why_body",
              "Most English courses are made for learners everywhere. We start from Japanese instead: every word has a picture, audio and a Japanese meaning, and grammar is explained the way you'd explain it to a friend.",
            )}
          />
          <FeatureList
            accent="acorn"
            items={[
              {
                icon: <Heart className="h-5 w-5" aria-hidden="true" />,
                title: t("about.value_friendly_title", "Friendly, never stressful"),
                body: t("about.value_friendly_body", "Mistakes are part of learning. Donguri and friends cheer you on."),
              },
              {
                icon: <Clock className="h-5 w-5" aria-hidden="true" />,
                title: t("about.value_short_title", "A few minutes a day"),
                body: t("about.value_short_body", "Short lessons and reviews that fit around your day."),
              },
              {
                icon: <BookOpen className="h-5 w-5" aria-hidden="true" />,
                title: t("about.value_everyday_title", "English you'll actually use"),
                body: t("about.value_everyday_body", "Everyday words and phrases, practised in real conversations."),
              },
            ]}
          />
        </div>
      </Section>

      <Section className="flex flex-col items-center text-center">
        <h2 className="font-nunito text-2xl font-extrabold tracking-tight text-sumi sm:text-3xl">
          {t("about.cta_heading", "Come and say hello.")}
        </h2>
        <div className="mt-6">
          <StartFreeButton label={t("home.final.cta_start", "Start learning free")} className="px-10" />
        </div>
      </Section>
    </>
  );
}
