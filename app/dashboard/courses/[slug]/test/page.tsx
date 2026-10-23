import type { Metadata } from "next";
import { connection } from "next/server";
import { getCourseHome, getCourseTitle, getTestQueueForCourse, requireProfile } from "@/lib/dal";
import { TestSession } from "@/components/vocab/test-session";
import { FreshSession } from "@/components/vocab/fresh-session";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ words?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Test — ${await getCourseTitle(slug)}` };
}

export default async function TestPage({ params, searchParams }: PageProps) {
  // Request time, not a prerender: the session read checks token expiry
  // against `Date.now()`, which Cache Components rejects outside a cache
  // scope. Unlike the course page this isn't a private cache — a session's
  // queue must always be fresh.
  await connection();
  const [{ slug }, { words }] = await Promise.all([params, searchParams]);
  // The just-learnt batch, passed by the Learn session's "Start quiz" button
  // — scopes the quiz to those words only (see `getTestQueueForCourse`).
  const wordIds = (Array.isArray(words) ? words.join(",") : (words ?? ""))
    .split(",")
    .filter(Boolean);

  // getCourseHome checks they're enrolled; nothing it returns is shown.
  const [, quiz, profile] = await Promise.all([
    getCourseHome(slug),
    getTestQueueForCourse(slug, wordIds),
    requireProfile(),
  ]);

  // An empty quiz is still handed to TestSession rather than rendering an
  // empty state here: it sends a learner who lands with nothing to test
  // back to the course, but keeps a just-finished quiz's results on screen
  // when this page re-renders underneath them (with the queue now empty).
  return (
    <div className="flex flex-col gap-6">
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
