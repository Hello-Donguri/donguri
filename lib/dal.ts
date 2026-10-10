import { accessTier, allowanceFor, withinAllowance, type Allowance } from "@/lib/access";
import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { cacheLife } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type {
  AdminCategoryDetail,
  AdminCategorySummary,
  AdminCourseOption,
  AdminQuizQuestionSummary,
  AdminWordSummary,
  AvailableCourse,
  CourseSummary,
  DailyActivityCount,
  DailyChallengeStatus,
  EnrolledCourseSummary,
  FlaggedWord,
  LearntWord,
  CourseStreakInfo,
  WeeklyStats,
  LeaderboardEntry,
  LanguageDeckSummary,
  Profile,
  PublicProfile,
  QuizDirection,
  QuizOption,
  QuizQuestion,
  ReviewQueueDebugEntry,
  ReviewQueueSummary,
  RevealWord,
  UserRole,
  WordCategoryOption,
  WordType,
} from "@/lib/definitions";
import {
  LEARNING_REASONS,
  NATIVE_LANGUAGES,
  WORD_TYPES,
  parseCourseLevel,
  type LearningReason,
  type NativeLanguage,
} from "@/lib/definitions";
import {
  addDays,
  applyDailyActivity,
  computeStreakFromActiveDays,
  MAX_STAGE,
  nextReviewAtForStage,
  SET_SIZE,
  stageInfo,
  startOfUTCDay,
  toUTCDateString,
} from "@/lib/srs";
import { deckCoverImagePath, wordImagePath } from "@/lib/images";
import {
  findClozeMatchesByForm,
  findTermClozeMatches,
  findTranslationSpan,
  pickRandomClozeMatch,
  romanizeFromExamples,
  type ClozeMatch,
} from "@/lib/cloze";
import { isLatinTypeable } from "@/lib/language";
import { parseDonguriConfig, type AccessoryId } from "@/lib/levels";
import {
  pickChallengeTarget,
  type ChallengeTarget,
  type DailyChallengeResult,
} from "@/lib/daily-challenge";
import type { ChallengeSummary } from "@/lib/actions/daily-challenge";

// Shared with sendDailyChallengeMessage in lib/actions/daily-challenge.ts,
// which enforces the same cap on write.
export const MAX_DAILY_CHALLENGE_ATTEMPTS = 3;

// A plain cookie read (no network round-trip to Supabase's auth server) —
// safe here specifically because proxy.ts already verifies the JWT's
// signature with `getClaims()` for every request this route tree is reached
// through, before any Server Component runs, and propagates any refreshed
// cookies onto the same request. Re-validating again here would just add a
// second sequential auth round-trip to every single navigation (this was
// previously the #1 source of navigation latency) for no extra security,
// since the token was already confirmed valid moments earlier in the same
// request. Do not use this pattern anywhere the proxy might not have run.
export const getSession = cache(async () => {
  const supabase = await createClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Failed to retrieve Supabase session:", error);
    return null;
  }

  return session?.user ?? null;
});

export const requireUser = cache(async () => {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  return user;
});

// Prisma connects using its own PostgreSQL role and does not carry the
// authenticated user's JWT. Supabase RLS therefore does not apply to
// Prisma queries.
//
// Always derive the profile ID from the verified Supabase user. Never
// accept a caller-provided user ID here.
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSession();

  if (!user) {
    return null;
  }

  const profile = await prisma.profile.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      xp: true,
      donguriConfig: true,
      firstName: true,
      lastName: true,
      username: true,
      profileHidden: true,
      nativeLanguage: true,
      learningReason: true,
      tourSeenAt: true,
      emailOvertaken: true,
      isGuest: true,
      subscription: {
        select: {
          status: true,
          trialEnd: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          trialUsed: true,
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  const tier = accessTier(profile.role, profile.isGuest, profile.subscription);

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.fullName,
    role: profile.role as UserRole,
    xp: profile.xp,
    donguriConfig: profile.donguriConfig,
    first_name: profile.firstName,
    last_name: profile.lastName,
    username: profile.username,
    profile_hidden: profile.profileHidden,
    native_language: isNativeLanguage(profile.nativeLanguage) ? profile.nativeLanguage : null,
    learning_reason: isLearningReason(profile.learningReason) ? profile.learningReason : null,
    tour_seen: profile.tourSeenAt !== null,
    email_overtaken: profile.emailOvertaken,
    subscription: profile.subscription,
    is_guest: profile.isGuest,
    tier,
    hasAccess: tier === "member",
  };
});

export const requireProfile = cache(async (): Promise<Profile> => {
  const user = await requireUser();
  const profile = await getProfile();

  if (!profile) {
    // A guest's session can outlive the guest (merged into a real account,
    // or cleaned up) — start them afresh rather than asking a user who no
    // longer exists to fill in their details.
    if (user.is_anonymous) redirect("/auth/signout");

    console.error(`No Prisma profile exists for authenticated user ${user.id}`);

    redirect("/onboarding");
  }

  // OAuth sign-ups, and accounts from before usernames existed, haven't
  // been asked for these yet — see app/onboarding. Guests are never asked:
  // they give their details when they sign up.
  if (!profile.is_guest && !isProfileComplete(profile)) {
    redirect("/onboarding");
  }

  return profile;
});

function isLearningReason(value: string | null): value is LearningReason {
  return value !== null && (LEARNING_REASONS as readonly string[]).includes(value);
}

function isNativeLanguage(value: string | null): value is NativeLanguage {
  return (NATIVE_LANGUAGES as readonly (string | null)[]).includes(value);
}

export function isProfileComplete(
  profile: Pick<Profile, "username" | "first_name" | "last_name">,
): boolean {
  return Boolean(profile.username && profile.first_name && profile.last_name);
}

// For course content: any signed-in learner — guest, free or member (see
// lib/access.ts). What each tier may *learn* is capped separately, where
// new items are introduced (see getLearningAllowance); reviews and
// quizzes of what they've already learnt are open to everyone. Called from
// the data functions and server actions that serve course content (not
// just the pages), since those are reachable directly.
export const requireLearner = cache(async (): Promise<Profile> => {
  return requireProfile();
});

// Members-only features (the daily challenge): a member's profile, or a
// redirect — guests to sign up, free accounts to the membership page.
export const requireMember = cache(async (): Promise<Profile> => {
  const profile = await requireProfile();

  if (profile.tier === "guest") redirect("/signup");
  if (profile.tier !== "member") redirect("/dashboard/billing");

  return profile;
});

// Pages that only make sense with a real account (profile, settings,
// membership) — guests are sent to sign up instead.
export const requireRegisteredProfile = cache(async (): Promise<Profile> => {
  const profile = await requireProfile();

  if (profile.is_guest) redirect("/signup");

  return profile;
});

// How many more new words and grammar points the current user may learn
// (see lib/access.ts). Counts every item they've been taught, across all
// courses; skipped ("I know this") items aren't taught, so don't count.
export const getLearningAllowance = cache(async (): Promise<Allowance> => {
  const profile = await requireLearner();

  if (profile.tier === "member") {
    return allowanceFor("member", { vocab: 0, grammar: 0 });
  }

  const [vocab, grammar] = await Promise.all(
    (["vocab", "grammar"] as const).map((path) =>
      prisma.userWordProgress.count({
        where: { userId: profile.id, skipped: false, word: { path } },
      }),
    ),
  );

  return allowanceFor(profile.tier, { vocab, grammar });
});

export const requireAdminProfile = cache(async (): Promise<Profile> => {
  const profile = await requireProfile();

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  return profile;
});

// How many active courses the user is enrolled in — just the count, for
// deciding whether to show a way back to the course list (see the course
// home's "My courses" breadcrumb) without loading every course's progress.
export const getEnrolledCourseCount = cache(async (): Promise<number> => {
  const user = await requireLearner();
  return prisma.courseEnrollment.count({
    where: { userId: user.id, unenrolledAt: null, course: { active: true } },
  });
});

