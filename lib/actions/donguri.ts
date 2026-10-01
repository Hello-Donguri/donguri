"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isAccessoryId, levelForXp, parseDonguriConfig, type AccessoryId } from "@/lib/levels";
import { markLevelSeen, unlockEarnedAccessories, type AccessoryUnlocks } from "@/lib/accessory-unlocks";

export async function equipAccessory(accessoryId: AccessoryId | null): Promise<void> {
  const user = await requireUser();

  if (accessoryId !== null && !isAccessoryId(accessoryId)) {
    throw new Error("Unknown accessory.");
  }

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: user.id },
    select: { donguriConfig: true },
  });

  const config = parseDonguriConfig(profile.donguriConfig);
  const unlocked = new Set(config.unlockedAccessories ?? []);

  if (accessoryId !== null && !unlocked.has(accessoryId)) {
    throw new Error("That accessory hasn't been unlocked yet.");
  }

  // Absent means unlocked (older data, before this flag existed) — only an
  // explicit `false` (set by a previous equip this level) blocks a change.
  if (config.canChooseOutfit === false) {
    throw new Error("Your look is locked in until you next level up.");
  }

  await prisma.profile.update({
    where: { id: user.id },
    data: { donguriConfig: { ...config, equippedAccessory: accessoryId, canChooseOutfit: false } },
  });

  // "page" scope only, and only the profile page — this action is also
  // called from inside the level-up modal, which is shown *on top of* an
  // active test session. A "layout" scope revalidation there would re-render
  // the currently-displayed test route in the same response (same reasoning
  // as the note on `submitAnswer` in lib/actions/vocab.ts), which re-runs
  // `getTestQueue` and can knock the learner back to its empty state mid
  // celebration. The header's avatar/costume badge goes briefly stale until
  // the next `completeQuiz` (which does revalidate the layout) — an
  // acceptable trade-off for not breaking the flow it's shown inside.
  revalidatePath("/dashboard/profile");
}

// A level-up the learner hasn't seen yet — e.g. crossed by an answer in a
// review they left before the results screen (which is where a session
// normally shows it), one whose results screen they left before the modal
// appeared, or one from daily challenge XP. Checked when they land on the
// dashboard or a course page (see LevelUpCelebration), the way badges are:
// unlocks the level's accessories and returns what the level-up modal needs,
// or null when there's nothing unseen.
export async function claimLevelUp(): Promise<(AccessoryUnlocks & { newLevel: number }) | null> {
  const user = await requireUser();
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: user.id },
    select: { xp: true },
  });

  const unlocks = await unlockEarnedAccessories(user.id, profile.xp);
  if (!unlocks.levelUpUnseen) return null;
  return { ...unlocks, newLevel: levelForXp(profile.xp) };
}

// Called when a level-up modal is dismissed — from a session's results
// screen or LevelUpCelebration — so it isn't shown again.
export async function markLevelUpSeen(level: number): Promise<void> {
  const user = await requireUser();
  await markLevelSeen(user.id, level);
}
