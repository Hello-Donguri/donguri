import type { Metadata } from "next";
import { getCourseHome, getCourseTitle, getLearntWords } from "@/lib/dal";
import { getTranslator } from "@/lib/i18n/server";
import { STAGE_LEVELS, STAGES, stageLabels } from "@/lib/srs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { WordList } from "@/components/vocab/word-list";
import { WordGarden, type GardenLevel } from "@/components/vocab/word-garden";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Learnt words — ${await getCourseTitle(slug)}` };
}

// Every word and grammar point learnt in this course, newest first, each
// with its review level — open any to revisit its lesson, or flag it to
// come back to. Opens with the "word garden": how many words are at each
// level, Seed up to Master Oak. Reached from the shortcut on the course
// page.
export default async function LearntWordsPage({ params }: PageProps) {
  const { slug } = await params;
  const [{ course }, words, { t, locale }] = await Promise.all([
    getCourseHome(slug),
    getLearntWords(slug),
    getTranslator(),
  ]);
  const stages = stageLabels(locale);
  const levels = gardenLevels(words, locale, {
    seed: t("word_list.caption_seed", "Just planted"),
    sapling: t("word_list.caption_sapling", "Growing"),
    oak: t("word_list.caption_oak", "Nearly there"),
    master: t("word_list.caption_master", "Mastered"),
  });
  const masters = levels.find((level) => level.level === "master")?.total ?? 0;

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
          {t("word_list.learnt_subtitle_short", "Open any word to revisit its lesson, or flag it to come back to.")}
        </PageSubtitle>
      </div>

      {words.length > 0 && (
        <WordGarden
          levels={levels}
          totalWords={words.length}
          title={t("word_list.garden_title", "Your word garden")}
          totalLabel={t("word_list.garden_total", "words planted")}
          howItGrows={t(
            "word_list.garden_how",
            "Every correct review grows a word one step: Seeds take 3 steps, Saplings 2, then Oak Tree and Master Oak.",
          )}
          body={
            masters > 0
              ? t("word_list.garden_body_masters", "{{count}} have already grown into Master Oaks. Keep reviewing to grow the rest!", {
                  count: masters,
                })
              : t("word_list.garden_body", "Every review helps them grow — from a seed all the way to a Master Oak.")
          }
        />
      )}

      <WordList
        courseSlug={slug}
        mode="learnt"
        words={words}
        stages={stages}
        levels={levels.map(({ level, name }) => ({ level, name }))}
      />
    </div>
  );
}

// How many learnt words sit at each level, with the numbered stages within
// it where they have their own names (Seed 1-3, Sapling 1-2).
function gardenLevels(
  words: { stage: number }[],
  locale: string,
  captions: Record<GardenLevel["level"], string>,
): GardenLevel[] {
  const byStage = new Map<number, number>();
  for (const word of words) byStage.set(word.stage, (byStage.get(word.stage) ?? 0) + 1);

  return STAGE_LEVELS.map((level) => {
    const counts = STAGES.filter((stage) => stage.level === level.level).map((stage) => ({
      name: locale === "ja" ? stage.nameJa : stage.nameEn,
      count: byStage.get(stage.stage) ?? 0,
    }));
    return {
      level: level.level,
      name: locale === "ja" ? level.nameJa : level.nameEn,
      caption: captions[level.level],
      total: counts.reduce((sum, stage) => sum + stage.count, 0),
      stages: new Set(counts.map((stage) => stage.name)).size > 1 ? counts : [],
    };
  });
}