export const getEnrolledCourses = cache(
  async (): Promise<EnrolledCourseSummary[]> => {
    const user = await requireLearner();

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId: user.id, unenrolledAt: null, course: { active: true } },
      orderBy: { course: { position: "asc" } },
      include: {
        course: {
          include: {
            languageDecks: {
              select: {
                words: {
                  select: {
                    progress: {
                      where: { userId: user.id },
                      select: { status: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Shown streaks are recalculated from activity (see getCourseStreak),
    // not the enrollment's stored counter, which never lapses on its own.
    const streaks = await getCourseStreaks();

    return enrollments.map((enrollment) => {
      const { course } = enrollment;
      const totalWords = course.languageDecks.reduce(
        (sum, languageDeck) => sum + languageDeck.words.length,
        0,
      );
      const knownWords = course.languageDecks.reduce(
        (sum, languageDeck) =>
          sum +
          languageDeck.words.filter((word) =>
            word.progress.some((p) => p.status === "known"),
          ).length,
        0,
      );
      const languageDecksDone = course.languageDecks.filter(
        (languageDeck) =>
          languageDeck.words.length > 0 &&
          languageDeck.words.every((word) => word.progress.length > 0),
      ).length;

      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        targetLanguage: course.targetLanguage,
        sourceLanguage: course.sourceLanguage,
        currentStreak: streaks[course.slug] ?? 0,
        longestStreak: enrollment.longestStreak,
        totalWords,
        knownWords,
        totalLanguageDecks: course.languageDecks.length,
        languageDecksDone,
      };
    });
  },
);

export const getAdminCourses = cache(async (): Promise<AdminCourseOption[]> => {
  return prisma.course.findMany({
    orderBy: { position: "asc" },
    select: { id: true, slug: true, title: true, active: true },
  });
});

// Category (LanguageDeck) list for the admin content-management pages —
// includes every languageDeck regardless of active state, unlike
// `getCourseDecks`'s learner-facing active-only filter.
export const getAdminCategoryOverview = cache(
  async (
    courseSlug: string,
  ): Promise<{ course: CourseSummary; categories: AdminCategorySummary[] }> => {
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
    });

    if (!course) {
      redirect("/dashboard/admin/courses");
    }

    const languageDecks = await prisma.languageDeck.findMany({
      where: { courseId: course.id },
      orderBy: { position: "asc" },
      include: { words: { select: { path: true } } },
    });

    return {
      course: toCourseSummary(course),
      categories: languageDecks.map((languageDeck) => {
        const vocabCount = languageDeck.words.filter((word) => word.path === "vocab").length;
        const grammarCount = languageDeck.words.length - vocabCount;

        return {
          id: languageDeck.id,
          title: languageDeck.title,
          vocabCount,
          grammarCount,
          position: languageDeck.position,
          active: languageDeck.active,
          tags: languageDeck.tags,
        };
      }),
    };
  },
);

// Full word list for one category (LanguageDeck), unfiltered by `active` — used by
// the admin category-detail page and by the import flow's word-selection
// step (called with the *source* languageDeck's id there), both of which need to
// see and toggle inactive rows rather than have them silently excluded.
export const getAdminCategoryWords = cache(async (languageDeckId: string) => {
  const languageDeck = await prisma.languageDeck.findUnique({
    where: { id: languageDeckId },
    include: {
      course: { select: { slug: true, title: true } },
      words: {
        orderBy: { position: "asc" },
        include: {
          forms: { orderBy: { position: "asc" } },
          examples: { orderBy: { position: "asc" } },
          alternateAnswers: { orderBy: { position: "asc" } },
          category: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  if (!languageDeck) {
    redirect("/dashboard/admin/courses");
  }

  return {
    languageDeck: {
      id: languageDeck.id,
      title: languageDeck.title,
      subheading: languageDeck.subheading,
      description: languageDeck.description,
      coverImage: deckCoverImagePath(languageDeck),
      bgColor: languageDeck.bgColor,
      primaryColor: languageDeck.primaryColor,
    },
    course: languageDeck.course,
    words: languageDeck.words.map(
      (word): AdminWordSummary => toAdminWordSummary(word),
    ),
  };
});

// Single deck (LanguageDeck) for the admin edit-deck page, with just enough
// course context to build the "back to deck" link — mirrors `getAdminWord`.
export const getAdminCategory = cache(async (languageDeckId: string) => {
  const languageDeck = await prisma.languageDeck.findUnique({
    where: { id: languageDeckId },
    include: { course: { select: { slug: true, title: true } } },
  });

  if (!languageDeck) {
    redirect("/dashboard/admin/courses");
  }

  const category: AdminCategoryDetail = {
    id: languageDeck.id,
    title: languageDeck.title,
    subheading: languageDeck.subheading,
    description: languageDeck.description,
    coverImageKey: languageDeck.coverImageKey,
    bgColor: languageDeck.bgColor,
    primaryColor: languageDeck.primaryColor,
    tags: languageDeck.tags,
  };

  return { category, course: languageDeck.course };
});

// Single word for the admin edit-word page, with enough languageDeck/course
// context to verify the route params and build the "back to category" link.
export const getAdminWord = cache(async (wordId: string) => {
  const word = await prisma.word.findUnique({
    where: { id: wordId },
    include: {
      languageDeck: {
        select: {
          id: true,
          title: true,
          course: { select: { slug: true, title: true } },
        },
      },
      forms: { orderBy: { position: "asc" } },
      examples: { orderBy: { position: "asc" } },
      alternateAnswers: { orderBy: { position: "asc" } },
      category: { select: { id: true, name: true, color: true } },
    },
  });

  if (!word) {
    redirect("/dashboard/admin/courses");
  }

  return {
    word: toAdminWordSummary(word),
    languageDeck: { id: word.languageDeck.id, title: word.languageDeck.title },
    course: word.languageDeck.course,
  };
});

// Every word category, for the admin word-category management page and the
// dropdown on the word create/edit forms. Small, unfiltered, ordered for
// display — not scoped to a course, since a category is meant to be reused
// across decks/courses (unlike a `LanguageDeck`).
export const getWordCategories = cache(
  async (): Promise<WordCategoryOption[]> => {
    return prisma.wordCategory.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, color: true },
    });
  },
);

function toAdminWordSummary(word: {
  id: string;
  term: string;
  translation: string;
  romanization: string | null;
  exampleSentence: string | null;
  explanation: string | null;
  explanationJa: string | null;
  position: number;
  imageKey: string | null;
  active: boolean;
  wordType: string | null;
  path: string;
  category: { id: string; name: string; color: string } | null;
  forms: { id: string; labelEn: string; labelJa: string; value: string }[];
  examples: {
    id: string;
    formId: string | null;
    en: string;
    ja: string;
    romanization: string | null;
    enHighlight: string | null;
    jaHighlight: string | null;
  }[];
  alternateAnswers: { id: string; value: string }[];
}): AdminWordSummary {
  return {
    id: word.id,
    term: word.term,
    translation: word.translation,
    romanization: word.romanization,
    exampleSentence: word.exampleSentence,
    explanation: word.explanation,
    explanationJa: word.explanationJa,
    position: word.position,
    imageKey: word.imageKey,
    active: word.active,
    wordType: word.wordType as WordType | null,
    path: word.path as "vocab" | "grammar",
    category: word.category,
    forms: word.forms.map((form) => ({
      id: form.id,
      labelEn: form.labelEn,
      labelJa: form.labelJa,
      value: form.value,
    })),
    examples: word.examples.map((example) => ({
      id: example.id,
      formId: example.formId,
      en: example.en,
      ja: example.ja,
      romanization: example.romanization,
      enHighlight: example.enHighlight,
      jaHighlight: example.jaHighlight,
    })),
    alternateAnswers: word.alternateAnswers.map((alt) => ({ id: alt.id, value: alt.value })),
  };
}

// Powers the admin "Quiz questions" page for one word: a summary of what
// the auto-generated question kinds currently produce (so the admin can see
// what's already covered before adding more) plus the full list of
// hand-authored questions to edit.
export const getAdminWordQuizQuestions = cache(async (wordId: string) => {
  const word = await prisma.word.findUnique({
    where: { id: wordId },
    include: {
      languageDeck: {
        select: {
          id: true,
          title: true,
          course: { select: { slug: true, title: true, targetLanguage: true } },
        },
      },
      forms: { orderBy: { position: "asc" } },
      examples: { orderBy: { position: "asc" } },
      quizQuestions: { orderBy: { position: "asc" } },
    },
  });

  if (!word) {
    redirect("/dashboard/admin/courses");
  }

  // The actual sentences the real quiz would draw from for each form — not
  // just a count — so an admin can see (and fix, via the forms/examples
  // editor) a form that's under-represented, like "hottest" only ever
  // having one demonstrating example against "hot"'s six.
  const clozeByForm = findClozeMatchesByForm(
    word.forms,
    word.examples,
    word.languageDeck.course.targetLanguage,
  );

  return {
    word: { id: word.id, term: word.term, translation: word.translation },
    languageDeck: { id: word.languageDeck.id, title: word.languageDeck.title },
    course: word.languageDeck.course,
    autoForms: word.forms.map((form) => ({
      id: form.id,
      labelEn: form.labelEn,
      labelJa: form.labelJa,
      value: form.value,
      examples: (clozeByForm.get(form.id) ?? []).map((match) => ({
        en: match.sentence,
        ja: match.translation,
      })),
    })),
    questions: word.quizQuestions.map(
      (question): AdminQuizQuestionSummary => ({
        id: question.id,
        prompt: question.prompt,
        promptJa: question.promptJa,
        options: question.options,
        correctIndex: question.correctIndex,
      }),
    ),
  };
});

export const getAvailableCourses = cache(async (): Promise<AvailableCourse[]> => {
  const user = await requireLearner();

  const courses = await prisma.course.findMany({
    // Courses they're not currently in — including ones they've left, which
    // they can rejoin with their progress intact.
    where: { active: true, enrollments: { none: { userId: user.id, unenrolledAt: null } } },
    orderBy: { position: "asc" },
    // Any row left here is a course they've left before.
    include: { enrollments: { where: { userId: user.id }, select: { id: true, level: true } } },
  });

  return courses.map((course) => ({
    previouslyEnrolled: course.enrollments.length > 0,
    previousLevel: course.enrollments[0] ? parseCourseLevel(course.enrollments[0].level) : null,
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    targetLanguage: course.targetLanguage,
    sourceLanguage: course.sourceLanguage,
  }));
});

// Loads a course by slug and confirms the current user is enrolled in it,
// redirecting otherwise — so a direct URL hit can't reach a course's
// languageDecks/practice pages without having signed up for it first. Wrapped in
// `cache()` because nearly every course-scoped page calls several `dal.ts`
// functions in parallel (e.g. the course home page's getCourseDecks,
// getDailyWordCounts and getReviewQueueSummary), each of which calls this —
// without memoizing, that's 3+ redundant course+enrollment round trips to
// Postgres for one page view. One combined query instead of two separate
// ones for the same reason.
const requireEnrolledCourse = cache(async (courseSlug: string) => {
  const user = await requireLearner();

  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { userId: user.id, unenrolledAt: null, course: { slug: courseSlug, active: true } },
    include: { course: true },
  });

  if (!enrollment) {
    redirect("/dashboard/courses");
  }

  return { user, course: enrollment.course, enrollment };
});

function toCourseSummary(course: {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  targetLanguage: string;
  sourceLanguage: string;
}): CourseSummary {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    targetLanguage: course.targetLanguage,
    sourceLanguage: course.sourceLanguage,
  };
}

// A course's title for `generateMetadata` on the course pages. Public, not
// per-user (no enrollment check — the page itself does that), so it's a
// plain server-side `use cache` shared by every learner: page titles cost
// no DB round trip and don't hold up navigation.
export async function getCourseTitle(courseSlug: string): Promise<string> {
  "use cache";
  cacheLife("hours");

  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    select: { title: true },
  });

  return course?.title ?? "Donguri";
}

// Course landing page: meta + streak only — no languageDeck join, since languageDecks
// render on the Vocabulary sub-page instead.
export const getCourseHome = cache(async (courseSlug: string) => {
  const { course, enrollment } = await requireEnrolledCourse(courseSlug);

  return {
    course: toCourseSummary(course),
    currentStreak: enrollment.currentStreak,
    longestStreak: enrollment.longestStreak,
    level: parseCourseLevel(enrollment.level),
  };
});

// The learner's flagged words in this course, newest flag first (see
// section 53 of supabase/schema.sql). Inactive words and decks are left
// out, like everywhere else they'd be learnt or reviewed.
export const getFlaggedWords = cache(async (courseSlug: string): Promise<FlaggedWord[]> => {
  const { user, course } = await requireEnrolledCourse(courseSlug);

  const rows = await prisma.userWordProgress.findMany({
    where: {
      userId: user.id,
      flaggedAt: { not: null },
      word: { active: true, languageDeck: { courseId: course.id, active: true } },
    },
    orderBy: { flaggedAt: "desc" },
    select: {
      stage: true,
      word: { select: { id: true, term: true, translation: true, romanization: true, path: true } },
    },
  });

  return rows.map((row) => ({ ...row.word, stage: row.stage }));
});

// Every word and grammar point the learner has learnt in this course,
// newest first — skipped words ("I already know this") left out, like
// inactive words and decks.
export const getLearntWords = cache(async (courseSlug: string): Promise<LearntWord[]> => {
  const { user, course } = await requireEnrolledCourse(courseSlug);

  const rows = await prisma.userWordProgress.findMany({
    where: {
      userId: user.id,
      skipped: false,
      word: { active: true, languageDeck: { courseId: course.id, active: true } },
    },
    orderBy: { introducedAt: "desc" },
    select: {
      stage: true,
      flaggedAt: true,
      word: { select: { id: true, term: true, translation: true, romanization: true, path: true } },
    },
  });

  return rows.map((row) => ({ ...row.word, stage: row.stage, flagged: row.flaggedAt !== null }));
});

// How many words are flagged and learnt in this course — the counts on the
// course page's shortcuts to those two lists. One query for both: the
// course page already runs many in parallel against a remote database, and
// each extra one queues for a pooled connection.
export const getWordListCounts = cache(async (courseSlug: string) => {
  const { user, course } = await requireEnrolledCourse(courseSlug);

  const [row] = await prisma.$queryRaw<{ flagged: bigint; learnt: bigint }[]>`
    select
      count(*) filter (where p.flagged_at is not null) as flagged,
      count(*) filter (where not p.skipped) as learnt
    from public.user_word_progress p
    join public.words w on w.id = p.word_id
    join public.language_decks d on d.id = w.language_deck_id
    where p.user_id = ${user.id}::uuid
      and w.active
      and d.active
      and d.course_id = ${course.id}::uuid
  `;
  return { flagged: Number(row?.flagged ?? 0), learnt: Number(row?.learnt ?? 0) };
});

type LanguageDeckWordRow = {
  id: string;
  term: string;
  translation: string;
  romanization: string | null;
  path: string;
  // `introducedAt` only where this user's progress is selected (see
  // LANGUAGE_DECK_PROGRESS_SELECT) — it dates the deck's completion.
  progress: { status: string; introducedAt?: Date }[];
};

function toLanguageDeckSummary(languageDeck: {
  id: string;
  title: string;
  subheading: string | null;
  description: string | null;
  coverImageKey: string | null;
  bgColor: string | null;
  primaryColor: string | null;
  tags: string[];
  position: number;
  words: LanguageDeckWordRow[];
}): LanguageDeckSummary {
  const words = languageDeck.words.map((word) => ({
    id: word.id,
    term: word.term,
    translation: word.translation,
    romanization: word.romanization,
    known: word.progress.some((p) => p.status === "known"),
    path: word.path,
  }));
  const vocabCount = words.filter((word) => word.path === "vocab").length;
  const learntWords = languageDeck.words.filter((word) => word.progress.length > 0).length;
  // When the last word was learnt, if every word has been — drives the
  // just-finished celebration (see DeckCompleteCelebration).
  const introducedTimes = languageDeck.words.flatMap((word) =>
    word.progress.flatMap((p) => (p.introducedAt ? [p.introducedAt.getTime()] : [])),
  );
  const completedAt =
    words.length > 0 && learntWords === words.length && introducedTimes.length > 0
      ? new Date(Math.max(...introducedTimes)).toISOString()
      : null;

  return {
    id: languageDeck.id,
    title: languageDeck.title,
    subheading: languageDeck.subheading,
    description: languageDeck.description,
    coverImage: deckCoverImagePath(languageDeck),
    bgColor: languageDeck.bgColor,
    primaryColor: languageDeck.primaryColor,
    tags: languageDeck.tags,
    vocabCount,
    grammarCount: words.length - vocabCount,
    position: languageDeck.position,
    totalWords: words.length,
    learntWords,
    completedAt,
    knownWords: words.filter((word) => word.known).length,
    words,
  };
}

const LANGUAGE_DECK_WORDS_SELECT = {
  id: true,
  term: true,
  translation: true,
  romanization: true,
  path: true,
  progress: { select: { status: true } },
} as const;

// This user's own progress on each word, for the per-user deck queries.
const LANGUAGE_DECK_PROGRESS_SELECT = { status: true, introducedAt: true } as const;

// A "deck" is a LanguageDeck, which can hold a mixture of vocab words and
// grammar points (see the note on `Word.path` in prisma/schema.prisma).
// `activeDeckIds` is this user's personal "active decks" selection (see
// `getActiveDeckIds`) — which decks currently feed their Learn/Test pool,
// not an admin visibility toggle.
export const getCourseDecks = cache(async (courseSlug: string) => {
  const { user, course } = await requireEnrolledCourse(courseSlug);

  const [languageDecks, activeDeckIds] = await Promise.all([
    prisma.languageDeck.findMany({
      where: { courseId: course.id, active: true },
      orderBy: { position: "asc" },
      include: {
        words: {
          where: { active: true },
          orderBy: { position: "asc" },
          select: {
            ...LANGUAGE_DECK_WORDS_SELECT,
            progress: { where: { userId: user.id }, select: LANGUAGE_DECK_PROGRESS_SELECT },
          },
        },
      },
    }),
    getActiveDeckIds(course.id, user.id),
  ]);

  return {
    course: toCourseSummary(course),
    decks: languageDecks.map((languageDeck) =>
      toLanguageDeckSummary(languageDeck),
    ),
    activeDeckIds,
  };
});

// This user's personal "active decks" selection within a course — which
// decks currently feed the Learn/Test pool (see `getLearnQueueForCourse`).
// A brand-new enrollment has no activation rows yet, so the first deck
// (lowest position) counts as active by default, so Learn isn't dead on
// arrival. From then on it's purely the user's own selection — deactivating
// a deck later is respected, not re-activated ("any row at all, active or
// not, means the user has touched this before"). Read-only, so it's safe to
// run while prefetching or rendering: that default is only written down
// (see `ensureDeckActivations`) once the user changes their selection.
const getActiveDeckIds = cache(
  async (courseId: string, userId: string): Promise<string[]> => {
    const activations = await prisma.userDeckActivation.findMany({
      where: { userId, languageDeck: { courseId } },
      select: { languageDeckId: true, active: true },
    });

    if (activations.length > 0) {
      return activations
        .filter((activation) => activation.active)
        .map((activation) => activation.languageDeckId);
    }

    // Guests (see lib/access.ts) start with nothing selected — choosing
    // their decks is part of trying Donguri out.
    if ((await requireLearner()).is_guest) return [];

    const firstDeck = await getDefaultDeck(courseId);

    return firstDeck ? [firstDeck.id] : [];
  },
);

function getDefaultDeck(courseId: string) {
  return prisma.languageDeck.findFirst({
    where: { courseId, active: true },
    orderBy: { position: "asc" },
    select: { id: true },
  });
}

// Writes down `getActiveDeckIds`'s implicit first-deck default before an
// action changes the selection — otherwise activating a second deck would
// create the user's first activation row, and the default deck (which never
// had one) would silently drop out of their active set.
export async function ensureDeckActivations(courseSlug: string) {
  const { user, course } = await requireEnrolledCourse(courseSlug);

  const existing = await prisma.userDeckActivation.count({
    where: { userId: user.id, languageDeck: { courseId: course.id } },
  });

  // Guests have no implicit default deck (see getActiveDeckIds), so
  // there's nothing to write down.
  if (existing > 0 || user.is_guest) {
    return;
  }

  const firstDeck = await getDefaultDeck(course.id);

  if (firstDeck) {
    await prisma.userDeckActivation.createMany({
      data: [{ userId: user.id, languageDeckId: firstDeck.id }],
      skipDuplicates: true,
    });
  }
}

// Single languageDeck's stats/words for the deck detail and learn/test/review
// pages — a deck can hold vocab words, grammar points, or a mix (see the
// note on `Word.path` in prisma/schema.prisma); the learn/quiz/review-queue
// mechanics never cared about a deck's own identity, only each word's.
// Redirects to the deck list if the id doesn't resolve to an active
// languageDeck in this course.
export const getDeckDetail = cache(
  async (courseSlug: string, deckId: string) => {
    const { user, course } = await requireEnrolledCourse(courseSlug);

    const languageDeck = await prisma.languageDeck.findFirst({
      where: { id: deckId, courseId: course.id, active: true },
      include: {
        words: {
          where: { active: true },
          orderBy: { position: "asc" },
          select: {
            ...LANGUAGE_DECK_WORDS_SELECT,
            progress: { where: { userId: user.id }, select: LANGUAGE_DECK_PROGRESS_SELECT },
          },
        },
      },
    });

    if (!languageDeck) {
      redirect(`/dashboard/courses/${courseSlug}`);
    }

    return {
      course: toCourseSummary(course),
      deck: toLanguageDeckSummary(languageDeck),
    };
  },
);

// Public, logged-out view of a deck (app/courses/[slug]/decks/[deckId]) —
// no session required and no per-user progress, so every word reads as
// unlearnt. Returns null (→ notFound) rather than redirecting, since there's
// no dashboard to bounce a visitor back to.
export const getPublicDeckDetail = cache(
  async (courseSlug: string, deckId: string) => {
    const languageDeck = await prisma.languageDeck.findFirst({
      where: { id: deckId, active: true, course: { slug: courseSlug, active: true } },
      include: {
        course: true,
        words: {
          where: { active: true },
          orderBy: { position: "asc" },
          select: {
            id: true,
            term: true,
            translation: true,
            romanization: true,
            path: true,
          },
        },
      },
    });

    if (!languageDeck) {
      return null;
    }

    return {
      course: toCourseSummary(languageDeck.course),
      deck: toLanguageDeckSummary({
        ...languageDeck,
        words: languageDeck.words.map((word) => ({ ...word, progress: [] })),
      }),
    };
  },
);

// One entry per day in the current streak's date range (zero-filled for a
// day with no activity — a review-only day is still a valid streak day),
// always at least the trailing 7 days so a short or empty streak still
// renders as a proper week-wide chart instead of one or two bars. Splits
// each day's total across vocab words learned, grammar points learned
// (both from `UserWordProgress.introducedAt`, keyed by the word's own
// `path`), and daily challenge attempts completed.
export const getDailyActivityCounts = cache(
  async (courseSlug: string): Promise<DailyActivityCount[]> => {
    const { user, course } = await requireEnrolledCourse(courseSlug);

    // Always the last 7 days, through today — however long the streak (the
    // chart shows the streak count itself separately). Today is included
    // even before it has any activity, so a day with nothing logged yet
    // shows up as an empty bar to fill in, rather than disappearing from
    // the chart until something is learned.
    const today = startOfUTCDay(new Date());
    const rangeStart = addDays(today, -6);
    const rangeEnd = today;
    const rangeEndExclusive = addDays(rangeEnd, 1);

    const [progress, reviews, challengeAttempts] = await Promise.all([
      prisma.userWordProgress.findMany({
        where: {
          userId: user.id,
          word: { languageDeck: { courseId: course.id } },
          introducedAt: { gte: rangeStart, lt: rangeEndExclusive },
        },
        select: { introducedAt: true, word: { select: { path: true } } },
      }),
      prisma.reviewEvent.findMany({
        where: {
          userId: user.id,
          word: { languageDeck: { courseId: course.id } },
          createdAt: { gte: rangeStart, lt: rangeEndExclusive },
        },
        select: { createdAt: true, wordId: true },
      }),
      // Skipped attempts aren't a challenge done.
      prisma.dailyChallengeAttempt.findMany({
        where: {
          userId: user.id,
          courseId: course.id,
          challengeDate: { gte: rangeStart, lt: rangeEndExclusive },
          skipped: false,
        },
        select: { challengeDate: true },
      }),
    ]);

    const vocabCounts = new Map<string, number>();
    const grammarCounts = new Map<string, number>();
    for (const { introducedAt, word } of progress) {
      const day = startOfUTCDay(introducedAt).toISOString().slice(0, 10);
      const counts = word.path === "grammar" ? grammarCounts : vocabCounts;
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }

    // Distinct words per day — answering the same word twice in one day's
    // reviews still counts it once.
    const reviewedWords = new Map<string, Set<string>>();
    for (const { createdAt, wordId } of reviews) {
      const day = toUTCDateString(createdAt);
      const words = reviewedWords.get(day) ?? new Set<string>();
      words.add(wordId);
      reviewedWords.set(day, words);
    }

    const challengeCounts = new Map<string, number>();
    for (const { challengeDate } of challengeAttempts) {
      const day = challengeDate.toISOString().slice(0, 10);
      challengeCounts.set(day, (challengeCounts.get(day) ?? 0) + 1);
    }

    const days: DailyActivityCount[] = [];
    for (let day = rangeStart; day <= rangeEnd; day = addDays(day, 1)) {
      const date = day.toISOString().slice(0, 10);
      days.push({
        date,
        vocab: vocabCounts.get(date) ?? 0,
        grammar: grammarCounts.get(date) ?? 0,
        review: reviewedWords.get(date)?.size ?? 0,
        challenge: challengeCounts.get(date) ?? 0,
      });
    }

    return days;
  },
);

// Words learnt (introduced and not skipped — vocab and grammar together) and
// answer accuracy over the trailing 7 days, for this course. There's no
// per-answer log, only running `correctCount`/`incorrectCount` per word, so
// accuracy is taken over every word answered this week (`lastSeenAt` in
// range) using those words' running totals.
// The trailing 7 UTC days, today included — the same window the course
// activity chart shows, shared by the weekly stats and weekly leaderboard.
function startOfTrailingWeek(): Date {
  return addDays(startOfUTCDay(new Date()), -6);
}

export const getWeeklyStats = cache(
  async (courseSlug: string): Promise<WeeklyStats> => {
    const { user, course } = await requireEnrolledCourse(courseSlug);
    const weekStart = startOfTrailingWeek();
    const inCourse = { languageDeck: { courseId: course.id } };

    const [wordsLearnt, answered, xpEarned] = await Promise.all([
      prisma.userWordProgress.count({
        where: {
          userId: user.id,
          skipped: false,
          introducedAt: { gte: weekStart },
          word: inCourse,
        },
      }),
      prisma.reviewEvent.groupBy({
        by: ["correct"],
        where: { userId: user.id, createdAt: { gte: weekStart }, word: inCourse },
        _count: true,
      }),
      // Account-wide, like XP everywhere else — not scoped to this course.
      prisma.xpEvent.aggregate({
        where: { userId: user.id, createdAt: { gte: weekStart } },
        _sum: { amount: true },
      }),
    ]);

    const correct = answered.find((row) => row.correct)?._count ?? 0;
    const total = answered.reduce((sum, row) => sum + row._count, 0);

    return {
      wordsLearnt,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : null,
      xpEarned: xpEarned._sum.amount ?? 0,
    };
  },
);

// The UTC days a user did anything in one course — learnt or answered a
// word, reviewed, or finished a daily challenge. What a course's streak is
// counted from (see `computeStreakFromActiveDays` in lib/srs.ts).
async function courseActiveDays(userId: string, courseId: string): Promise<Set<string>> {
  const inCourse = { languageDeck: { courseId } };
  const [progress, reviews, attempts] = await Promise.all([
    prisma.userWordProgress.findMany({
      where: { userId, word: inCourse },
      select: { introducedAt: true, lastSeenAt: true },
    }),
    // `lastSeenAt` only keeps each word's latest review, so earlier review
    // days come from the review log instead.
    prisma.reviewEvent.findMany({
      where: { userId, word: inCourse },
      select: { createdAt: true },
    }),
    // A skipped challenge doesn't keep a streak alive.
    prisma.dailyChallengeAttempt.findMany({
      where: { userId, courseId, skipped: false },
      select: { challengeDate: true },
    }),
  ]);

  const activeDays = new Set<string>();
  for (const { introducedAt, lastSeenAt } of progress) {
    activeDays.add(toUTCDateString(introducedAt));
    if (lastSeenAt) activeDays.add(toUTCDateString(lastSeenAt));
  }
  for (const { createdAt } of reviews) {
    activeDays.add(toUTCDateString(createdAt));
  }
  for (const { challengeDate } of attempts) {
    activeDays.add(toUTCDateString(challengeDate));
  }
  return activeDays;
}

// Streaks are per course: each course's own run of active days, so
// resetting one course's progress resets its streak without touching
// another's, and practising one course doesn't keep another's alive.
export const getCourseStreak = cache(async (courseSlug: string): Promise<CourseStreakInfo> => {
  const { user, course } = await requireEnrolledCourse(courseSlug);
  return computeStreakFromActiveDays(await courseActiveDays(user.id, course.id));
});

// Every enrolled course's current streak, by slug — for places that aren't
// inside one course: the header (which picks the course in the URL, or the
// best one elsewhere) and the dashboard's course list.
export const getCourseStreaks = cache(async (): Promise<Record<string, number>> => {
  const user = await requireUser();
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId: user.id, unenrolledAt: null, course: { active: true } },
    select: { course: { select: { id: true, slug: true } } },
  });

  const entries = await Promise.all(
    enrollments.map(async ({ course }) => {
      const { currentStreak } = computeStreakFromActiveDays(
        await courseActiveDays(user.id, course.id),
      );
      return [course.slug, currentStreak] as const;
    }),
  );
  return Object.fromEntries(entries);
});

