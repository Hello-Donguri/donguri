"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Check, UserPlus } from "lucide-react";
import { FollowBurst } from "@/components/social/follow-burst";
import { follow, unfollow } from "@/lib/actions/friends";
import { announceFollows } from "@/components/social/follow-events";
import { toast } from "@/components/ui/toast";
import { useTranslations } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

// Follow / Follow back / Following, Instagram-style. Following someone pops
// the button and bursts a few acorns and hearts out of it (FollowBurst);
// "Following" unfollows when clicked (it reads "Unfollow" on hover). Flips
// straight away and puts it back if the server says no; the result is
// announced so the counts and the leaderboard update too.
export function FollowButton({
  userId,
  username,
  initialFollowing,
  followsYou,
  size = "sm",
}: {
  userId: string;
  username: string | null;
  initialFollowing: boolean;
  followsYou: boolean;
  size?: "sm" | "md";
}) {
  const t = useTranslations();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();
  const [burst, setBurst] = useState<number | null>(null);

  const toggle = () => {
    const next = !following;
    setFollowing(next);
    if (next) setBurst(Date.now());
    startTransition(async () => {
      const result = next ? await follow(userId) : await unfollow(userId);
      if ("error" in result) {
        setFollowing(!next);
        setBurst(null);
        toast({ title: result.error, tone: "error" });
        return;
      }
      announceFollows(result);
      if (next && username) {
        toast(
          t("follow.now_following", "You're following @{{username}}", {
            username,
          }),
        );
      }
    });
  };

  return (
    <motion.button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={following}
      whileTap={{ scale: 0.92 }}
      className={cn(
        "group relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold transition-colors disabled:opacity-70",
        size === "sm" ? "h-8 px-3.5 text-sm" : "h-11 px-6",
        following
          ? "border border-ghost-border bg-washi text-sumi hover:border-shu/40 hover:bg-shu/5 hover:text-shu"
          : "bg-ai text-washi hover:bg-ai-dark",
      )}
    >
      {/* Re-keyed on each follow, so the label springs in every time. */}
      <motion.span
        key={following ? `following-${burst}` : "follow"}
        initial={following && burst !== null ? { scale: 1.35 } : false}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 14 }}
        className="inline-flex items-center gap-1.5"
      >
        {following ? (
          <>
            <Check aria-hidden className="h-4 w-4 group-hover:hidden" />
            <span className="group-hover:hidden">
              {t("follow.following", "Following")}
            </span>
            <span className="hidden group-hover:inline">
              {t("follow.unfollow", "Unfollow")}
            </span>
          </>
        ) : (
          <>
            <UserPlus aria-hidden className="h-4 w-4" />
            {followsYou
              ? t("follow.follow_back", "Follow back")
              : t("follow.follow", "Follow")}
          </>
        )}
      </motion.span>
      <FollowBurst burst={following ? burst : null} />
    </motion.button>
  );
}
