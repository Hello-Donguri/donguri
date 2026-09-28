import type { Metadata } from "next";
import { getCourseHome, getCourseTitle, getReviewQueue, requireProfile } from "@/lib/dal";
import { ReviewSession } from "@/components/vocab/review-session";
import { FreshSession } from "@/components/vocab/fresh-session";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { getTranslator } from "@/lib/i18n/server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Review — ${await getCourseTitle(slug)}` };
}

export default async function CourseReviewPage({ params }: PageProps) {
  const { slug } = await params;
  const [{ course }, quiz, profile, { t }] = await Promise.all([
    getCourseHome(slug),
    getReviewQueue(slug),
    requireProfile(),
    getTranslator(),
  ]);

  const breadcrumbItems: BreadcrumbItem[] = [
    { href: "/dashboard", label: t("breadcrumbs.dashboard", "Dashboard") },
    { href: "/dashboard/courses", label: t("breadcrumbs.courses", "Courses") },
    { href: `/dashboard/courses/${slug}`, label: course.title, prefetch: true },
    { label: t("review_session.review", "Review") },
  ];

  // An empty queue is still handed to ReviewSession rather than rendering
  // an empty state here: it sends a learner who arrives with nothing due
  // back to the course, but keeps a just-finished review's results on
  // screen when this page re-renders underneath them.
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={breadcrumbItems} />
      <FreshSession>
        <ReviewSession
          quiz={quiz}
          courseSlug={slug}
          initialXp={profile.xp}
          initialDonguriConfig={profile.donguriConfig}
        />
      </FreshSession>
    </div>
  );
}