// A user's longest-ever run of active days — in one course when `courseId`
// is given, else the best of any course. What a streak badge measures (see
// lib/badges.ts). The longest rather than the current run, so a 14-day
// streak that's since lapsed still counts. Takes a user id, since badges
// given to existing users are worked out for everyone at once.
export async function longestStreakForUser(
  userId: string,
  courseId: string | null = null,
): Promise<number> {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId, ...(courseId ? { courseId } : {}) },
    select: { courseId: true },
  });
  const streaks = await Promise.all(
    enrollments.map(
      async ({ courseId }) =>
        computeStreakFromActiveDays(await courseActiveDays(userId, courseId)).longestStreak,
    ),
  );
  return Math.max(0, ...streaks);
}

// How many of today's (UTC) 3 daily-challenge attempts this user has used up
// for this course — see sendDailyChallengeMessage in
// lib/actions/daily-challenge.ts, which enforces the same cap on write.
export const getDailyChallengeStatus = cache(
  async (courseSlug: string): Promise<DailyChallengeStatus> => {
    const { user, course } = await requireEnrolledCourse(courseSlug);

    const attemptsToday = await prisma.dailyChallengeAttempt.count({
      where: {
        userId: user.id,
        courseId: course.id,
        challengeDate: startOfUTCDay(new Date()),
      },
    });

    return { attemptsToday, maxAttemptsPerDay: MAX_DAILY_CHALLENGE_ATTEMPTS };
  },
);

