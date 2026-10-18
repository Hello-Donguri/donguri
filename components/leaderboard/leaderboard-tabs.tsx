"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { follow, type FollowState } from "@/lib/actions/friends";
import { UserSearch } from "@/components/social/user-search";
import { toast } from "@/components/ui/toast";
import { announceFollows, useFollowsChanged } from "@/components/social/follow-events";
import { LeaderboardList } from "@/components/leaderboard/leaderboard-row";
import { useTranslations } from "@/components/i18n/locale-provider";
import type { LeaderboardEntry } from "@/lib/definitions";

type TabKey = "top" | "friends";

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 24 : -24, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -24 : 24, opacity: 0 }),
};

// The course page's leaderboards: this week's top 10, each with a quick
// follow button, and the people you follow (Instagram-style — see
// lib/actions/friends.ts).
export function LeaderboardTabs({
  topEntries,
  initialFriends,
}: {
  topEntries: LeaderboardEntry[];
  initialFriends: LeaderboardEntry[];
}) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<TabKey>("top");
  const [direction, setDirection] = useState(0);

  const [friends, setFriends] = useState(initialFriends);


  // The friends list always includes the viewer (see getFriendsLeaderboard).
  const selfTotalXp = friends.find((entry) => entry.isSelf)?.xp ?? null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "top", label: t("leaderboard.top_10", "Top 10") },
    { key: "friends", label: t("leaderboard.following", "Following") },
  ];

  function switchTo(tab: TabKey) {
    if (tab === activeTab) return;
    setDirection(tab === "friends" ? 1 : -1);
    setActiveTab(tab);
  }

  // Everyone you follow, so the top 10 shows a tick instead of a +. A
  // quick follow adds them straight away and takes it back if it fails.
  const [quickFollowed, setQuickFollowed] = useState<Set<string>>(() => new Set());

  // A follow or unfollow anywhere (a profile, the followers list, a quick
  // follow here) brings the server's list, which replaces the quick ones.
  useFollowsChanged(
    useCallback((state: FollowState) => {
      setFriends(state.friends);
      setQuickFollowed(new Set());
    }, []),
  );
  const followingIds = new Set([
    ...friends.filter((entry) => !entry.isSelf).map((entry) => entry.id),
    ...quickFollowed,
  ]);

  async function handleQuickFollow(id: string) {
    setQuickFollowed((current) => new Set(current).add(id));
    const result = await follow(id);
    if ("error" in result) {
      setQuickFollowed((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      toast({ title: result.error, tone: "error" });
      return;
    }
    announceFollows(result);
  }

  return (
    <section className="flex flex-col rounded-3xl border border-card-border bg-washi-soft p-4 sm:p-5">
      {/* Find people to follow — above both tabs, so it's always there. */}
      <div className="mb-4">
        <UserSearch />
      </div>

      <div className="relative flex rounded-full bg-neutral-soft p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => switchTo(tab.key)}
            className={`relative flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.key ? "text-sumi" : "text-sumi-soft hover:text-sumi"
            }`}
          >
            {activeTab === tab.key && (
              <motion.span
                layoutId="leaderboard-tab-pill"
                className="absolute inset-0 rounded-full bg-washi shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="relative mt-4 overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          {activeTab === "top" ? (
            <motion.div
              key="top"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <LeaderboardList
                entries={topEntries}
                followingIds={followingIds}
                onFollow={handleQuickFollow}
                selfTotalXp={selfTotalXp}
                emptyMessage={t("leaderboard.no_xp_yet", "No one has earned XP yet.")}
              />
            </motion.div>
          ) : (
            <motion.div
              key="friends"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <LeaderboardList
                entries={friends}
                selfTotalXp={selfTotalXp}
                emptyMessage={t("leaderboard.no_following_yet", "Follow someone by username or email to compare XP.")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
