"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { getLocale } from "@/lib/i18n/get-locale";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// "Try it free" on the home page: starts learning without an account, as a
// Supabase anonymous user (see section 50 of supabase/schema.sql and
// lib/access.ts), then on to picking a course and decks. Anyone already
// signed in — guest or not — just carries on where they were.
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

  redirect("/dashboard/courses");
}