// Today's (UTC) finished or skipped attempts in this course, oldest first
// — what the end-of-day summary on the daily-challenge page reviews.
export const getDailyChallengeResults = cache(
  async (courseSlug: string): Promise<DailyChallengeResult[]> => {
    const { user, course } = await requireEnrolledCourse(courseSlug);

    const attempts = await prisma.dailyChallengeAttempt.findMany({
      where: {
        userId: user.id,
        courseId: course.id,
        challengeDate: startOfUTCDay(new Date()),
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        xpEarned: true,
        skipped: true,
        targetTerms: true,
        message: true,
        grammarScore: true,
        naturalnessScore: true,
        relevanceScore: true,
        complexityScore: true,
        summary: true,
      },
    });

    // Attempts store only the terms, so their Japanese comes from the
    // course's words as they are now.
    const terms = [...new Set(attempts.flatMap((attempt) => attempt.targetTerms))];
    const words =
      terms.length === 0
        ? []
        : await prisma.word.findMany({
            where: { term: { in: terms }, languageDeck: { courseId: course.id } },
            select: { term: true, translation: true },
          });
    const translations = new Map(words.map((word) => [word.term, word.translation]));

    return attempts.map(({ summary, ...attempt }) => {
      const review = (summary ?? {}) as Partial<ChallengeSummary>;
      return {
        ...attempt,
        targets: attempt.targetTerms.map((term) => ({
          term,
          translation: translations.get(term) ?? null,
        })),
        overall: typeof review.overall === "string" ? review.overall : null,
        overallJa: typeof review.overallJa === "string" ? review.overallJa : null,
        tips: Array.isArray(review.tips)
          ? review.tips.filter((tip): tip is string => typeof tip === "string")
          : [],
        tipsJa: Array.isArray(review.tipsJa)
          ? review.tipsJa.filter((tip): tip is string => typeof tip === "string")
          : [],
        betterVersion: typeof review.betterVersion === "string" ? review.betterVersion : null,
        betterVersionRomanization:
          typeof review.betterVersionRomanization === "string"
            ? review.betterVersionRomanization
            : null,
      };
    });
  },
);

