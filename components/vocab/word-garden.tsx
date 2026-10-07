import Image from "next/image";
import type { StageLevel } from "@/lib/srs";
import { LEVEL_STYLE } from "@/components/vocab/level-style";
import { cn } from "@/lib/utils";

export type GardenLevel = {
  level: StageLevel;
  name: string;
  // What the level means, in a couple of words ("Just planted").
  caption: string;
  total: number;
  // The numbered stages within it, spelt out for the block's tooltip
  // ("Seed 1: 3 words") — empty for Oak Tree and Master Oak.
  stages: { name: string; count: number }[];
};

// The learnt-words page's header: "your word garden". Donguri, the total so
// far and a line of encouragement, beside a block for each level, Seed to
// Master Oak — its badge growing bigger level by level, a big count, its
// name and what it means, each in its own colour. A level with no words
// yet is shown faded. Kept short, so the words themselves start near
// the top of the page.
export function WordGarden({
  levels,
  totalWords,
  title,
  body,
  totalLabel,
  howItGrows,
}: {
  levels: GardenLevel[];
  totalWords: number;
  title: string;
  body: string;
  totalLabel: string;
  howItGrows: string;
}) {
  return (
    <section className="relative isolate">
      <div aria-hidden className="absolute -inset-1.5 -z-10 rotate-[0.5deg] rounded-[2.1rem] bg-acorn-soft" />
      <div className="grid gap-4 overflow-hidden rounded-4xl border border-card-border bg-raised p-3 shadow-md sm:p-4 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-stretch lg:gap-5">
        {/* Donguri, the total and a cheer, on a green panel. */}
        <div className="flex items-center gap-3.5 rounded-3xl bg-matcha-soft px-4 py-3">
          <Image
            src="/images/mascot.png"
            alt=""
            width={1224}
            height={1285}
            className="profile-bob h-16 w-auto shrink-0 sm:h-20"
          />
          <div className="min-w-0">
            <p className="font-nunito text-xs font-extrabold uppercase tracking-[0.16em] text-matcha-dark">{title}</p>
            <p className="flex items-baseline gap-2">
              <span className="font-nunito text-4xl leading-tight font-black tabular-nums text-sumi">{totalWords}</span>
              <span className="font-nunito text-sm font-bold text-sumi-soft">{totalLabel}</span>
            </p>
            <p className="text-sm text-sumi-soft text-pretty">{body}</p>
          </div>
        </div>

        {/* A block per level. */}
        <div className="flex flex-col justify-center lg:py-1 lg:pr-1">
          <ol className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {levels.map((level) => {
              const style = LEVEL_STYLE[level.level];
              const empty = level.total === 0;
              const tooltip = level.stages.map((stage) => `${stage.name}: ${stage.count}`).join(" · ");
              return (
                <li
                  key={level.level}
                  title={tooltip || undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 transition",
                    style.tile,
                    // Not reached yet: its colour, faded.
                    empty && "opacity-55",
                  )}
                >
                  {/* A fixed-size spot, so the blocks line up however big
                      the badge has grown. */}
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center">
                    <span
                      className={cn(
                        "flex items-center justify-center rounded-xl shadow-sm",
                        style.badge,
                        style.chip,
                      )}
                    >
                      <style.icon aria-hidden className={style.iconSize} strokeWidth={2.25} />
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block font-nunito text-2xl leading-none font-black tabular-nums",
                        style.number,
                      )}
                    >
                      {level.total}
                    </span>
                    <span className="mt-0.5 block font-nunito text-sm leading-tight font-black text-sumi">
                      {level.name}
                    </span>
                    <span className="block truncate text-[11px] text-sumi-soft">{level.caption}</span>
                    {tooltip && <span className="sr-only">{tooltip}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs text-sumi-soft">{howItGrows}</p>
        </div>
      </div>
    </section>
  );
}
