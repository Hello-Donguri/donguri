import { CheckCircle2, ImageIcon, Mic } from "lucide-react";
import type { TFunction } from "@/lib/i18n/translate";
import type { WordAudio } from "@/lib/definitions";
import { cn } from "@/lib/utils";

// The admin deck page's media round-up: how many of its words have an
// uploaded picture, a female recording and a male recording, each with a
// bar and what's still missing — and how many have all three.
export function DeckMediaSummary({
  words,
  t,
}: {
  words: { imageKey: string | null; audio: WordAudio | null }[];
  t: TFunction;
}) {
  const total = words.length;
  const images = words.filter((word) => word.imageKey).length;
  const female = words.filter((word) => word.audio?.female).length;
  const male = words.filter((word) => word.audio?.male).length;
  const complete = words.filter((word) => word.imageKey && word.audio?.female && word.audio?.male).length;

  const stats = [
    { key: "images", label: t("admin_deck_media.images", "Images"), Icon: ImageIcon, count: images, tone: "bg-ai", tile: "bg-ai-soft text-ai-dark" },
    { key: "female", label: t("admin_deck_media.female", "♀ Female voice"), Icon: Mic, count: female, tone: "bg-sakura", tile: "bg-sakura-soft text-sakura-dark" },
    { key: "male", label: t("admin_deck_media.male", "♂ Male voice"), Icon: Mic, count: male, tone: "bg-matcha", tile: "bg-matcha-soft text-matcha-dark" },
  ];

  return (
    <section className="rounded-2xl border border-card-border bg-washi-soft p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-sumi-soft">
          {t("admin_deck_media.title", "Media")}
        </h2>
        <p className="inline-flex items-center gap-1.5 text-sm text-sumi-soft">
          <CheckCircle2 aria-hidden className={cn("h-4 w-4", complete === total ? "text-matcha" : "text-sumi-soft/60")} />
          {t("admin_deck_media.complete", "{{count}} of {{total}} words have everything", { count: complete, total })}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ key, label, Icon, count, tone, tile }) => {
          const percent = total === 0 ? 0 : Math.round((count / total) * 100);
          const missing = total - count;
          return (
            <div key={key} className="flex items-start gap-3">
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tile)}>
                <Icon aria-hidden className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-sumi">{label}</span>
                  <span className="text-sm tabular-nums text-sumi-soft">
                    <span className="font-semibold text-sumi">{count}</span> / {total}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={label}
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={count}
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-sumi/10"
                >
                  <div className={cn("h-full rounded-full", tone)} style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-1 text-xs text-sumi-soft">
                  {missing === 0
                    ? t("admin_deck_media.all_done", "All done")
                    : t("admin_deck_media.missing", "{{count}} missing · {{percent}}%", { count: missing, percent })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