// The status plus the word/grammar target for the user's next attempt —
// null once today's attempts are used up, or when the user hasn't learnt
// any words or grammar in this course yet. Picked by the same deterministic
// pickChallengeTarget the chat action uses, so the two always agree.
export const getDailyChallenge = cache(
  async (
    courseSlug: string,
  ): Promise<DailyChallengeStatus & { target: ChallengeTarget | null }> => {
    const [{ user, course }, status] = await Promise.all([
      requireEnrolledCourse(courseSlug),
      getDailyChallengeStatus(courseSlug),
    ]);

    const target =
      status.attemptsToday < status.maxAttemptsPerDay
        ? await pickChallengeTarget(
            user.id,
            course.id,
            startOfUTCDay(new Date()),
            status.attemptsToday,
          )
        : null;

    return { ...status, target };
  },
);

type LeaderboardProfile = {
  id: string;
  username: string | null;
  fullName: string | null;
  email: string;
  xp: number;
  donguriConfig: unknown;
  profileHidden: boolean;
};

const LEADERBOARD_PROFILE_SELECT = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  xp: true,
  donguriConfig: true,
  profileHidden: true,
} as const;

function toLeaderboardEntry(
  profile: LeaderboardProfile,
  weeklyXp: number,
  selfId: string,
): LeaderboardEntry {
  return {
    id: profile.id,
    // Only users who never finished onboarding lack a username.
    name: profile.username ?? profile.fullName ?? profile.email.split("@")[0],
    xp: profile.xp,
    weeklyXp,
    equippedAccessory:
      (parseDonguriConfig(profile.donguriConfig).equippedAccessory as
        | AccessoryId
        | undefined) ?? null,
    isSelf: profile.id === selfId,
    profileHref: profileHref(profile, selfId),
  };
}

// A profile page's path, or null when the viewer (`selfId`) isn't allowed to
// see it — hidden profiles are only reachable by their owner.
export function profileHref(
  profile: { id: string; username: string | null; profileHidden: boolean },
  selfId: string,
): string | null {
  if (!profile.username) return null;
  if (profile.profileHidden && profile.id !== selfId) return null;
  return `/user/${profile.username}`;
}

// Ranked by XP earned this week, total XP breaking ties.
function byWeeklyXp(a: LeaderboardEntry, b: LeaderboardEntry): number {
  return b.weeklyXp - a.weeklyXp || b.xp - a.xp;
}

// Each given user's XP earned in the trailing week (see XpEvent), keyed by
// user id — users with none this week are simply absent.
async function getWeeklyXpByUser(
  userIds?: string[],
): Promise<Map<string, number>> {
  const rows = await prisma.xpEvent.groupBy({
    by: ["userId"],
    where: {
      createdAt: { gte: startOfTrailingWeek() },
      // Guests (see lib/access.ts) have no name to show and aren't ranked.
      profile: { isGuest: false },
      ...(userIds && { userId: { in: userIds } }),
    },
    _sum: { amount: true },
  });

  return new Map(rows.map((row) => [row.userId, row._sum.amount ?? 0]));
}

// Every friend the user has added, plus themselves (so you can see your own
// rank among friends) — sorted by XP earned this week, highest first.
// Deliberately not wrapped in `cache()`: this is also called fresh from the
// add/remove-friend actions right after a mutation, where a memoized read
// would be stale.
export async function getFriendsLeaderboard(
  userId: string,
): Promise<LeaderboardEntry[]> {
  const [friendships, self] = await Promise.all([
    prisma.friendship.findMany({
      where: { userId },
      include: { friend: { select: LEADERBOARD_PROFILE_SELECT } },
    }),
    prisma.profile.findUniqueOrThrow({
      where: { id: userId },
      select: LEADERBOARD_PROFILE_SELECT,
    }),
  ]);

  const profiles = [self, ...friendships.map((friendship) => friendship.friend)];
  const weeklyXp = await getWeeklyXpByUser(profiles.map((profile) => profile.id));

  return profiles
    .map((profile) =>
      toLeaderboardEntry(profile, weeklyXp.get(profile.id) ?? 0, userId),
    )
    .sort(byWeeklyXp);
}

// Global top 10 by XP earned this week, plus the viewer's own friends
// leaderboard (which always includes themselves) — XP is an app-wide stat,
// not per-course, so this isn't scoped to whichever course displays it.
// When fewer than 10 earned XP this week, the rest are filled by total XP
// (with 0 this week) so the board is never empty.
export const getLeaderboards = cache(
  async (): Promise<{
    top: LeaderboardEntry[];
    friends: LeaderboardEntry[];
  }> => {
    const user = await requireUser();

    const [weeklyXp, friends] = await Promise.all([
      getWeeklyXpByUser(),
      getFriendsLeaderboard(user.id),
    ]);

    // Weekly totals are summed per user in the DB, but a user's rank can't
    // be taken from there directly since ties fall back to total XP — so
    // fetch every weekly-active profile, plus the top 10 by total XP as
    // filler for anyone at 0 this week, and rank here.
    const [activeProfiles, fillerProfiles] = await Promise.all([
      prisma.profile.findMany({
        where: { id: { in: [...weeklyXp.keys()] } },
        select: LEADERBOARD_PROFILE_SELECT,
      }),
      prisma.profile.findMany({
        where: { isGuest: false },
        orderBy: { xp: "desc" },
        take: 10,
        select: LEADERBOARD_PROFILE_SELECT,
      }),
    ]);

    const topProfiles = new Map(
      [...activeProfiles, ...fillerProfiles].map((profile) => [
        profile.id,
        profile,
      ]),
    );

    return {
      top: [...topProfiles.values()]
        .map((profile) =>
          toLeaderboardEntry(profile, weeklyXp.get(profile.id) ?? 0, user.id),
        )
        .sort(byWeeklyXp)
        .slice(0, 10),
      friends,
    };
  },
);

// A learner's profile page (app/user/[username]): only public
// stats — username, never their real name. Null when there's no such user,
// or they've hidden their profile from everyone but themselves.
export const getPublicProfile = cache(
  async (username: string): Promise<PublicProfile | null> => {
    const user = await requireUser();

    const profile = await prisma.profile.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        xp: true,
        donguriConfig: true,
        profileHidden: true,
        createdAt: true,
      },
    });
    if (!profile?.username) return null;

    const isSelf = profile.id === user.id;
    if (profile.profileHidden && !isSelf) return null;

    const [weeklyXp, lastActiveAt, wordsLearnt, dailyActivity, streak] = await Promise.all([
      getWeeklyXpByUser([profile.id]),
      getLastActiveAt(profile.id),
      // Across every course; "I already know this" skips don't count, as
      // with the words-learnt badges.
      prisma.userWordProgress.count({
        where: { userId: profile.id, skipped: false },
      }),
      getWeeklyActivity(profile.id),
      getBestStreak(profile.id),
    ]);

    return {
      id: profile.id,
      username: profile.username,
      xp: profile.xp,
      weeklyXp: weeklyXp.get(profile.id) ?? 0,
      lastActiveAt,
      memberSince: profile.createdAt,
      wordsLearnt,
      dailyActivity,
      ...streak,
      equippedAccessory:
        (parseDonguriConfig(profile.donguriConfig).equippedAccessory as
          | AccessoryId
          | undefined) ?? null,
      hidden: profile.profileHidden,
      isSelf,
    };
  },
);

// The trailing 7 UTC days of a user's activity, today included, across all
// their courses — the same counts as a course page's chart
// (getDailyActivityCounts), for their profile page.
async function getWeeklyActivity(userId: string): Promise<DailyActivityCount[]> {
  const today = startOfUTCDay(new Date());
  const rangeStart = addDays(today, -6);
  const rangeEnd = addDays(today, 1);

  const [progress, reviews, attempts] = await Promise.all([
    prisma.userWordProgress.findMany({
      where: { userId, skipped: false, introducedAt: { gte: rangeStart, lt: rangeEnd } },
      select: { introducedAt: true, word: { select: { path: true } } },
    }),
    prisma.reviewEvent.findMany({
      where: { userId, createdAt: { gte: rangeStart, lt: rangeEnd } },
      select: { createdAt: true, wordId: true },
    }),
    prisma.dailyChallengeAttempt.findMany({
      where: { userId, skipped: false, challengeDate: { gte: rangeStart, lt: rangeEnd } },
      select: { challengeDate: true },
    }),
  ]);

  const days = new Map<string, DailyActivityCount>();
  for (let day = rangeStart; day < rangeEnd; day = addDays(day, 1)) {
    const date = toUTCDateString(day);
    days.set(date, { date, vocab: 0, grammar: 0, review: 0, challenge: 0 });
  }
  for (const { introducedAt, word } of progress) {
    const day = days.get(toUTCDateString(introducedAt));
    if (day) day[word.path === "grammar" ? "grammar" : "vocab"]++;
  }
  // Distinct words reviewed per day, as on the course chart.
  const reviewed = new Map<string, Set<string>>();
  for (const { createdAt, wordId } of reviews) {
    const date = toUTCDateString(createdAt);
    reviewed.set(date, (reviewed.get(date) ?? new Set()).add(wordId));
  }
  for (const [date, words] of reviewed) {
    const day = days.get(date);
    if (day) day.review = words.size;
  }
  for (const { challengeDate } of attempts) {
    const day = days.get(toUTCDateString(challengeDate));
    if (day) day.challenge++;
  }
  return [...days.values()];
}

// A user's streak for their profile: the best current streak among the
// courses they're in (streaks are kept per course — see courseActiveDays).
async function getBestStreak(
  userId: string,
): Promise<{ currentStreak: number; longestStreak: number; activeToday: boolean }> {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId, unenrolledAt: null, course: { active: true } },
    select: { courseId: true },
  });
  const streaks = await Promise.all(
    enrollments.map(async ({ courseId }) =>
      computeStreakFromActiveDays(await courseActiveDays(userId, courseId)),
    ),
  );
  return {
    currentStreak: Math.max(0, ...streaks.map((streak) => streak.currentStreak)),
    longestStreak: Math.max(0, ...streaks.map((streak) => streak.longestStreak)),
    activeToday: streaks.some((streak) => streak.activeToday),
  };
}

// The last time the user did anything that counts as studying — earned XP,
// answered a review, or learnt or answered a word. Null if they never have.
async function getLastActiveAt(userId: string): Promise<Date | null> {
  const [xp, review, progress] = await Promise.all([
    prisma.xpEvent.aggregate({ where: { userId }, _max: { createdAt: true } }),
    prisma.reviewEvent.aggregate({ where: { userId }, _max: { createdAt: true } }),
    prisma.userWordProgress.aggregate({
      where: { userId },
      _max: { introducedAt: true, lastSeenAt: true },
    }),
  ]);

  const times = [
    xp._max.createdAt,
    review._max.createdAt,
    progress._max.introducedAt,
    progress._max.lastSeenAt,
  ].filter((time): time is Date => time !== null);

  return times.length > 0
    ? new Date(Math.max(...times.map((time) => time.getTime())))
    : null;
}

