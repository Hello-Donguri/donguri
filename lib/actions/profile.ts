"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  LEARNING_REASONS,
  type LearningReason,
  NATIVE_LANGUAGES,
  type NativeLanguage,
  UpdateNameFormSchema,
  UpdateProfileFormSchema,
  type UpdateNameFormState,
  type UpdateProfileFormState,
} from "@/lib/definitions";

// Account settings. The username is deliberately not updatable — see
// section 39 of supabase/schema.sql.
export async function updateName(
  _state: UpdateNameFormState,
  formData: FormData,
): Promise<UpdateNameFormState> {
  const user = await requireUser();

  const validatedFields = UpdateNameFormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { firstName, lastName } = validatedFields.data;

  await prisma.profile.update({
    where: { id: user.id },
    data: { firstName, lastName, fullName: `${firstName} ${lastName}` },
  });

  revalidatePath("/dashboard", "layout");

  return { success: true, message: "Name updated." };
}

// Account settings' profile-visibility switch — `visible` false hides
// /user/<username> from everyone but the owner.
export async function setProfileVisible(visible: boolean): Promise<void> {
  const user = await requireUser();

  await prisma.profile.update({
    where: { id: user.id },
    data: { profileHidden: !visible },
  });

  // The settings page and the leaderboards' links, then the profile page.
  revalidatePath("/dashboard", "layout");
  revalidatePath("/user/[username]", "page");
}

export async function updateProfile(
  _state: UpdateProfileFormState,
  formData: FormData,
): Promise<UpdateProfileFormState> {
  const user = await requireUser();

  const validatedFields = UpdateProfileFormSchema.safeParse({
    donguriConfig: formData.get("donguriConfig") || undefined,
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { donguriConfig } = validatedFields.data;

  await prisma.profile.update({
    where: { id: user.id },
    data: {
      // An empty textarea clears the config back to null rather than
      // storing an empty string in a `Json` column.
      donguriConfig: donguriConfig ? JSON.parse(donguriConfig) : null,
    },
  });

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");

  return { success: true, message: "Profile updated." };
}

// Account settings' native language picker — saved as soon as it changes.
export async function setNativeLanguage(language: NativeLanguage): Promise<void> {
  const user = await requireUser();
  if (!(NATIVE_LANGUAGES as readonly string[]).includes(language)) {
    throw new Error("Unknown language.");
  }

  await prisma.profile.update({
    where: { id: user.id },
    data: { nativeLanguage: language },
  });
  revalidatePath("/dashboard/settings");
}

// The profile page's "why are you learning?" picker — saved as soon as it
// changes.
export async function setLearningReason(reason: LearningReason): Promise<void> {
  const user = await requireUser();
  if (!(LEARNING_REASONS as readonly string[]).includes(reason)) {
    throw new Error("Unknown reason.");
  }

  await prisma.profile.update({
    where: { id: user.id },
    data: { learningReason: reason },
  });
  revalidatePath("/dashboard/profile");
}

// The welcome tour (components/tour/app-tour.tsx), finished or dismissed —
// so it doesn't start by itself again.
export async function markTourSeen(): Promise<void> {
  const user = await requireUser();
  await prisma.profile.update({
    where: { id: user.id },
    data: { tourSeenAt: new Date() },
  });
  revalidatePath("/dashboard", "layout");
}

// Account settings' switch for the "regain your crown" email (see
// lib/weekly-crown.ts).
export async function setOvertakenEmails(enabled: boolean): Promise<void> {
  const user = await requireUser();
  await prisma.profile.update({
    where: { id: user.id },
    data: { emailOvertaken: enabled },
  });
  revalidatePath("/dashboard/settings");
}
