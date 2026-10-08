import type { Metadata } from "next";
import { Faq } from "@/components/landing/faq";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "FAQ — Donguri",
};

export default async function FaqPage() {
  const { t } = await getTranslator();
  return <Faq t={t} />;
}
