"use client";

import { useEffect, useState } from "react";
import { claimLevelUp, markLevelUpSeen } from "@/lib/actions/donguri";
import { refreshDashboardHeader } from "@/lib/actions/vocab";
import { LevelUpModal } from "@/components/donguri/level-up-modal";

type PendingLevelUp = NonNullable<Awaited<ReturnType<typeof claimLevelUp>>>;

// Lives on the dashboard and each course page, next to BadgeCelebration.
// Shows a level-up the learner hasn't been shown yet — one crossed in a
// session they left before its results screen, or by daily challenge XP —
// with the same modal and outfit choice a finished session shows.
export function LevelUpCelebration() {
  const [levelUp, setLevelUp] = useState<PendingLevelUp | null>(null);

  useEffect(() => {
    let active = true;
    claimLevelUp()
      .then((result) => {
        if (active && result) setLevelUp(result);
      })
      .catch((error) => console.error("Couldn't check for a level-up:", error));
    return () => {
      active = false;
    };
  }, []);

  if (!levelUp) return null;

  return (
    <LevelUpModal
      newLevel={levelUp.newLevel}
      newlyUnlockedAccessories={levelUp.newlyUnlockedAccessories}
      unlockedAccessories={levelUp.unlockedAccessories}
      equippedAccessory={levelUp.equippedAccessory}
      onDone={() => {
        markLevelUpSeen(levelUp.newLevel).catch((error) =>
          console.error("Couldn't record the level-up as seen:", error),
        );
        setLevelUp(null);
        // The header's level badge and Donguri pick up the new look.
        refreshDashboardHeader();
      }}
    />
  );
}
