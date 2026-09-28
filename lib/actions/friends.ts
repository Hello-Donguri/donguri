"use server";

import { requireUser, getFriendsLeaderboard } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import type { LeaderboardEntry } from "@/lib/definitions";

// Accepts a username ("yuki_t" or "@yuki_t") or an email address — an "@"
// anywhere but the start means email.
export async function addFriend(query: string): Promise<{
  error?: string;
  friends?: LeaderboardEntry[];
}> {
  const user = await requireUser();
  const trimmed = query.trim();

  if (trimmed === "") {
    return { error: "Enter a username or email." };
  }

  const isEmail = trimmed.indexOf("@") > 0;
  const friend = await prisma.profile.findFirst({
    where: isEmail
      ? { email: { equals: trimmed, mode: "insensitive" } }
      : { username: trimmed.replace(/^@/, "").toLowerCase() },
    select: { id: true },
  });

  if (!friend) {
    return { error: "No user found." };
  }

  if (friend.id === user.id) {
    return { error: "That's you!" };
  }

  await prisma.friendship.upsert({
    where: { userId_friendId: { userId: user.id, friendId: friend.id } },
    create: { userId: user.id, friendId: friend.id },
    update: {},
  });

  return { friends: await getFriendsLeaderboard(user.id) };
}

export async function removeFriend(friendId: string): Promise<LeaderboardEntry[]> {
  const user = await requireUser();

  await prisma.friendship.deleteMany({ where: { userId: user.id, friendId } });

  return getFriendsLeaderboard(user.id);
}
