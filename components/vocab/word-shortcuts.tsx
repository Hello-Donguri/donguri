import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { TFunction } from "@/lib/i18n/translate";

// The course page's two ways back into what's been learnt, always shown:
// the lessons flagged during reviews, and every word learnt so far — each
// a card with its count, opening the full list on its own page.
export function WordShortcuts({
  courseSlug,
  flaggedCount,
  learntCount,
  t,
}: {
  courseSlug: string;
  flaggedCount: number;
  learntCount: number;
  t: TFunction;
}) {
  const cards = [
    {
      href: `/dashboard/courses/${courseSlug}/flagged`,
      image: { src: "/images/flag3.webp", width: 640, height: 583 },
      title: t("word_list.flagged_title", "Flagged lessons"),
      count: flaggedCount,
      body:
        flaggedCount > 0
          ? t("word_list.flagged_card", "Lessons you flagged to come back to.")
          : t(
              "word_list.flagged_card_empty",
              "Flag a word during a review to find it here.",
            ),
    },
    {
      href: `/dashboard/courses/${courseSlug}/learnt`,
      image: { src: "/images/books.webp", width: 375, height: 263 },
      title: t("word_list.revisit_title", "Word garden"),
      count: learntCount,
      body: t(
        "word_list.revisit_card",
        "Every word and grammar point you've learnt.",
      ),
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          prefetch
          className="group flex items-center gap-4 rounded-2xl border border-card-border bg-washi-soft p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
        >
          <Image
            src={card.image.src}
            alt=""
            width={card.image.width}
            height={card.image.height}
            className="h-14 w-14 shrink-0 -rotate-6 object-contain transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 font-nunito text-lg font-extrabold leading-tight text-sumi">
              {card.title}
              <span className="rounded-full bg-sumi/5 px-2 py-0.5 text-xs font-bold tabular-nums text-sumi-soft">
                {card.count}
              </span>
            </span>
            <span className="mt-0.5 block text-sm text-sumi-soft">
              {card.body}
            </span>
          </span>
          <ArrowRight
            aria-hidden
            className="h-5 w-5 shrink-0 text-sumi-soft transition group-hover:translate-x-0.5 group-hover:text-sumi"
          />
        </Link>
      ))}
    </section>
  );
}
