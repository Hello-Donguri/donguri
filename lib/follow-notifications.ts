import "server-only";

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { newFollowerEmail } from "@/lib/emails/new-follower";
import { levelForXp } from "@/lib/levels";

// Emails `followedId` that `followerId` just followed them — unless they've
// turned these off (Profile.emailFollowed), are a guest with no inbox, or
// the follower has no username to show. Sent once the response has gone
// out (Next's `after`), so following is never slowed down by it; any
// failure is logged and otherwise ignored.
export function scheduleNewFollowerEmail(followerId: string, followedId: string): void {
  after(() =>
    sendNewFollowerEmail(followerId, followedId).catch((error) =>
      console.error("New follower email failed:", error),
    ),
  );
}

async function sendNewFollowerEmail(followerId: string, followedId: string): Promise<void> {
  const [followed, follower, followsBack] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: followedId },
      select: { email: true, firstName: true, username: true, isGuest: true, emailFollowed: true },
    }),
    prisma.profile.findUnique({ where: { id: followerId }, select: { username: true, xp: true } }),
    prisma.friendship.count({ where: { userId: followedId, friendId: followerId } }),
  ]);
  if (!followed?.email || followed.isGuest || !followed.emailFollowed || !follower?.username) return;

  await sendEmail(
    newFollowerEmail({
      to: followed.email,
      name: followed.firstName ?? followed.username ?? "there",
      follower: follower.username,
      followerLevel: levelForXp(follower.xp),
      followerXp: follower.xp,
      alreadyFollowing: followsBack > 0,
    }),
  );
}