// Picks up to SET_SIZE new words pooled from *every currently active deck*,
// vocab and grammar together (see `getActiveDeckIds`) — "you can have more
// than one activated deck," and the words are drawn at random from across
// all of them, not in position order from a single one, so a batch can mix
// vocab words and grammar points (each `RevealWord` carries its own `path`
// so the UI can label which is which). Read-only, so the page can be
// prefetched without introducing words the user never opens: LearnSession
// marks each word learnt only as the learner clicks "Got it" on it, via the
// `learnWord` action (see `introduceLearnWords` below). Capped by the
// learner's free allowance (see lib/access.ts) — `limitReached` says when
// there was more to learn but the allowance ran out, so the page can ask
// them to sign up or become a member instead of saying they're done.
export const getLearnQueueForCourse = cache(
  async (courseSlug: string): Promise<{ words: RevealWord[]; limitReached: boolean }> => {
    const { user, course } = await requireEnrolledCourse(courseSlug);
    const [languageDeckIds, allowance] = await Promise.all([
      getActiveDeckIds(course.id, user.id),
      getLearningAllowance(),
    ]);

    if (languageDeckIds.length === 0) {
      return { words: [], limitReached: false };
    }

    const candidates = await prisma.word.findMany({
      where: {
        languageDeckId: { in: languageDeckIds },
        active: true,
        progress: { none: { userId: user.id } },
      },
      include: {
        forms: { orderBy: { position: "asc" } },
        examples: { orderBy: { position: "asc" } },
      },
    });

    const newWords = withinAllowance(shuffle(candidates), allowance).slice(0, SET_SIZE);

    return {
      words: newWords.map((word) => toRevealWord(word, course)),
      limitReached: newWords.length === 0 && candidates.length > 0,
    };
  },
);

const revealWordInclude = {
  forms: { orderBy: { position: "asc" } },
  examples: { orderBy: { position: "asc" } },
} as const;

// What the learn card shows for one word — shared by the learn queue and
// the quiz's "See the lesson" modal (see getLessonWord).
function toRevealWord(
  word: Prisma.WordGetPayload<{ include: typeof revealWordInclude }>,
  course: { targetLanguage: string },
): RevealWord {
  return {
    id: word.id,
    term: word.term,
    translation: word.translation,
    romanization: word.romanization,
    wordType: (WORD_TYPES as readonly string[]).includes(word.wordType ?? "")
      ? (word.wordType as WordType)
      : null,
    exampleSentence: word.exampleSentence,
    explanation: word.explanation,
    explanationJa: word.explanationJa,
    forms: word.forms.map((form) => ({
      id: form.id,
      labelEn: form.labelEn,
      labelJa: form.labelJa,
      value: form.value,
    })),
    examples: word.examples.map((example) => ({
      id: example.id,
      formId: example.formId,
      en: example.en,
      ja: example.ja,
      romanization: example.romanization,
      enHighlight: example.enHighlight,
      jaHighlight: example.jaHighlight,
    })),
    image: wordImagePath(word),
    targetLanguage: course.targetLanguage,
    path: word.path as "vocab" | "grammar",
  };
}

// One word's learn card, for re-reading it mid-quiz. Scoped to a course the
// user is enrolled in, since the id comes from the client.
export async function getLessonWord(
  courseSlug: string,
  wordId: string,
): Promise<RevealWord | null> {
  const { course } = await requireEnrolledCourse(courseSlug);

  const word = await prisma.word.findFirst({
    where: { id: wordId, languageDeck: { courseId: course.id } },
    include: revealWordInclude,
  });

  return word ? toRevealWord(word, course) : null;
}

// Marks words from a batch handed out by `getLearnQueueForCourse` as
// learnt: creates their `UserWordProgress` rows (stage 1, first review due
// 15 minutes out) and bumps the streak. Called one word at a time, as the
// learner clicks "Got it" on each (see `learnWord` in lib/actions/vocab.ts)
// — never for the whole batch up front, so a word only counts once it's
// actually been read. The ids come from the client, so they're re-checked
// against the same pool the queue draws from — active words in this user's
// active decks that they haven't met yet — and anything else is ignored.
export async function introduceLearnWords(courseSlug: string, wordIds: string[]) {
  const { user, course } = await requireEnrolledCourse(courseSlug);
  const [languageDeckIds, allowance] = await Promise.all([
    getActiveDeckIds(course.id, user.id),
    getLearningAllowance(),
  ]);

  if (wordIds.length === 0 || languageDeckIds.length === 0) {
    return;
  }

  // Re-checked here, not just when the queue was built — server actions
  // are callable directly, so this is what actually enforces the limit.
  const words = withinAllowance(
    await prisma.word.findMany({
      where: {
        id: { in: wordIds.slice(0, SET_SIZE) },
        languageDeckId: { in: languageDeckIds },
        active: true,
        progress: { none: { userId: user.id } },
      },
      select: { id: true, path: true },
    }),
    allowance,
  );

  if (words.length === 0) {
    return;
  }

  await prisma.userWordProgress.createMany({
    data: words.map((word) => ({
      userId: user.id,
      wordId: word.id,
      stage: 1,
      // Set immediately, not deferred to the first quiz answer — a word's
      // stage-1 review is due 15 minutes after it's *learned*, regardless of
      // when (or how well) its post-learn quiz goes; the quiz never advances
      // stage (see `recordAnswer` in lib/actions/vocab.ts).
      nextReviewAt: nextReviewAtForStage(1),
    })),
    skipDuplicates: true,
  });

  await bumpStreak(user.id, course.id, new Date());
}

// Quiz-only, never introduces new words — the "Test yourself" half of the
// learn/quiz pair. Pool is every word *anywhere in the course*, vocab and
// grammar together, that's been learned but never yet answered
// (`lastSeenAt: null`) — not filtered to currently-active decks, since
// deactivating a deck after learning some of its words shouldn't hide their
// pending quiz. For vocab, each word gets exactly two questions (one
// multiple-choice, one typed — see `buildTypedQuestion`), so a fresh
// 3-word learn batch always produces 6 questions. Grammar matches that: two
// questions per point (see `buildGrammarQuizQuestions`) — fill-in-the-blanks
// from its examples where it has them — so a 3-point batch is 6 too,
// however many example sentences each point has. Both kinds are shuffled
// together into one
// quiz; each question carries its own `path` (see the QuizQuestion variants
// in lib/definitions.ts) so the UI can label which is which. Either way,
// answering these never advances the word's stage (see `recordAnswer`'s
// `advancesStage` in lib/actions/vocab.ts) — its stage-1 review stays due 4
// hours after it was *learned* (see `getLearnQueueForCourse`), not from
// whenever it happens to get quizzed. A word drops out of this pool the
// moment its first question is answered and from then on is governed
// entirely by its stage/`nextReviewAt` — i.e. by `getReviewQueue` below.
// The quiz only ever covers *one* learn batch — otherwise any earlier batch
// that was learnt but never quizzed would pile into this one. `wordIds`
// (passed from the Learn session's "Start quiz" button) names the batch
// explicitly; without it, it falls back to the most recently learnt batch
// (a batch's rows share one `introducedAt`, since `getLearnQueueForCourse`
// creates them in a single `createMany`). Skipped words are always
// excluded: they go straight to Mastered and are never quizzed.
// How far back from the most recently learnt word the quiz looks for the
// rest of its batch, when it isn't told which words to cover.
const LEARN_BATCH_WINDOW_MS = 30 * 60 * 1000;

export const getTestQueueForCourse = cache(
  async (courseSlug: string, wordIds?: string[]): Promise<QuizQuestion[]> => {
    const { user, course } = await requireEnrolledCourse(courseSlug);

    const freshWhere = {
      userId: user.id,
      lastSeenAt: null,
      skipped: false,
      word: {
        languageDeck: { courseId: course.id, active: true },
        active: true,
      },
    } as const;

    let batchFilter: { wordId: { in: string[] } } | { introducedAt: { gte: Date } };
    if (wordIds && wordIds.length > 0) {
      batchFilter = { wordId: { in: wordIds } };
    } else {
      // Words are committed one "Got it" at a time (see
      // `introduceLearnWords`), so a batch shares no single timestamp —
      // it's the fresh words learnt shortly before the latest one.
      const latest = await prisma.userWordProgress.findFirst({
        where: freshWhere,
        orderBy: { introducedAt: "desc" },
        select: { introducedAt: true },
      });
      if (!latest) {
        return [];
      }
      batchFilter = {
        introducedAt: { gte: new Date(latest.introducedAt.getTime() - LEARN_BATCH_WINDOW_MS) },
      };
    }

    const freshProgress = await prisma.userWordProgress.findMany({
      where: { ...freshWhere, ...batchFilter },
      include: {
        word: {
          include: {
            forms: { orderBy: { position: "asc" } },
            examples: { orderBy: { position: "asc" } },
          },
        },
      },
    });

    if (freshProgress.length === 0) {
      return [];
    }

    const grammarWords = freshProgress
      .filter((progress) => progress.word.path === "grammar")
      .map((progress) => ({ ...progress.word, path: "grammar" as const }));
    const vocabWords = freshProgress
      .filter((progress) => progress.word.path === "vocab")
      .map((progress) => ({ ...progress.word, path: "vocab" as const }));

    const grammarPool =
      grammarWords.length > 0 ? await loadGrammarPool(course) : null;
    const grammarQuestions = grammarWords.flatMap((word) =>
      buildGrammarQuizQuestions(word, course, grammarPool),
    );

    let vocabQuestions: QuizQuestion[] = [];
    if (vocabWords.length > 0) {
      const distractorPool = await prisma.word.findMany({
        where: {
          languageDeck: { courseId: course.id, active: true },
          path: "vocab",
          active: true,
        },
        select: {
          id: true,
          term: true,
          translation: true,
          romanization: true,
          languageDeckId: true,
          imageKey: true,
        },
      });
      const distractorWords = distractorPool.map((word) => ({
        ...word,
        path: "vocab" as const,
      }));

      vocabQuestions = vocabWords.flatMap((word) => [
        buildMultipleChoiceQuestion(word, distractorWords, course),
        buildTypedQuestion(word, course),
      ]);
    }

    return shuffle([...grammarQuestions, ...vocabQuestions]);
  },
);

