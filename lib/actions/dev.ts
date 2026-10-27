"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

// Dev mode's tools (the toggle is admin-only and browser-side, so each
// action checks the role itself).

async function requireAdminUser() {
  const profile = await requireProfile();
  if (profile.role !== "admin") throw new Error("Admins only.");
  return profile;
}

// "Reset deck": forgets the admin's own progress on one deck's words — what
// they've learnt and their review history — so its learn, test and review
// can be tried from the start. Nothing else (XP, streak, other decks)
// changes.
export async function devResetDeck(courseSlug: string, deckId: string): Promise<void> {
  const profile = await requireAdminUser();
  const inDeck = { userId: profile.id, word: { languageDeckId: deckId } };
  await prisma.$transaction([
    prisma.reviewEvent.deleteMany({ where: inDeck }),
    prisma.userWordProgress.deleteMany({ where: inDeck }),
  ]);
  revalidatePath(`/dashboard/courses/${courseSlug}`, "layout");
}

// "Clear review queue": the same as "Reset deck", but for every word the
// course page's review queue panel lists (see getReviewQueueDebug) — they
// go back to unlearnt, ready to be learnt again.
export async function devClearReviewQueue(courseSlug: string): Promise<void> {
  const profile = await requireAdminUser();
  const inCourse = {
    userId: profile.id,
    word: {
      languageDeck: { course: { slug: courseSlug }, active: true },
      active: true,
    },
  };
  await prisma.$transaction([
    prisma.reviewEvent.deleteMany({ where: inCourse }),
    prisma.userWordProgress.deleteMany({ where: inCourse }),
  ]);
  revalidatePath(`/dashboard/courses/${courseSlug}`, "layout");
}

// A question's example sentence as stored, marks and all ("&&&I&&& …"),
// for checking how a grammar cloze was read. Never sent with the question
// itself, since it holds the answers.
export async function devRawExample(
  exampleId: string,
): Promise<{ en: string; ja: string; enHighlight: string | null; jaHighlight: string | null } | null> {
  await requireAdminUser();
  return prisma.wordExample.findUnique({
    where: { id: exampleId },
    select: { en: true, ja: true, enHighlight: true, jaHighlight: true },
  });
}
