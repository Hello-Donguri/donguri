"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
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
