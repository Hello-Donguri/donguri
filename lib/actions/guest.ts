"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { getLocale } from "@/lib/i18n/get-locale";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// "Get started" on the home page: starts learning without an account, as a
// Supabase anonymous user (see section 50 of supabase/schema.sql and
// lib/access.ts), straight into a course's three starter words (section
// 66) — the course for the language they're browsing in where there's a
// choice. Without any starter deck, on to picking a course instead. Anyone
// already signed in — guest or not — just carries on where they were.
export async function startAsGuest(): Promise<void> {
  if (await getSession()) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error || !data.user) {
    // Most likely anonymous sign-ins are switched off in Supabase — the
    // normal sign-up still works.
    console.error("Anonymous sign-in failed:", error);
    redirect("/signup");
  }

  // The auto-create trigger makes the profile; this fills in the language
  // they're browsing in, used to suggest a course.
  const nativeLanguage = (await getLocale()) === "ja" ? "ja" : "en";
  await prisma.profile.upsert({
    where: { id: data.user.id },
    update: { isGuest: true, nativeLanguage },
    create: { id: data.user.id, email: "", role: "user", isGuest: true, nativeLanguage },
  });

  const starterCourses = await prisma.course.findMany({
    where: {
      active: true,
      languageDecks: { some: { isStarter: true, active: true, words: { some: { active: true } } } },
    },
    orderBy: { position: "asc" },
    select: { id: true, slug: true, sourceLanguage: true },
  });
  const starterCourse =
    starterCourses.find((course) => course.sourceLanguage === nativeLanguage) ?? starterCourses[0];

  if (!starterCourse) redirect("/dashboard/courses");

  await prisma.courseEnrollment.upsert({
    where: { userId_courseId: { userId: data.user.id, courseId: starterCourse.id } },
    create: { userId: data.user.id, courseId: starterCourse.id },
    update: { unenrolledAt: null },
  });

  redirect(`/dashboard/courses/${starterCourse.slug}/learn`);
}
