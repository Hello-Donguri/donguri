import type { Metadata } from "next";
import { getCourseHome, getCourseTitle, getLearntWords } from "@/lib/dal";
import { getTranslator } from "@/lib/i18n/server";
import { STAGES } from "@/lib/srs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { WordList } from "@/components/vocab/word-list";

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
  const stageNames = STAGES.map((stage) => (locale === "ja" ? stage.nameJa : stage.nameEn));

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

      <WordList courseSlug={slug} mode="learnt" words={words} stageNames={stageNames} />
    </div>
  );
}
