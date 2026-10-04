import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

// A guest (see section 50 of supabase/schema.sql) who signs up or logs in
// keeps what they learnt: their progress moves onto the real account and
// the guest user is deleted. Email sign-up and log-in merge straight away
// (they know both ids in one request); OAuth round-trips through Google /
// LINE, so the guest's id rides along in a short-lived cookie that
// app/auth/callback picks up.

const GUEST_COOKIE = "donguri_guest";

export async function rememberGuestForOAuth(guestId: string): Promise<void> {
  (await cookies()).set(GUEST_COOKIE, guestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
}

// The guest id left by rememberGuestForOAuth, cleared as it's read.
export async function takeRememberedGuest(): Promise<string | null> {
  const store = await cookies();
  const guestId = store.get(GUEST_COOKIE)?.value ?? null;
  if (guestId) store.delete(GUEST_COOKIE);
  return guestId;
}

// Moves a guest's learning onto `userId`, then deletes the guest. Only
// ever takes from a profile flagged `is_guest` — the id may come from a
// cookie, so it's never trusted to name a real account. Where both have
// the same thing (progress on a word, a course enrolment, a deck setting),
// the real account's copy wins. Best-effort: a failure is logged, never
// allowed to break the sign-in it's part of.
export async function mergeGuestInto(guestId: string, userId: string): Promise<void> {
  if (guestId === userId) return;

  try {
    const guest = await prisma.profile.findUnique({
      where: { id: guestId },
      select: { isGuest: true, xp: true },
    });
    if (!guest?.isGuest) return;

    const [ownWords, ownEnrollments, ownDecks] = await Promise.all([
      prisma.userWordProgress.findMany({ where: { userId }, select: { wordId: true } }),
      prisma.courseEnrollment.findMany({ where: { userId }, select: { courseId: true, unenrolledAt: true } }),
      prisma.userDeckActivation.findMany({ where: { userId }, select: { languageDeckId: true } }),
    ]);
    const ownCourseIds = ownEnrollments.map((row) => row.courseId);
    const guestCourseIds = (
      await prisma.courseEnrollment.findMany({ where: { userId: guestId }, select: { courseId: true } })
    ).map((row) => row.courseId);

    await prisma.$transaction([
      prisma.userWordProgress.updateMany({
        where: { userId: guestId, wordId: { notIn: ownWords.map((row) => row.wordId) } },
        data: { userId },
      }),
      prisma.reviewEvent.updateMany({ where: { userId: guestId }, data: { userId } }),
      prisma.xpEvent.updateMany({ where: { userId: guestId }, data: { userId } }),
      prisma.courseEnrollment.updateMany({
        where: { userId: guestId, courseId: { notIn: ownCourseIds } },
        data: { userId },
      }),
      // A course the real account had left but the guest was learning:
      // rejoin it, as enrolling again would.
      prisma.courseEnrollment.updateMany({
        where: {
          userId,
          courseId: { in: guestCourseIds },
          unenrolledAt: { not: null },
        },
        data: { unenrolledAt: null },
      }),
      prisma.userDeckActivation.updateMany({
        where: { userId: guestId, languageDeckId: { notIn: ownDecks.map((row) => row.languageDeckId) } },
        data: { userId },
      }),
      prisma.profile.update({ where: { id: userId }, data: { xp: { increment: guest.xp } } }),
      // Whatever didn't move (duplicates) goes with the guest's profile.
      prisma.profile.delete({ where: { id: guestId } }),
    ]);

    const { error } = await createAdminClient().auth.admin.deleteUser(guestId);
    if (error) console.error(`Couldn't delete merged guest user ${guestId}:`, error);
  } catch (error) {
    console.error(`Failed to merge guest ${guestId} into ${userId}:`, error);
  }
}
