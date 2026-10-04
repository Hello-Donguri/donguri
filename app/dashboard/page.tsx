import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cacheLife } from "next/cache";
import { getEnrolledCourses, requireProfile } from "@/lib/dal";
import { getTranslator } from "@/lib/i18n/server";
import { badgeShelf } from "@/lib/badges";
import { BadgeCelebration } from "@/components/badges/badge-celebration";
import { LevelUpCelebration } from "@/components/donguri/level-up-celebration";
import { BadgeShelf } from "@/components/badges/badge-shelf";
import { Greeting } from "@/components/dashboard/greeting";
import { DEFAULT_MOTIVATIONS } from "@/lib/course-greetings";
import { CourseCard } from "@/components/dashboard/course-card";

export const metadata: Metadata = {
  title: "Dashboard — Donguri",
};

// Private cache scope, like loadCourseHome on the course page: the session
// read and streak maths check `Date.now()`, which Cache Components only
// allows inside a cache scope during a (runtime) prerender.
async function loadDashboard() {
  "use cache: private";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });

  const [profile, courses] = await Promise.all([
    requireProfile(),
    getEnrolledCourses(),
  ]);
  // Only the multi-course dashboard shows the shelf — everyone else is
  // redirected before it's used.
  const badges = courses.length > 1 ? await badgeShelf(profile.id) : null;

  return { profile, courses, badges };
}

// The home page for learners in more than one course: a greeting and a card
// per course. With one course there's nothing to choose between, so it goes
// straight to that course; with none, to the course catalogue.
export default async function DashboardPage() {
  const { profile, courses, badges } = await loadDashboard();

  if (courses.length === 0) redirect("/dashboard/courses");
  if (courses.length === 1) redirect(`/dashboard/courses/${courses[0].slug}`);

  const { t, locale } = await getTranslator();

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      {/* Awards anything newly reached and celebrates it (see claimBadges). */}
      <BadgeCelebration />
      {/* After badges in the DOM, so a level-up shows on top, first. */}
      <LevelUpCelebration />

      {/* No one course here, so English greetings, with the line under them
          in the learner's own language. */}
      <Greeting
        firstName={profile.first_name ?? (profile.is_guest ? t("dashboard_layout.guest_name", "Guest") : profile.email)}
        motivations={DEFAULT_MOTIVATIONS[profile.native_language ?? "en"]}
      />

      <section className="flex flex-col gap-4">
        {/* Finding more courses lives in the avatar menu. */}
        <h2 className="text-sm font-semibold uppercase tracking-wide text-sumi-soft">
          {t("dashboard_home.your_courses", "Your courses")}
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {courses.map((course, index) => (
            <CourseCard key={course.id} course={course} enrolled index={index} t={t} />
          ))}
        </div>
      </section>

      {badges && (
        <BadgeShelf earned={badges.earned} locked={badges.locked} t={t} locale={locale} />
      )}
    </div>
  );
}