// A user's words that are in a course's review queue at all — shared by
// the review session, the course-home summary and the "words ready to
// review" notifier, so they always agree. Every learnt, not-yet-mastered
// word: its first review is due 15 minutes after it's learnt whether or not
// its post-learn quiz was ever taken (see `introduceLearnWords`) — a word
// whose quiz was skipped mustn't drop out of the schedule for good.
// Answering it in review marks it seen, which also takes it out of the
// pending quiz (see `getTestQueueForCourse`).
function reviewableWhere(userId: string, courseId: string) {
  return {
    userId,
    stage: { lt: MAX_STAGE },
    word: {
      languageDeck: { courseId, active: true },
      active: true,
    },
  } as const;
}

// Once a word is due, words coming due within this long after it are
// reviewed with it — so a run of words learnt a minute apart arrives as one
// review, not one word now and another a minute later. Kept in step with
// DUE_GRACE_MS in components/vocab/review-card.tsx.
const DUE_GRACE_MS = 5 * 60 * 1000;

// The latest `nextReviewAt` that counts as due right now: `now`, or — when
// at least one word is already due — `now` plus DUE_GRACE_MS (see above).
async function dueCutoff(reviewable: ReturnType<typeof reviewableWhere>, now: Date): Promise<Date> {
  const anyDue = await prisma.userWordProgress.findFirst({
    where: { ...reviewable, nextReviewAt: { lte: now } },
    select: { id: true },
  });
  return anyDue ? new Date(now.getTime() + DUE_GRACE_MS) : now;
}

// One review queue per *course* — combining every deck's vocab and grammar
// together, not scoped to currently-active decks (an already-learned word
// stays reviewable even if its deck is later deactivated). Course-home-page
// summary card: just a count of words due right now plus the earliest
// upcoming due time (for a "next review in ..." hint when nothing's due),
// not the full question set — building that is deferred to
// `getReviewQueue`, only once the learner actually starts a session.
export const getReviewQueueSummary = cache(
  async (courseSlug: string): Promise<ReviewQueueSummary> => {
    const { user, course } = await requireEnrolledCourse(courseSlug);
    const now = new Date();
    const reviewable = reviewableWhere(user.id, course.id);

    const cutoff = await dueCutoff(reviewable, now);
    const [dueCount, next, upcomingDue] = await Promise.all([
      prisma.userWordProgress.count({
        where: { ...reviewable, nextReviewAt: { lte: cutoff } },
      }),
      prisma.userWordProgress.findFirst({
        where: { ...reviewable, nextReviewAt: { not: null } },
        orderBy: { nextReviewAt: "asc" },
        select: { nextReviewAt: true },
      }),
      upcomingDueTimes(reviewable, cutoff),
    ]);

    return { dueCount, nextDueAt: next?.nextReviewAt ?? null, upcomingDue };
  },
);

// When words in the review queue come due over the next day, soonest first
// — so the page can bump its "words due" count at exactly those moments
// rather than polling (see useLiveDueCount). Capped: past a day, or a few
// hundred words, a fresh page load is soon enough.
const UPCOMING_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_UPCOMING = 300;

async function upcomingDueTimes(
  reviewable: ReturnType<typeof reviewableWhere>,
  now: Date,
): Promise<Date[]> {
  const rows = await prisma.userWordProgress.findMany({
    where: {
      ...reviewable,
      nextReviewAt: { gt: now, lte: new Date(now.getTime() + UPCOMING_WINDOW_MS) },
    },
    orderBy: { nextReviewAt: "asc" },
    select: { nextReviewAt: true },
    take: MAX_UPCOMING,
  });
  return rows.flatMap((row) => (row.nextReviewAt ? [row.nextReviewAt] : []));
}

export type ReviewDueStatus = {
  slug: string;
  title: string;
  dueCount: number;
  // Due times over the next day (see upcomingDueTimes).
  upcomingDue: Date[];
  // The next time a word *becomes* due (strictly in the future), so the
  // notifier knows when to check again; null when nothing's scheduled.
  nextUpcomingAt: Date | null;
};

// Every enrolled course's review count, for the "words ready to review"
// toast (see ReviewDueNotifier). Polled from the client in the background,
// so it quietly returns nothing — never redirects — for a signed-out user
// or one without access.
export async function getReviewDueStatus(): Promise<ReviewDueStatus[]> {
  const profile = await getProfile();
  if (!profile?.hasAccess) return [];

  const now = new Date();
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId: profile.id, unenrolledAt: null, course: { active: true } },
    orderBy: { course: { position: "asc" } },
    select: { course: { select: { id: true, slug: true, title: true } } },
  });

  return Promise.all(
    enrollments.map(async ({ course }) => {
      const reviewable = reviewableWhere(profile.id, course.id);
      const cutoff = await dueCutoff(reviewable, now);
      const [dueCount, upcoming, upcomingDue] = await Promise.all([
        prisma.userWordProgress.count({ where: { ...reviewable, nextReviewAt: { lte: cutoff } } }),
        prisma.userWordProgress.findFirst({
          where: { ...reviewable, nextReviewAt: { gt: cutoff } },
          orderBy: { nextReviewAt: "asc" },
          select: { nextReviewAt: true },
        }),
        upcomingDueTimes(reviewable, cutoff),
      ]);
      return {
        slug: course.slug,
        title: course.title,
        dueCount,
        upcomingDue,
        nextUpcomingAt: upcoming?.nextReviewAt ?? null,
      };
    }),
  );
}

// Admin-only "dev mode" debug view for the course home page — every word
// tracked anywhere in this course's review queue (learning or mastered,
// quizzed or not), not just the due count `getReviewQueueSummary` shows, so
// an admin can see exactly what's queued and when each word becomes due.
// Scoped to the viewing admin's own progress, same as everything else on
// the page — this is "what's in my queue," not a cross-user report.
// Silently returns an empty list for a non-admin caller rather than
// redirecting, since this is a data helper for an optional page section,
// not a page of its own.
export const getReviewQueueDebug = cache(
  async (courseSlug: string): Promise<ReviewQueueDebugEntry[]> => {
    const profile = await requireProfile();

    if (profile.role !== "admin") {
      return [];
    }

    const { user, course } = await requireEnrolledCourse(courseSlug);

    const progress = await prisma.userWordProgress.findMany({
      where: {
        userId: user.id,
        word: {
          languageDeck: { courseId: course.id, active: true },
          active: true,
        },
      },
      include: { word: { select: { term: true, translation: true } } },
      orderBy: [{ nextReviewAt: "asc" }],
    });

    return progress.map((entry) => ({
      wordId: entry.wordId,
      term: entry.word.term,
      translation: entry.word.translation,
      stage: entry.stage,
      stageName: stageInfo(entry.stage).nameEn,
      lastSeenAt: entry.lastSeenAt,
      nextReviewAt: entry.nextReviewAt,
    }));
  },
);

// The scheduled review session itself — every word due right now
// (`nextReviewAt <= now`, stage below Mastered) anywhere in the course,
// vocab or grammar, one typed question each (see `buildTypedQuestion`; the
// review queue never asks multiple choice, unlike the post-learn quiz
// above).
export const getReviewQueue = cache(
  async (courseSlug: string): Promise<QuizQuestion[]> => {
    const { user, course } = await requireEnrolledCourse(courseSlug);

    const reviewable = reviewableWhere(user.id, course.id);
    const dueProgress = await prisma.userWordProgress.findMany({
      where: {
        ...reviewable,
        nextReviewAt: { lte: await dueCutoff(reviewable, new Date()) },
      },
      include: {
        word: {
          include: {
            forms: { orderBy: { position: "asc" } },
            examples: { orderBy: { position: "asc" } },
          },
        },
      },
    });

    if (dueProgress.length === 0) {
      return [];
    }

    const grammarPool = dueProgress.some((progress) => progress.word.path === "grammar")
      ? await loadGrammarPool(course)
      : null;

    return shuffle(
      dueProgress.map((progress) =>
        buildTypedQuestion(
          {
            ...progress.word,
            path: progress.word.path as "vocab" | "grammar",
          },
          course,
          grammarPool,
        ),
      ),
    );
  },
);

export async function bumpStreak(userId: string, courseId: string, now: Date) {
  const enrollment = await prisma.courseEnrollment.findUniqueOrThrow({
    where: { userId_courseId: { userId, courseId } },
    select: {
      currentStreak: true,
      longestStreak: true,
      lastActivityDate: true,
    },
  });

  const updated = applyDailyActivity(enrollment, now);

  if (updated === enrollment) {
    return;
  }

  await prisma.courseEnrollment.update({
    where: { userId_courseId: { userId, courseId } },
    data: {
      currentStreak: updated.currentStreak,
      longestStreak: updated.longestStreak,
      lastActivityDate: updated.lastActivityDate,
    },
  });
}

type QuestionWord = {
  id: string;
  term: string;
  translation: string;
  romanization: string | null;
  languageDeckId: string;
  imageKey?: string | null;
  // The originating languageDeck's path, carried onto every question this word
  // produces (see the QuizQuestion variants in lib/definitions.ts) so Test
  // and Review — which now pool vocab and grammar together — can label
  // each question. Distractor-pool candidates carry it too (unused there,
  // just structurally required) since they share this type.
  path: "vocab" | "grammar";
  // Only populated for the reviewed word itself (never for distractor-pool
  // candidates) — cross-referenced against `examples` to build fill-in-the-
  // blank "cloze" questions.
  forms?: { id: string; value: string }[];
  examples?: {
    en: string;
    ja: string;
    romanization: string | null;
    enHighlight?: string | null;
    jaHighlight?: string | null;
  }[];
};

// Distractors lean heavily toward the word's own category: 2 of the 3 come
// from the same languageDeck and 1 from elsewhere in the course, so together with
// the correct answer (always same-category) 3 of the 4 options share a
// category — close to the requested 4-out-of-5 split, given there are only
// 4 options on screen. Falls back to whatever's left in the course when a
// category is too small to fill on its own.
const SAME_CATEGORY_DISTRACTORS = 2;
const OTHER_CATEGORY_DISTRACTORS = 1;

