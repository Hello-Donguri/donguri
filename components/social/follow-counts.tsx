"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { loadFollowLists } from "@/lib/actions/friends";
import { motion, useReducedMotion } from "framer-motion";
import type { FollowCounts as Counts, FollowLists } from "@/lib/definitions";
import type { AccessoryId } from "@/lib/levels";
import { DonguriAvatar } from "@/components/icons/DonguriAvatar";
import { FollowButton } from "@/components/social/follow-button";
import { useFollowCounts } from "@/components/social/follow-events";
import { useTranslations } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

type Tab = "followers" | "following";

// The viewer's followers and following as two playful pills — a little
// stack of the latest ones' Donguris, then the number — each opening a modal with
// that list — every row with a Follow / Follow back / Following button.
// The lists load when it opens; the counts stay current as people are
// followed anywhere on the page (see useFollowCounts).
export function FollowCounts({
  initialCounts,
  className,
  size = "md",
}: {
  initialCounts: Counts;
  className?: string;
  // "sm" for tight spots like the course page's profile card.
  size?: "sm" | "md";
}) {
  const t = useTranslations();
  const counts = useFollowCounts(initialCounts);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<Tab>("followers");
  const [lists, setLists] = useState<FollowLists | null>(null);
  // Bumped each time the lists load, so the rows' buttons start from what
  // the server says rather than a click from before.
  const [version, setVersion] = useState(0);

  const refresh = () =>
    loadFollowLists().then((loaded) => {
      setLists(loaded);
      setVersion((count) => count + 1);
    });

  const open = (which: Tab) => {
    setTab(which);
    setLists(null);
    dialogRef.current?.showModal();
    void refresh();
  };

  // Switching tab reloads quietly, so a follow on one tab shows on the other.
  const switchTab = (which: Tab) => {
    setTab(which);
    void refresh();
  };

  const shown = lists?.[tab] ?? [];

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <CountPill
          count={counts.followers}
          label={counts.followers === 1 ? t("follow.follower", "follower") : t("follow.followers", "followers")}
          avatars={counts.recentFollowers}
          tone="bg-sakura-soft text-sakura-dark ring-sakura/20 hover:ring-sakura/40"
          size={size}
          tilt="hover:-rotate-2"
          onClick={() => open("followers")}
        />
        <CountPill
          count={counts.following}
          label={t("follow.following_count", "following")}
          avatars={counts.recentFollowing}
          tone="bg-ai-soft text-ai-dark ring-ai/20 hover:ring-ai/40"
          size={size}
          tilt="hover:rotate-2"
          onClick={() => open("following")}
        />
      </div>

      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="m-auto max-h-[min(36rem,calc(100dvh-2rem))] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-3xl border border-card-border bg-washi p-0 text-sumi shadow-2xl backdrop:bg-sumi/40"
      >
        <div className="flex max-h-[min(36rem,calc(100dvh-2rem))] flex-col">
          <div className="flex items-center gap-2 border-b border-card-border px-4 pt-4">
            {(["followers", "following"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => switchTab(key)}
                className={cn(
                  "-mb-px border-b-2 px-3 pb-3 text-sm font-semibold transition",
                  tab === key ? "border-ai text-sumi" : "border-transparent text-sumi-soft hover:text-sumi",
                )}
              >
                {key === "followers"
                  ? t("follow.followers_tab", "Followers · {{count}}", { count: counts.followers })
                  : t("follow.following_tab", "Following · {{count}}", { count: counts.following })}
              </button>
            ))}
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={t("common.close", "Close")}
              className="mb-3 ml-auto flex h-8 w-8 items-center justify-center rounded-full text-sumi-soft transition hover:bg-sumi/5 hover:text-sumi"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-40 overflow-y-auto overscroll-contain p-2">
            {!lists ? (
              <div className="flex h-40 items-center justify-center text-sumi-soft">
                <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
              </div>
            ) : shown.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-sumi-soft">
                {tab === "followers"
                  ? t("follow.no_followers", "No followers yet.")
                  : t("follow.no_following", "You're not following anyone yet — find people on the leaderboard.")}
              </p>
            ) : (
              <ul key={`${version}-${tab}`} className="flex flex-col">
                {shown.map((person) => {
                  const name = person.username
                    ? `@${person.username}`
                    : t("follow.a_learner", "A learner");
                  return (
                    <li key={person.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-washi-soft">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-raised">
                        <DonguriAvatar equippedAccessory={person.equippedAccessory} className="h-9 w-9" />
                      </span>
                      <div className="min-w-0 flex-1">
                        {person.profileHref ? (
                          <Link href={person.profileHref} className="block truncate font-semibold text-sumi hover:underline">
                            {name}
                          </Link>
                        ) : (
                          <span className="block truncate font-semibold text-sumi">{name}</span>
                        )}
                        <span className="text-xs text-sumi-soft">
                          {t("xp_counter.level", "Lv {{level}}", { level: person.level })}
                          {person.followsViewer && tab === "following" && (
                            <> · {t("follow.follows_you", "Follows you")}</>
                          )}
                        </span>
                      </div>
                      <FollowButton
                        userId={person.id}
                        username={person.username}
                        initialFollowing={person.viewerFollows}
                        followsYou={person.followsViewer}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

// One count: a tinted pill with up to three overlapping Donguris, then the
// number, which pops when it changes. Lifts and tilts a touch on hover.
function CountPill({
  count,
  label,
  avatars = [],
  tone,
  size,
  tilt,
  onClick,
}: {
  count: number;
  label: string;
  avatars?: (AccessoryId | null)[];
  tone: string;
  size: "sm" | "md";
  tilt: string;
  // Without one it's just the pill, for someone else's counts.
  onClick?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const small = size === "sm";
  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full ring-1",
        onClick && "transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95",
        small ? "h-8 pr-3 pl-1" : "h-10 pr-4 pl-1.5",
        avatars.length === 0 && (small ? "pl-3" : "pl-4"),
        tone,
        tilt,
      )}
    >
      {avatars.length > 0 && (
        <span className="flex -space-x-2.5">
          {avatars.map((accessory, index) => (
            <span
              key={index}
              className={cn(
                "flex items-center justify-center rounded-full bg-raised ring-2 ring-washi",
                small ? "h-6 w-6" : "h-7 w-7",
              )}
              style={{ zIndex: avatars.length - index }}
            >
              <DonguriAvatar equippedAccessory={accessory} className={small ? "h-5 w-5" : "h-6 w-6"} />
            </span>
          ))}
        </span>
      )}
      <motion.span
        key={count}
        initial={reduceMotion ? false : { scale: 1.5 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 15 }}
        className={cn("font-nunito font-black tabular-nums", small ? "text-sm" : "text-base")}
      >
        {count}
      </motion.span>
      <span className={cn("font-semibold", small ? "text-xs" : "text-sm")}>{label}</span>
    </Tag>
  );
}

// Someone else's counts, in the same pills — just to look at.
export function FollowCountPills({ counts }: { counts: Counts }) {
  const t = useTranslations();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CountPill
        count={counts.followers}
        label={counts.followers === 1 ? t("follow.follower", "follower") : t("follow.followers", "followers")}
        avatars={counts.recentFollowers}
        tone="bg-sakura-soft text-sakura-dark ring-sakura/20"
        size="md"
        tilt=""
      />
      <CountPill
        count={counts.following}
        label={t("follow.following_count", "following")}
        avatars={counts.recentFollowing}
        tone="bg-ai-soft text-ai-dark ring-ai/20"
        size="md"
        tilt=""
      />
    </div>
  );
}
