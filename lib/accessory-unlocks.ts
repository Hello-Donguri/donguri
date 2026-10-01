import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ACCESSORIES,
  celebratedLevel,
  levelForXp,
  parseDonguriConfig,
  type AccessoryId,
} from "@/lib/levels";

export type AccessoryUnlocks = {
  // Unlocked just now — empty when there was nothing new.
  newlyUnlockedAccessories: AccessoryId[];
  // Everything the learner now has.
  unlockedAccessories: AccessoryId[];
  equippedAccessory: AccessoryId | null;
  // The learner's level now, and whether its level-up modal is still to be
  // seen — true until they dismiss it (see markLevelUpSeen), so leaving
  // before it shows (or before it finishes loading) never loses it.
  level: number;
  levelUpUnseen: boolean;
};

// Unlocks every accessory the learner's XP has reached and they don't have
// yet, and reopens their outfit choice. Based on their XP now, not on
// crossing a level mid-session: XP is awarded answer by answer (and by the
// daily challenge), so a level can be crossed in a session they then leave
// early — which used to mean its accessories never unlocked, since every
// later session started at the new level and never "crossed" it. Each level
// is an accessory threshold (see LEVEL_THRESHOLDS), so new accessories here
// means a level-up the learner hasn't been shown yet.
export async function unlockEarnedAccessories(
  userId: string,
  xp: number,
): Promise<AccessoryUnlocks> {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: userId },
    select: { donguriConfig: true },
  });
  const config = parseDonguriConfig(profile.donguriConfig);
  const alreadyUnlocked = new Set(config.unlockedAccessories ?? []);

  // Every accessory whose threshold has been reached, all at once — so a
  // level's whole set becomes available together, without pulling in a
  // later level's early.
  const earnedIds = ACCESSORIES.filter((accessory) => accessory.threshold <= xp).map(
    (accessory) => accessory.id,
  );
  const newlyUnlockedAccessories = earnedIds.filter((id) => !alreadyUnlocked.has(id));
  const equippedAccessory = (config.equippedAccessory ?? null) as AccessoryId | null;

  if (newlyUnlockedAccessories.length > 0) {
    // A level-up reopens the outfit choice — equipAccessory locks it again
    // the moment the learner picks something. The last level seen is pinned
    // before the unlock, since for older data it's read from the unlocked
    // set (see celebratedLevel) and would otherwise jump ahead unseen.
    await prisma.profile.update({
      where: { id: userId },
      data: {
        donguriConfig: {
          ...config,
          unlockedAccessories: earnedIds,
          canChooseOutfit: true,
          celebratedLevel: celebratedLevel(config),
        },
      },
    });
  }

  const level = levelForXp(xp);
  return {
    newlyUnlockedAccessories,
    unlockedAccessories: earnedIds,
    equippedAccessory,
    level,
    // Judged against the config as it was before this call's unlocks.
    levelUpUnseen: level > celebratedLevel(config),
  };
}

// Records that the learner has dismissed the level-up modal for `level`.
// Never moves backwards, and never past the level their XP has reached.
export async function markLevelSeen(userId: string, level: number): Promise<void> {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: userId },
    select: { xp: true, donguriConfig: true },
  });
  const config = parseDonguriConfig(profile.donguriConfig);
  const seen = Math.min(Math.max(level, celebratedLevel(config)), levelForXp(profile.xp));
  if (seen === config.celebratedLevel) return;
  await prisma.profile.update({
    where: { id: userId },
    data: { donguriConfig: { ...config, celebratedLevel: seen } },
  });
}
