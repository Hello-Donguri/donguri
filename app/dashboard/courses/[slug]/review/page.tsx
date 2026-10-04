import type { Metadata } from "next";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { getCourseTitle, getReviewQueue, requireRegisteredProfile } from "@/lib/dal";
import { ReviewSession } from "@/components/vocab/review-session";
import { FreshSession } from "@/components/vocab/fresh-session";
import Link from "next/link";
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
  // Reviews need an account — guests (see lib/access.ts) are sent to sign
  // up, matching the locked card on the course page.
  const profile = await requireRegisteredProfile();
  const [quiz, { t }] = await Promise.all([getReviewQueue(slug), getTranslator()]);

  // An empty queue is still handed to ReviewSession rather than rendering
  // an empty state here: it sends a learner who arrives with nothing due
  // back to the course, but keeps a just-finished review's results on
  // screen when this page re-renders underneath them.
  return (
    // Clips sideways at the edges of the dashboard's main area (the negative
    // margins cancel its padding), not at the review's narrow column — so a
    // question card can slide fully out of view between words without being
    // cut off mid-slide, and without causing a horizontal scrollbar.
    <div className="-mx-4 flex flex-col gap-6 overflow-x-clip px-4 sm:-mx-6 sm:px-6">
      {/* No breadcrumb mid-review — just a quiet way back out, styled
          like the breadcrumb links it stands in for. */}
      <div className="flex justify-start">
        <Link
          href={`/dashboard/courses/${slug}`}
          prefetch
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-sumi-soft transition hover:text-sumi"
        >
          <ArrowLeft aria-hidden className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          {t("test_session.back_to_course", "Back to course")}
        </Link>
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
