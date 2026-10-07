import type { Metadata } from "next";
import { getCourseHome, getCourseTitle, getFlaggedWords } from "@/lib/dal";
import { getTranslator } from "@/lib/i18n/server";
import { stageLabels } from "@/lib/srs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { WordList } from "@/components/vocab/word-list";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Flagged lessons — ${await getCourseTitle(slug)}` };
}

// Every lesson flagged in this course (see FlagButton), newest first —
// open one to go over it again, or unflag it once it's sunk in. Reached
// from the shortcut on the course page.
export default async function FlaggedLessonsPage({ params }: PageProps) {
  const { slug } = await params;
  const [{ course }, words, { t, locale }] = await Promise.all([
    getCourseHome(slug),
    getFlaggedWords(slug),
    getTranslator(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Breadcrumbs
          items={[
            { href: "/dashboard", label: t("breadcrumbs.dashboard", "Dashboard") },
            { href: `/dashboard/courses/${slug}`, label: course.title },
            { label: t("word_list.flagged_title", "Flagged lessons") },
          ]}
        />
        <PageTitle>{t("word_list.flagged_title", "Flagged lessons")}</PageTitle>
        <PageSubtitle>
          {t(
            "word_list.flagged_subtitle",
            "Lessons you flagged during a review. Open one to go over it again, and unflag it once it's sunk in.",
          )}
        </PageSubtitle>
      </div>

      <WordList courseSlug={slug} mode="flagged" words={words} stages={stageLabels(locale)} />
    </div>
  );
}
