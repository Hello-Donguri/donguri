import type { Metadata } from "next";
import { getCourseHome, getCourseTitle, getTestQueueForCourse, requireProfile } from "@/lib/dal";
import { TestSession } from "@/components/vocab/test-session";
import { FreshSession } from "@/components/vocab/fresh-session";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { getTranslator } from "@/lib/i18n/server";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ words?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Test — ${await getCourseTitle(slug)}` };
}

export default async function TestPage({ params, searchParams }: PageProps) {
  const [{ slug }, { words }] = await Promise.all([params, searchParams]);
  // The just-learnt batch, passed by the Learn session's "Start quiz" button
  // — scopes the quiz to those words only (see `getTestQueueForCourse`).
  const wordIds = (Array.isArray(words) ? words.join(",") : (words ?? ""))
    .split(",")
    .filter(Boolean);

  const [{ course }, quiz, profile, { t }] = await Promise.all([
    getCourseHome(slug),
    getTestQueueForCourse(slug, wordIds),
    requireProfile(),
    getTranslator(),
  ]);

  const breadcrumbItems: BreadcrumbItem[] = [
    { href: "/dashboard", label: t("breadcrumbs.dashboard", "Dashboard") },
    { href: "/dashboard/courses", label: t("breadcrumbs.courses", "Courses") },
    { href: `/dashboard/courses/${slug}`, label: course.title, prefetch: true },
    { label: t("test_page.breadcrumb_test", "Test") },
  ];

  // An empty quiz is still handed to TestSession rather than rendering an
  // empty state here: it sends a learner who lands with nothing to test
  // back to the course, but keeps a just-finished quiz's results on screen
  // when this page re-renders underneath them (with the queue now empty).
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={breadcrumbItems} />
      <FreshSession>
        <TestSession
          quiz={quiz}
          courseSlug={slug}
          initialXp={profile.xp}
          initialDonguriConfig={profile.donguriConfig}
        />
      </FreshSession>
    </div>
  );
}
