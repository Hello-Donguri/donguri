import type { Metadata } from "next";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { getCourseTitle, getReviewQueue, requireProfile } from "@/lib/dal";
import { ReviewSession } from "@/components/vocab/review-session";
import { FreshSession } from "@/components/vocab/fresh-session";
import { Button } from "@/components/ui/button";
import { getTranslator } from "@/lib/i18n/server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Review — ${await getCourseTitle(slug)}` };
}

export default async function CourseReviewPage({ params }: PageProps) {
  // Request time, not a prerender: the session read checks token expiry
  // against `Date.now()`, which Cache Components rejects outside a cache
  // scope. Unlike the course page this isn't a private cache — a session's
  // queue must always be fresh.
  await connection();
  const { slug } = await params;
  const [quiz, profile, { t }] = await Promise.all([
    getReviewQueue(slug),
    requireProfile(),
    getTranslator(),
  ]);

  // An empty queue is still handed to ReviewSession rather than rendering
  // an empty state here: it sends a learner who arrives with nothing due
  // back to the course, but keeps a just-finished review's results on
  // screen when this page re-renders underneath them.
  return (
    <div className="flex flex-col gap-6">
      {/* No breadcrumb mid-review — just the way back out. */}
      <div className="flex justify-start">
        <Button href={`/dashboard/courses/${slug}`} prefetch variant="outline" size="sm">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {t("test_session.back_to_course", "Back to course")}
        </Button>
      </div>
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
