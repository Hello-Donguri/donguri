import type { Metadata } from "next";
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

// How many learnt words sit at each level, Seed up to Master Oak — a tile
// each, with the numbered stages within it, above a bar showing the mix.
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
    <section aria-label={t("word_list.breakdown", "Your words by level")} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {levels.map((level) => {
          const style = LEVEL_STYLE[level.level];
          return (
            <div key={level.level} className="rounded-2xl border border-card-border bg-washi-soft p-4">
              <div className="flex items-center gap-2.5">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", style.pill)}>
                  <style.icon aria-hidden className="h-4.5 w-4.5" strokeWidth={2.25} />
                </span>
                <p className="min-w-0 font-nunito text-base font-extrabold leading-tight text-sumi">{level.name}</p>
              </div>
              <p className="mt-3 font-nunito text-3xl font-black tabular-nums text-sumi">{level.total}</p>
              {level.stages.length > 0 && (
                <ul className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-sumi-soft">
                  {level.stages.map((stage) => (
                    <li key={stage.name} className="tabular-nums">
                      {stage.name}: <strong className="font-semibold text-sumi">{stage.count}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* The mix at a glance. */}
      <div aria-hidden className="flex h-2.5 overflow-hidden rounded-full bg-sumi/10">
        {levels.map((level) =>
          level.total > 0 ? (
            <span
              key={level.level}
              className={cn("h-full", LEVEL_STYLE[level.level].pill)}
              style={{ width: `${(level.total / words.length) * 100}%` }}
            />
          ) : null,
        )}
      </div>
    </section>
  );
}
