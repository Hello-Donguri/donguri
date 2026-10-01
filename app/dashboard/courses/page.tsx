import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { getAvailableCourses, getEnrolledCourses } from "@/lib/dal";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CourseCard } from "@/components/dashboard/course-card";
import { UnenrollButton } from "@/components/dashboard/unenroll-button";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Courses — Donguri",
};

// Private cache scope, like loadCourseHome on the course page: the session
// read checks token expiry against `Date.now()`, which Cache Components only
// allows inside a cache scope during a (runtime) prerender. Enrolling
// revalidates this path, which clears it outright.
async function loadCourses() {
  "use cache: private";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });

  return Promise.all([getEnrolledCourses(), getAvailableCourses()]);
}

export default async function CoursesPage() {
  const [enrolled, available] = await loadCourses();
  const { t } = await getTranslator();

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <div>
        <Breadcrumbs
          items={[
            { href: "/dashboard", label: t("breadcrumbs.dashboard", "Dashboard") },
            { label: t("courses_page.title", "Courses") },
          ]}
        />
        <PageTitle>{t("courses_page.title", "Courses")}</PageTitle>
        <PageSubtitle>
          {t(
            "courses_page.subtitle",
            "Sign up for a course to start practicing. You can enroll in as many as you like.",
          )}
        </PageSubtitle>
      </div>

      {enrolled.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sumi-soft">
            {t("courses_page.your_courses", "Your courses")}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {enrolled.map((course, index) => (
              // Outside the card, which is a link as a whole.
              <div key={course.id} className="flex flex-col gap-1.5">
                <CourseCard course={course} enrolled index={index} t={t} />
                <div className="flex justify-end">
                  <UnenrollButton courseId={course.id} courseTitle={course.title} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {available.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sumi-soft">
            {t("courses_page.more_courses", "More courses")}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {available.map((course, index) => (
              // Carries on the colour sequence from the enrolled cards.
              <CourseCard
                key={course.id}
                course={course}
                enrolled={false}
                index={enrolled.length + index}
                t={t}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
