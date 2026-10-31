import type { Metadata } from "next";
import { requireAdminProfile, getAdminCategoryOverview } from "@/lib/dal";
import { AdminDeckGrid } from "@/components/admin/admin-deck-grid";
import { BatchWordImages } from "@/components/admin/batch-word-images";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { getTranslator } from "@/lib/i18n/server";

type PageProps = {
  params: Promise<{ courseSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { courseSlug } = await params;
  const { course } = await getAdminCategoryOverview(courseSlug);
  return { title: `Decks — ${course.title}` };
}

export default async function AdminCourseCategoriesPage({ params }: PageProps) {
  await requireAdminProfile();
  const { courseSlug } = await params;
  const [{ course, categories }, { t }] = await Promise.all([
    getAdminCategoryOverview(courseSlug),
    getTranslator(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumbs
            items={[
              { href: "/dashboard", label: t("breadcrumbs.dashboard", "Dashboard") },
              { href: "/dashboard/admin", label: t("admin_hub.title", "Admin") },
              { href: "/dashboard/admin/courses", label: t("admin_courses.title", "Course content") },
              { label: course.title },
            ]}
          />
          <PageTitle>{course.title}</PageTitle>
          <PageSubtitle>{t("admin_course_decks.subtitle", "Decks in this course.")}</PageSubtitle>
        </div>
        <div className="flex items-center gap-2">
          <BatchWordImages
            courseSlug={courseSlug}
            decks={categories.map((category) => ({ id: category.id, title: category.title }))}
          />
          <Button href={`/dashboard/admin/courses/${courseSlug}/categories/new`} size="sm">
            {t("admin_course_decks.new_deck", "New deck")}
          </Button>
        </div>
      </div>

      {categories.length === 0 && (
        <p className="text-sumi-soft">{t("admin_course_decks.no_decks", "No decks yet.")}</p>
      )}

      <AdminDeckGrid categories={categories} courseSlug={courseSlug} />
    </div>
  );
}
