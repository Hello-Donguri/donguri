import Link from "next/link";
import { ArrowRight, Earth, Sofa } from "lucide-react";
import type { TFunction } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

// The course page's way into the world map and the learner's room — two
// cards in the same style as WordShortcuts.
export function WorldShortcuts({ courseSlug, itemCount, t }: { courseSlug: string; itemCount: number; t: TFunction }) {
  const cards = [
    {
      href: `/dashboard/courses/${courseSlug}/world`,
      Icon: Earth,
      tone: "bg-ai-soft text-ai-dark",
      title: t("world.map_title", "World map"),
      body: t("world.map_card", "Visit a country and pick a souvenir."),
    },
    {
      href: `/dashboard/courses/${courseSlug}/room`,
      Icon: Sofa,
      tone: "bg-kin/25 text-acorn",
      title: t("world.see_my_room", "See my room"),
      count: itemCount,
      body: t("world.room_card", "Arrange the souvenirs you've collected."),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cards.map(({ Icon, ...card }) => (
        <Link
          key={card.href}
          href={card.href}
          className="group flex items-center gap-4 rounded-2xl border border-card-border bg-washi-soft p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
        >
          <span
            className={cn(
              "flex h-14 w-14 shrink-0 -rotate-6 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110",
              card.tone,
            )}
          >
            <Icon aria-hidden className="h-7 w-7" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 font-nunito text-lg font-extrabold leading-tight text-sumi">
              {card.title}
              {card.count !== undefined && (
                <span className="rounded-full bg-sumi/5 px-2 py-0.5 text-xs font-bold tabular-nums text-sumi-soft">
                  {card.count}
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-sm text-sumi-soft">{card.body}</span>
          </span>
          <ArrowRight
            aria-hidden
            className="h-5 w-5 shrink-0 text-sumi-soft transition group-hover:translate-x-0.5 group-hover:text-sumi"
          />
        </Link>
      ))}
    </div>
  );
}
