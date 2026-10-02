"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { buildBadgeImageKey, uploadImage } from "@/lib/bunny";
import {
  awardEarnedBadges,
  recordUsersAlreadyQualifying,
  unseenBadges,
  type UnseenBadge,
} from "@/lib/badges";
import {
  CreateBadgeFormSchema,
  UpdateBadgeFormSchema,
  type BadgeFormState,
} from "@/lib/definitions";
import { fixedTimescale } from "@/lib/badge-metrics";

const NOT_ALLOWED = "You don't have permission to do that.";

// Called by BadgeCelebration as the learner lands on the dashboard or a
// course page — i.e. at the end of every learn, review and daily-challenge
// session. Awards anything newly reached (with its XP), then returns every
// awarded badge not yet celebrated and the learner's XP total now, so the
// celebration can count each badge's XP up to it.
export async function claimBadges(): Promise<{ badges: UnseenBadge[]; xp: number }> {
  const profile = await requireProfile();
  await awardEarnedBadges(profile.id);
  const [badges, { xp }] = await Promise.all([
    unseenBadges(profile.id),
    prisma.profile.findUniqueOrThrow({ where: { id: profile.id }, select: { xp: true } }),
  ]);
  return { badges, xp };
}

// Once a celebration's been shown, so it isn't shown again.
export async function markBadgesSeen(awardIds: string[]): Promise<void> {
  const profile = await requireProfile();
  if (awardIds.length === 0) return;
  await prisma.userBadge.updateMany({
    where: { id: { in: awardIds }, userId: profile.id, seenAt: null },
    data: { seenAt: new Date() },
  });
  // The dashboard's badge shelf shows it as earned from now on, and the
  // header's XP counter ticks up to include its XP.
  revalidatePath("/dashboard", "layout");
}

async function isAdmin(): Promise<boolean> {
  const profile = await requireProfile();
  return profile.role === "admin";
}

function uploadedFile(value: FormDataEntryValue | null): File | undefined {
  return value instanceof File && value.size > 0 ? value : undefined;
}

export async function createBadge(_state: BadgeFormState, formData: FormData): Promise<BadgeFormState> {
  if (!(await isAdmin())) return { message: NOT_ALLOWED };

  const validated = CreateBadgeFormSchema.safeParse({
    name: formData.get("name"),
    threshold: formData.get("threshold"),
    metric: formData.get("metric"),
    courseId: formData.get("courseId") ?? "",
    timescale: formData.get("timescale") ?? "",
    image: uploadedFile(formData.get("image")),
    xpReward: formData.get("xpReward"),
    awardExisting: formData.get("awardExisting") === "on",
  });
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const { name, threshold, xpReward, metric, courseId, image, awardExisting } = validated.data;
  const timescale = fixedTimescale(metric) ?? validated.data.timescale;
  const imageKey = buildBadgeImageKey(image.type);
  try {
    await uploadImage(image, imageKey);
  } catch (error) {
    console.error("Bunny image upload failed:", error);
    return { message: "Image upload failed. Try again." };
  }

  const badge = await prisma.badge.create({
    data: { name, imageKey, metric, threshold, xpReward, courseId, timescale, awardExisting },
  });

  // Off: learners who already qualify are recorded as skipped, so only
  // those who reach it from now on earn it. On: nothing to do — everyone
  // qualifying is awarded it on their next visit (see claimBadges).
  const skipped = awardExisting
    ? 0
    : await recordUsersAlreadyQualifying(badge.id, { metric, courseId, timescale }, threshold);

  revalidatePath("/dashboard/admin/badges");
  return {
    success: true,
    message: awardExisting
      ? `"${name}" created. Everyone who already qualifies will get it on their next visit.`
      : `"${name}" created. ${skipped} learner${skipped === 1 ? "" : "s"} who already qualified won't get it; everyone else can earn it.`,
  };
}

// A new image replaces the old one (the old bunny.net file is left, as
// with deck covers); leaving it empty keeps the current one.
export async function updateBadge(_state: BadgeFormState, formData: FormData): Promise<BadgeFormState> {
  if (!(await isAdmin())) return { message: NOT_ALLOWED };

  const validated = UpdateBadgeFormSchema.safeParse({
    badgeId: formData.get("badgeId"),
    name: formData.get("name"),
    threshold: formData.get("threshold"),
    xpReward: formData.get("xpReward"),
    image: uploadedFile(formData.get("image")),
  });
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const { badgeId, name, threshold, xpReward, image } = validated.data;
  let imageKey: string | undefined;
  if (image) {
    imageKey = buildBadgeImageKey(image.type);
    try {
      await uploadImage(image, imageKey);
    } catch (error) {
      console.error("Bunny image upload failed:", error);
      return { message: "Image upload failed. Try again." };
    }
  }

  await prisma.badge.update({
    where: { id: badgeId },
    data: { name, threshold, xpReward, ...(imageKey ? { imageKey } : {}) },
  });

  revalidatePath("/dashboard/admin/badges");
  return { success: true, message: "Saved." };
}

// Hidden badges disappear from shelves and stop being awarded; learners
// keep them, and showing it again brings them back.
export async function setBadgeActive(badgeId: string, active: boolean): Promise<void> {
  if (!(await isAdmin())) throw new Error(NOT_ALLOWED);
  await prisma.badge.update({ where: { id: badgeId }, data: { active } });
  revalidatePath("/dashboard/admin/badges");
}

// Permanent: every learner's copy of it goes too.
export async function deleteBadge(badgeId: string): Promise<void> {
  if (!(await isAdmin())) throw new Error(NOT_ALLOWED);
  await prisma.badge.delete({ where: { id: badgeId } });
  revalidatePath("/dashboard/admin/badges");
}