function buildMultipleChoiceQuestion(
  word: QuestionWord,
  pool: QuestionWord[],
  course: { targetLanguage: string; sourceLanguage: string },
): QuizQuestion {
  const direction: QuizDirection =
    Math.random() < 0.5 ? "term-to-translation" : "translation-to-term";
  const showingTerm = direction === "translation-to-term";

  // No pictures on the options: the prompt shows the word's picture, so
  // matching it to an option's picture would give the answer away.
  const toOption = (candidate: QuestionWord): QuizOption =>
    showingTerm
      ? { text: candidate.term, romanization: candidate.romanization }
      : { text: candidate.translation, romanization: null };

  const rest = pool.filter((candidate) => candidate.id !== word.id);
  const sameCategory = shuffle(
    rest.filter(
      (candidate) => candidate.languageDeckId === word.languageDeckId,
    ),
  );
  const otherCategory = shuffle(
    rest.filter(
      (candidate) => candidate.languageDeckId !== word.languageDeckId,
    ),
  );

  const picked: QuestionWord[] = [
    ...sameCategory.slice(0, SAME_CATEGORY_DISTRACTORS),
    ...otherCategory.slice(0, OTHER_CATEGORY_DISTRACTORS),
  ];

  if (picked.length < 3) {
    const used = new Set(picked.map((candidate) => candidate.id));
    const fallback = shuffle(
      rest.filter((candidate) => !used.has(candidate.id)),
    );
    picked.push(...fallback.slice(0, 3 - picked.length));
  }

  const distractors = picked.map(toOption);

  return {
    kind: "multiple-choice",
    wordId: word.id,
    path: word.path,
    direction,
    prompt: direction === "term-to-translation" ? word.term : word.translation,
    promptRomanization:
      direction === "term-to-translation" ? word.romanization : null,
    targetLanguage: course.targetLanguage,
    options: shuffle([toOption(word), ...distractors]),
    image: wordImagePath(word),
  };
}

// Grammar from the rest of the course, for a non-Latin-script grammar
// point's questions: the forms to offer as wrong answers in a form-choice
// cloze (see buildClozeQuestion), and whole grammar points as distractors
// for the multiple-choice fallback when it has no cloze content at all.
// Loaded once per quiz by the queue builders, only when they have grammar
// to ask about.
type GrammarPool = {
  // Every grammar form's value, with its romanization where the examples
  // can supply one (see romanizeFromExamples).
  forms: Map<string, string | null>;
  words: QuestionWord[];
};

async function loadGrammarPool(course: {
  id: string;
  targetLanguage: string;
}): Promise<GrammarPool> {
  const courseId = course.id;
  const words = await prisma.word.findMany({
    where: {
      languageDeck: { courseId, active: true },
      path: "grammar",
      active: true,
    },
    select: {
      id: true,
      term: true,
      translation: true,
      romanization: true,
      languageDeckId: true,
      imageKey: true,
      forms: { select: { value: true } },
      examples: { select: { en: true, ja: true, romanization: true } },
    },
  });

  const forms = new Map<string, string | null>();
  for (const word of words) {
    for (const form of word.forms) {
      if (forms.get(form.value)) continue;
      forms.set(
        form.value,
        romanizeFromExamples(form.value, word.examples, course.targetLanguage),
      );
    }
  }

  return {
    forms,
    words: words.map((word) => ({
      id: word.id,
      term: word.term,
      translation: word.translation,
      romanization: word.romanization,
      languageDeckId: word.languageDeckId,
      imageKey: word.imageKey,
      path: "grammar" as const,
    })),
  };
}

const FORM_CHOICE_OPTION_COUNT = 4;

// The right answer plus up to three wrong ones — the word's own other forms
// first (個 against 隻), since those are the ones worth telling apart, then
// other grammar points' forms from the course (係 against 喺).
function buildFormChoiceOptions(
  answer: string,
  ownForms: string[],
  pool: string[],
): string[] {
  const others = [
    ...shuffle(ownForms.filter((value) => value !== answer)),
    ...shuffle(pool.filter((value) => value !== answer && !ownForms.includes(value))),
  ];
  return shuffle([answer, ...new Set(others)].slice(0, FORM_CHOICE_OPTION_COUNT));
}

// One cloze match as a question. A Latin-script answer is typed; anything
// else (a Cantonese 係) can't be typed on an ordinary keyboard, so it's
// picked from options instead — as long as there's something to pick
// between.
function buildClozeQuestion(
  word: QuestionWord,
  match: ClozeMatch,
  course: { targetLanguage: string; sourceLanguage: string },
  grammarPool: GrammarPool | null,
): QuizQuestion {
  const ownForms = (word.forms ?? []).map((form) => form.value);
  const answer =
    match.formId === null
      ? word.term
      : (word.forms?.find((form) => form.id === match.formId)?.value ?? word.term);

  const base = {
    wordId: word.id,
    path: word.path,
    formId: match.formId,
    clozeBlankWords: isLatinTypeable(answer) ? answer.trim().split(/\s+/).length : 1,
    clozeSentence: match.sentence,
    clozeSentenceJa: match.translation,
    clozeHighlightJa:
      match.translationHighlight ?? findTranslationSpan(word.translation, match.translation),
    clozeRomanization: match.romanization,
    targetLanguage: course.targetLanguage,
  };

  if (!isLatinTypeable(answer)) {
    const options = buildFormChoiceOptions(answer, ownForms, [
      ...(grammarPool?.forms.keys() ?? []),
    ]);
    if (options.length > 1) {
      return {
        kind: "form-choice",
        ...base,
        options: options.map((text) => ({
          text,
          romanization:
            romanizeFromExamples(text, word.examples ?? [], course.targetLanguage) ??
            grammarPool?.forms.get(text) ??
            null,
        })),
      };
    }
  }

  return { kind: "type-form", ...base };
}

// A non-Latin-script grammar point with no cloze content can't fall back
// to a typed question the way everything else does: the term can't be
// typed, and its translation is a whole explanation ("Say that someone
// is…"), not something to type from memory. It's asked as multiple choice
// against the course's other grammar points instead.
function grammarChoiceFallback(
  word: QuestionWord,
  course: { targetLanguage: string; sourceLanguage: string },
  grammarPool: GrammarPool | null,
): QuizQuestion | null {
  if (word.path !== "grammar" || isLatinTypeable(word.term) || !grammarPool) return null;
  if (!grammarPool.words.some((candidate) => candidate.id !== word.id)) return null;
  return buildMultipleChoiceQuestion(word, grammarPool.words, course);
}

// The typed counterpart to `buildMultipleChoiceQuestion` — prefers a
// fill-in-the-blank cloze question built from the word's own forms/examples
// when one exists (reusing the admin-authored example-sentence content),
// then one blanking the term itself out of an example, falling back to a
// generic "type the term/translation" question for words with no form
// data. Used both for the typed half of the post-learn quiz and,
// exclusively, for every review-queue question. "Typed" loosely: a cloze
// with a non-Latin answer, and a non-Latin grammar point with no cloze at
// all, are asked with options instead (see buildClozeQuestion and
// grammarChoiceFallback).
function buildTypedQuestion(
  word: QuestionWord,
  course: { targetLanguage: string; sourceLanguage: string },
  grammarPool: GrammarPool | null = null,
): QuizQuestion {
  const clozeByForm = findClozeMatchesByForm(
    word.forms ?? [],
    word.examples ?? [],
    course.targetLanguage,
  );

  // No form appears in any example — try blanking the term itself instead
  // (e.g. "I have ___ pencils" for "four"). Only for a Latin-script term:
  // a Cantonese vocab word already has its romanized typed question below,
  // and form-choice options are drawn from grammar, not vocab.
  const match =
    pickRandomClozeMatch(clozeByForm) ??
    (isLatinTypeable(word.term)
      ? shuffle(findTermClozeMatches(word.term, word.examples ?? [], course.targetLanguage))[0]
      : undefined);

  if (match) {
    return buildClozeQuestion(word, match, course, grammarPool);
  }

  const choiceFallback = grammarChoiceFallback(word, course, grammarPool);
  if (choiceFallback) return choiceFallback;

  // A word whose term isn't Latin-typeable can only be typed *back* (the
  // translation-to-term direction) when its romanization is a full
  // transliteration of the term — true for vocab, not for grammar (see
  // isLatinTypeable in lib/language.ts). Otherwise translation-to-term is
  // skipped entirely rather than asking for an untypeable answer.
  const termIsTypeable = isLatinTypeable(word.term);
  const canTypeTermBack =
    termIsTypeable || (word.path === "vocab" && Boolean(word.romanization));

  const direction: QuizDirection = !canTypeTermBack
    ? "term-to-translation"
    : Math.random() < 0.5
      ? "term-to-translation"
      : "translation-to-term";

  const answerRomanized = direction === "translation-to-term" && !termIsTypeable;

  return {
    kind: "type-answer",
    wordId: word.id,
    path: word.path,
    direction,
    prompt: direction === "term-to-translation" ? word.term : word.translation,
    promptRomanization:
      direction === "term-to-translation" ? word.romanization : null,
    answerRomanized,
    targetLanguage: course.targetLanguage,
    image: wordImagePath(word),
  };
}

const GRAMMAR_QUIZ_QUESTIONS = 2;

// A freshly-learned grammar point's post-learn quiz questions — two, like
// a vocab word's, however many examples it has (see `getTestQueue`).
// Fill-in-the-blanks first, spread across its forms before repeating one
// ("There is", then "There are") and never reusing a sentence. With only
// one to make, the second is multiple choice on what the pattern means,
// against the course's other grammar points; with none, it's whatever
// `buildTypedQuestion` falls back to.
function buildGrammarQuizQuestions(
  word: QuestionWord,
  course: { targetLanguage: string; sourceLanguage: string },
  grammarPool: GrammarPool | null,
): QuizQuestion[] {
  const clozeByForm = findClozeMatchesByForm(
    word.forms ?? [],
    word.examples ?? [],
    course.targetLanguage,
  );

  // Round-robin across forms: one match from each, then a second from
  // each, and so on — skipping any sentence already used.
  const perForm = [...clozeByForm.values()].map((matches) => shuffle(matches));
  const picked: ClozeMatch[] = [];
  const usedSentences = new Set<string>();
  for (let round = 0; picked.length < GRAMMAR_QUIZ_QUESTIONS; round++) {
    const candidates = shuffle(perForm).flatMap((matches) => matches[round] ?? []);
    if (candidates.length === 0) break;
    for (const match of candidates) {
      if (picked.length === GRAMMAR_QUIZ_QUESTIONS) break;
      if (usedSentences.has(match.translation)) continue;
      usedSentences.add(match.translation);
      picked.push(match);
    }
  }

  if (picked.length === 0) {
    return [buildTypedQuestion(word, course, grammarPool)];
  }

  const questions = picked.map((match) => buildClozeQuestion(word, match, course, grammarPool));
  const hasOtherGrammar = grammarPool?.words.some((candidate) => candidate.id !== word.id);
  if (questions.length < GRAMMAR_QUIZ_QUESTIONS && grammarPool && hasOtherGrammar) {
    questions.push(buildMultipleChoiceQuestion(word, grammarPool.words, course));
  }

  return questions;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
