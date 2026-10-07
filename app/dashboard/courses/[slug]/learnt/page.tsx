import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getCourseHome, getCourseTitle, getLearntWords } from "@/lib/dal";
import { getTranslator } from "@/lib/i18n/server";
import { STAGE_LEVELS, STAGES, stageLabels } from "@/lib/srs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { WordList } from "@/components/vocab/word-list";
import { LEVEL_STYLE } from "@/components/vocab/level-style";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Learnt words — ${await getCourseTitle(slug)}` };
}

// Every word and grammar point learnt in this course, newest first, each
// with its review stage — open any to revisit its lesson, or flag it to
// come back to. Reached from the shortcut on the course page.
export default async function LearntWordsPage({ params }: PageProps) {
  const { slug } = await params;
  const [{ course }, words, { t, locale }] = await Promise.all([
    getCourseHome(slug),
    getLearntWords(slug),
    getTranslator(),
  ]);
  const stages = stageLabels(locale);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Breadcrumbs
          items={[
            { href: "/dashboard", label: t("breadcrumbs.dashboard", "Dashboard") },
            { href: `/dashboard/courses/${slug}`, label: course.title },
            { label: t("word_list.learnt_title", "Learnt words") },
          ]}
        />
        <PageTitle>{t("word_list.learnt_title", "Learnt words")}</PageTitle>
        <PageSubtitle>
          {t("word_list.learnt_subtitle", "All {{count}} words and grammar points you've learnt. Open any to revisit its lesson.", {
            count: words.length,
          })}
        </PageSubtitle>
      </div>

      {words.length > 0 && <LevelBreakdown words={words} locale={locale} t={t} />}

      <WordList courseSlug={slug} mode="learnt" words={words} stages={stages} />
    </div>
  );
}

// How many learnt words sit at each level, Seed up to Master Oak, drawn
// like the home page's routine cards: a coloured tile each, its tilted
// badge growing bigger as the word does, with the numbered stages inside
// and a little arrow on to the next. A peeking Donguri cheers on the
// Master Oaks, and a chunky bar shows the mix at a glance.
function LevelBreakdown({
  words,
  locale,
  t,
}: {
  words: { stage: number }[];
  locale: string;
  t: Awaited<ReturnType<typeof getTranslator>>["t"];
}) {
  const byStage = new Map<number, number>();
  for (const word of words) byStage.set(word.stage, (byStage.get(word.stage) ?? 0) + 1);

  const levels = STAGE_LEVELS.map((level) => {
    const stages = STAGES.filter((stage) => stage.level === level.level);
    const counts = stages.map((stage) => ({
      name: locale === "ja" ? stage.nameJa : stage.nameEn,
      count: byStage.get(stage.stage) ?? 0,
    }));
    return {
      ...level,
      name: locale === "ja" ? level.nameJa : level.nameEn,
      total: counts.reduce((sum, stage) => sum + stage.count, 0),
      // The numbered stages (Seed 1-3, Sapling 1-2) are worth listing;
      // Oak Tree's two share a name, and Master Oak is just one.
      stages: new Set(counts.map((stage) => stage.name)).size > 1 ? counts : [],
    };
  });

  return (
    <section aria-label={t("word_list.breakdown", "Your words by level")} className="flex flex-col gap-4">
      <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        {levels.map((level, index) => {
          const style = LEVEL_STYLE[level.level];
          const isMaster = level.level === "master";
          return (
            <li key={level.level} className="relative">
              <div
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden rounded-3xl border p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md sm:p-5",
                  style.tile,
                )}
              >
                <div className="flex items-end justify-between gap-2">
                  <span
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:rotate-0 group-hover:scale-110",
                      style.badge,
                      style.chip,
                    )}
                  >
                    <style.icon aria-hidden className={style.iconSize} strokeWidth={2.25} />
                  </span>
                  <p className={cn("font-nunito text-4xl leading-none font-black tabular-nums sm:text-5xl", style.number)}>
                    {level.total}
                  </p>
                </div>

                <p className="mt-3 font-nunito text-lg font-black leading-tight text-sumi">{level.name}</p>

                {level.stages.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {level.stages.map((stage) => (
                      <li
                        key={stage.name}
                        className="rounded-full bg-raised/80 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-sumi-soft ring-1 ring-card-border"
                      >
                        {stage.name} <strong className="font-black text-sumi">{stage.count}</strong>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Donguri, delighted by the Master Oaks. */}
                {isMaster && (
                  <Image
                    src="/images/donguri-peering.webp"
                    alt=""
                    width={434}
                    height={834}
                    className="pointer-events-none absolute -right-2 -bottom-6 h-20 w-auto -rotate-12 transition-transform duration-300 group-hover:-translate-y-2 sm:h-24"
                  />
                )}
              </div>

              {/* On to the next level — between the tiles on wide screens. */}
              {index < levels.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-1/2 -right-4 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-card-border bg-raised text-sumi-soft shadow-sm lg:flex"
                >
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.75} />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* The mix at a glance: chunky, with a gap between each level. */}
      <div aria-hidden className="flex h-4 gap-1 overflow-hidden rounded-full bg-sumi/10 p-0.5">
        {levels.map((level) =>
          level.total > 0 ? (
            <span
              key={level.level}
              className={cn("h-full rounded-full", LEVEL_STYLE[level.level].chip)}
              style={{ width: `${(level.total / words.length) * 100}%` }}
            />
          ) : null,
        )}
      </div>
    </section>
  );
}
