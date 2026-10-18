"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getFriendsLeaderboard, getFollowCounts, getFollowLists, searchUsersToFollow } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { scheduleNewFollowerEmail } from "@/lib/follow-notifications";
import type { FollowCounts, FollowLists, FollowUser, LeaderboardEntry } from "@/lib/definitions";

// Following, Instagram-style: one way, no acceptance needed (a Friendship
// row is `userId` following `friendId`). The leaderboard's "Following" tab
// ranks the people you follow.

// What every follow change hands back, so the leaderboard and the follower
// counts can update in place (see the follows-changed event in
// components/social/follow-events.ts).
export type FollowState = { friends: LeaderboardEntry[]; counts: FollowCounts };

async function followState(userId: string): Promise<FollowState> {
  const [friends, counts] = await Promise.all([getFriendsLeaderboard(userId), getFollowCounts(userId)]);
  return { friends, counts };
}

// Profile pages and the course page (the leaderboard and its counts) are
// cached per learner; a follow change clears both.
function revalidateFollows() {
  revalidatePath("/user/[username]", "page");
  revalidatePath("/dashboard", "layout");
}

export async function follow(targetId: string): Promise<FollowState | { error: string }> {
  const user = await requireUser();
  if (targetId === user.id) return { error: "That's you!" };

  const target = await prisma.profile.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) return { error: "No user found." };

  // Only a new follow emails them — following someone you already follow
  // changes nothing. createMany skips the row if it's already there, and
  // its count says whether this call made it.
  const { count } = await prisma.friendship.createMany({
    data: [{ userId: user.id, friendId: targetId }],
    skipDuplicates: true,
  });
  if (count > 0) scheduleNewFollowerEmail(user.id, targetId);
  revalidateFollows();
  return followState(user.id);
}

export async function unfollow(targetId: string): Promise<FollowState> {
  const user = await requireUser();
  await prisma.friendship.deleteMany({ where: { userId: user.id, friendId: targetId } });
  revalidateFollows();
  return followState(user.id);
}

// The followers / following modal's lists, loaded when it opens.
export async function loadFollowLists(): Promise<FollowLists> {
  const user = await requireUser();
  return getFollowLists(user.id);
}

// The leaderboard's people search, as the learner types (see UserSearch).
export async function searchUsers(query: string): Promise<FollowUser[]> {
  const user = await requireUser();
  return searchUsersToFollow(user.id, query);
}
