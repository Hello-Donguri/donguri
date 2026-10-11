"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ASSIGNABLE_ROLES,
  type AssignableRole,
  AdminResetPasswordFormSchema,
  type AdminResetPasswordFormState,
} from "@/lib/definitions";

// `requireProfile` verifies the session server-side, and the role check
// below re-guards the action itself (not just the page) since server
// actions are directly callable regardless of which page rendered them.
export async function adminResetPassword(
  _state: AdminResetPasswordFormState,
  formData: FormData,
): Promise<AdminResetPasswordFormState> {
  const profile = await requireProfile();

  if (profile.role !== "admin") {
    return { message: "You don't have permission to do that." };
  }

  const validatedFields = AdminResetPasswordFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { email, password } = validatedFields.data;

  const target = await prisma.profile.findFirst({ where: { email } });

  if (!target) {
    return { message: "No user found with that email." };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
    password,
  });

  if (error) {
    console.error("Admin password reset failed:", error);
    return { message: "Could not update the password. Try again." };
  }

  return { success: true, message: `Password updated for ${email}.` };
}

// The users page's role picker: makes someone a tester (full learning
// access, nothing more) or back to a regular user. Re-checked here rather
// than trusting the page — only an admin may call it, only "user" or
// "tester" can be given, and an admin's own role can't be changed this way
// (admin is only ever set in the SQL editor).
export async function setUserRole(
  userId: string,
  role: AssignableRole,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    return { ok: false, message: "You don't have permission to do that." };
  }
  if (!(ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
    return { ok: false, message: "That role can't be assigned here." };
  }

  const target = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true, isGuest: true } });
  if (!target || target.isGuest) {
    return { ok: false, message: "No user found." };
  }
  if (target.role === "admin") {
    return { ok: false, message: "An admin's role can't be changed here." };
  }

  await prisma.profile.update({ where: { id: userId }, data: { role } });
  revalidatePath("/dashboard/admin/users");
  return { ok: true };
}
