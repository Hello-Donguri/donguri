import "server-only";

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, startOfUTCDay } from "@/lib/srs";
import { sendEmail } from "@/lib/email";
import { regainCrownEmail } from "@/lib/emails/regain-crown";

// At most one "regain your crown" email per learner per day, however often
// the lead changes hands.
const EMAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type Leader = { id: string; weeklyXp: number };

// XP earned per user in the trailing 7 UTC days, today included — the same
// window and ranking as the weekly leaderboard (getLeaderboards in
// lib/dal.ts): most XP this week first, total XP breaking ties. Null when
// nobody has earned any this week.
async function weeklyLeader(): Promise<Leader | null> {
  const rows = await prisma.xpEvent.groupBy({
    by: ["userId"],
    // Guests (see lib/access.ts) can't hold the crown.
    where: { createdAt: { gte: addDays(startOfUTCDay(new Date()), -6) }, profile: { isGuest: false } },
    _sum: { amount: true },
  });
  const weekly = rows
    .map((row) => ({ id: row.userId, weeklyXp: row._sum.amount ?? 0 }))
    .filter((row) => row.weeklyXp > 0);
  if (weekly.length === 0) return null;

  const top = Math.max(...weekly.map((row) => row.weeklyXp));
  const tied = weekly.filter((row) => row.weeklyXp === top);
  if (tied.length === 1) return tied[0];

  const profiles = await prisma.profile.findMany({
    where: { id: { in: tied.map((row) => row.id) } },
    select: { id: true, xp: true },
    orderBy: { xp: "desc" },
    take: 1,
  });
  return profiles[0] ? { id: profiles[0].id, weeklyXp: top } : null;
}

async function weeklyXpFor(userId: string): Promise<number> {
  const { _sum } = await prisma.xpEvent.aggregate({
    where: { userId, createdAt: { gte: addDays(startOfUTCDay(new Date()), -6) } },
    _sum: { amount: true },
  });
  return _sum.amount ?? 0;
}

// Works out who's #1 on the weekly leaderboard now, and if that's someone
// new, tells the learner who lost the spot: a "regain your crown" email,
// unless they've turned those off or already had one today. Only a change
// of leader caused by someone earning XP is noticed — called after XP
// awards (see scheduleWeeklyCrownCheck).
export async function checkWeeklyCrown(): Promise<void> {
  const leader = await weeklyLeader();
  const state = await prisma.weeklyLeader.findUnique({ where: { id: 1 } });
  const previousId = state?.userId ?? null;
  if (previousId === (leader?.id ?? null)) return;

  if (!state) {
    // First check ever: remember the leader, nobody to tell.
    await prisma.weeklyLeader.upsert({
      where: { id: 1 },
      create: { id: 1, userId: leader?.id ?? null },
      update: {},
    });
    return;
  }

  // Only the check that actually moves the crown sends the email, so two
  // awards landing at once can't both tell the same learner.
  const { count } = await prisma.weeklyLeader.updateMany({
    where: { id: 1, userId: previousId },
    data: { userId: leader?.id ?? null, updatedAt: new Date() },
  });
  if (count === 0 || !previousId || !leader) return;

  const [previous, newLeader] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: previousId },
      select: {
        email: true,
        firstName: true,
        username: true,
        emailOvertaken: true,
        overtakenEmailedAt: true,
      },
    }),
    prisma.profile.findUnique({ where: { id: leader.id }, select: { username: true } }),
  ]);
  if (!previous?.email || !previous.emailOvertaken || !newLeader?.username) return;
  if (
    previous.overtakenEmailedAt &&
    Date.now() - previous.overtakenEmailedAt.getTime() < EMAIL_COOLDOWN_MS
  ) {
    return;
  }

  // Stamped before sending, so a retry or a second change today doesn't
  // send another.
  await prisma.profile.update({
    where: { id: previousId },
    data: { overtakenEmailedAt: new Date() },
  });
  await sendEmail(
    regainCrownEmail({
      to: previous.email,
      name: previous.firstName ?? previous.username ?? "there",
      newLeader: newLeader.username,
      theirXp: leader.weeklyXp,
      yourXp: await weeklyXpFor(previousId),
    }),
  );
}

// Checks the weekly crown once the current response has gone out (Next's
// `after`), so earning XP is never slowed down by it. Any failure is logged
// and otherwise ignored.
export function scheduleWeeklyCrownCheck(): void {
  after(() =>
    checkWeeklyCrown().catch((error) => console.error("Weekly crown check failed:", error)),
  );
}
