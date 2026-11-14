import "server-only";

import { prisma } from "@/lib/prisma";

// The course a new account starts in: English for Japanese speakers.
const DEFAULT_COURSE_SLUG = "en-for-ja";

// Where the header's logo takes someone signed up: that course's page.
export const DEFAULT_COURSE_HREF = `/dashboard/courses/${DEFAULT_COURSE_SLUG}`;

// Enrols a brand-new account in the default course, so signing up lands
// straight on a course page rather than the course catalogue. Only when
// they've never been in any course — a guest who signed up keeps the
// course they were learning in (see lib/guest-merge.ts). Best-effort: a
// failure is logged, never allowed to break the sign-up it's part of.
export async function enrolInDefaultCourse(userId: string): Promise<void> {
  try {
    const existing = await prisma.courseEnrollment.count({ where: { userId } });
    if (existing > 0) return;

    const course = await prisma.course.findFirst({
      where: { slug: DEFAULT_COURSE_SLUG, active: true },
      select: { id: true },
    });
    if (!course) return;

    await prisma.courseEnrollment.create({ data: { userId, courseId: course.id } });
  } catch (error) {
    console.error(`Couldn't enrol ${userId} in the default course:`, error);
  }
}
