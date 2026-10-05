"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireLearner } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { parseCourseLevel } from "@/lib/definitions";

// `level` comes from the enroll form's level picker (see CourseCard) —
// anything unexpected falls back to beginner.
export async function enrollInCourse(courseId: string, formData: FormData): Promise<void> {
  const user = await requireLearner();
  const level = parseCourseLevel(formData.get("level"));

  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    select: { slug: true },
  });

  await prisma.courseEnrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    create: { userId: user.id, courseId, level },
    // Rejoining a course they left picks up where they were, at the level
    // they've just picked.
    update: { unenrolledAt: null, level },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/courses");
  redirect(`/dashboard/courses/${course.slug}`);
}

// Leaves a course. Only marks the enrollment as left: its streak, and all
// the progress kept per word (reviews, deck activations, daily challenges),
// stay exactly as they were, so enrolling again picks up where they left
// off (see enrollInCourse and section 45 of supabase/schema.sql).
export async function unenrollFromCourse(courseId: string): Promise<void> {
  const user = await requireLearner();

  await prisma.courseEnrollment.updateMany({
    where: { userId: user.id, courseId, unenrolledAt: null },
    data: { unenrolledAt: new Date() },
  });

  // The course list, the dashboard, and the header's per-course streaks.
  revalidatePath("/dashboard", "layout");
}
