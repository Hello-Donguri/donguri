"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSubscriber } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export async function enrollInCourse(courseId: string): Promise<void> {
  const user = await requireSubscriber();

  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    select: { slug: true },
  });

  await prisma.courseEnrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    create: { userId: user.id, courseId },
    // Rejoining a course they left picks up where they were.
    update: { unenrolledAt: null },
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
  const user = await requireSubscriber();

  await prisma.courseEnrollment.updateMany({
    where: { userId: user.id, courseId, unenrolledAt: null },
    data: { unenrolledAt: new Date() },
  });

  // The course list, the dashboard, and the header's per-course streaks.
  revalidatePath("/dashboard", "layout");
}
