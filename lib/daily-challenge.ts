import { prisma } from "@/lib/prisma";

// What a daily-challenge attempt asks the learner to use in their chat with
// Charles Duck: a vocab word, a grammar point, or one of each in the same
// message.
export type ChallengeItem = {
  term: string;
  translation: string;
  // Pronunciation (Jyutping for Cantonese) — typing it counts as using a
  // vocab word too, for learners who can't type the characters.
  romanization: string | null;
  explanation: string | null;
  // Inflected forms (went/gone for "go") — any of them counts as using a
  // vocab word.
  forms: string[];
};

// Charles Duck's first message of an attempt, in the language the learner
// is practising (English, or written Cantonese) — never through the UI's
// i18n — with the learner's own language behind the chat's Translate
// button, and Jyutping for Cantonese. Normally generated to suit the target
// (see getChallengeOpener in lib/daily-challenge-opener.ts); the fixed
// ones below are the fallback.
export type ChallengeOpener = {
  text: string;
  romanization: string | null;
  translation: string;
};

export type ChallengeTarget = {
  // The course's target language ("en", "yue") — what Charles chats in.
  targetLanguage: string;
  vocab: ChallengeItem | null;
  grammar: ChallengeItem | null;
  fallbackOpener: ChallengeOpener;
};

// The course languages the chat knows how to run in: who Charles is
// talking to, and how his messages and feedback are written. Anything
// else falls back to the English course's setup.
export function challengeLanguage(targetLanguage: string) {
  return targetLanguage === "yue"
    ? {
        target: "Cantonese",
        learner: "an English speaker",
        feedbackIn: "English",
        hasRomanization: true,
      }
    : {
        target: "English",
        learner: "a Japanese speaker",
        feedbackIn: "Japanese",
        hasRomanization: false,
      };
}

// How every piece of learner-facing feedback gets its Japanese twin (the
// chat's per-reply tip, the end-of-attempt summary, the end-of-day review):
// learners read feedback in their native Japanese, but anything from the
// English conversation itself stays in English so they can see exactly
// what it refers to.
export const JAPANESE_FEEDBACK_RULE = `Every "...Ja" field is the same content written in natural, simple Japanese for a beginner (polite です/ます style, no difficult kanji or grammar jargon) — not a word-for-word translation. Inside the Japanese, keep anything that comes from the English conversation in English, in quotes: words or sentences the user wrote, the target word or pattern, words or sentences you said, and any English wording you suggest. For example: 「"I ate some food."」は正しい文ですが、"what" を使って質問に答えるともっと自然です。`;

// One finished attempt, as the end-of-day summary shows it. Scores and the
// message are null for attempts saved before they were recorded.
export type DailyChallengeResult = {
  id: string;
  xpEarned: number;
  targetTerms: string[];
  // targetTerms with each one's Japanese from the course, looked up when
  // read; null if the word has since been renamed or removed.
  targets: { term: string; translation: string | null }[];
  message: string | null;
  grammarScore: number | null;
  naturalnessScore: number | null;
  relevanceScore: number | null;
  complexityScore: number | null;
  overall: string | null;
  overallJa: string | null;
  tips: string[];
  tipsJa: string[];
  betterVersion: string | null;
  // Jyutping for a Cantonese betterVersion; null otherwise.
  betterVersionRomanization: string | null;
};

// Short, everyday openers a total beginner can read: common words, one
// clear question each, spread across topics so consecutive attempts don't
// feel the same. Used as-is when generation fails, and as the topic
// suggestion when the target doesn't point to an everyday topic of its own.
type FixedOpener = { english: string; japanese: string };

const OPENERS: FixedOpener[] = [
  { english: "Hi! How was your day?", japanese: "やあ！今日はどうだった？" },
  {
    english: "Hey! Did you eat anything good today?",
    japanese: "ねえ！今日は何かおいしいもの食べた？",
  },
  {
    english: "Hi! What did you do last weekend?",
    japanese: "やあ！先週末は何をしたの？",
  },
  {
    english: "Hey! Do you have any plans for this weekend?",
    japanese: "ねえ！今週末は何か予定ある？",
  },
  {
    english: "Good morning! What did you have for breakfast?",
    japanese: "おはよう！朝ごはんは何を食べた？",
  },
  {
    english: "Hi! What are you doing right now?",
    japanese: "やあ！今何してるの？",
  },
  {
    english: "Hey! Did you sleep well last night?",
    japanese: "ねえ！昨日の夜はよく眠れた？",
  },
  {
    english: "Hi! Do you have any pets?",
    japanese: "やあ！ペットは飼ってる？",
  },
  {
    english: "Hey! What's your favorite food?",
    japanese: "ねえ！好きな食べ物は何？",
  },
  {
    english: "Hi! Where do you want to go on your next trip?",
    japanese: "やあ！次の旅行はどこに行きたい？",
  },
  {
    english: "Hey! Which do you like more, coffee or tea?",
    japanese: "ねえ！コーヒーと紅茶、どっちが好き？",
  },
  {
    english: "Hi! What do you usually do after work or school?",
    japanese: "やあ！仕事や学校のあとは、いつも何してる？",
  },
  {
    english: "Hey! I just had pizza for lunch. What did you have?",
    japanese: "ねえ！お昼にピザを食べたんだ。君は何を食べた？",
  },
  {
    english: "Hi! Do you play any sports?",
    japanese: "やあ！何かスポーツはしてる？",
  },
  {
    english: "Hey! What kind of music do you like?",
    japanese: "ねえ！どんな音楽が好き？",
  },
  {
    english: "Hi! How is your week going?",
    japanese: "やあ！今週はどんな感じ？",
  },
  {
    english: "Hey! Did you go anywhere fun recently?",
    japanese: "ねえ！最近どこか楽しいところに行った？",
  },
  {
    english: "Hi! What made you happy today?",
    japanese: "やあ！今日は何かうれしいことあった？",
  },
  {
    english: "Hey! Have you watched any good movies or shows lately?",
    japanese: "ねえ！最近何かいい映画やドラマを観た？",
  },
  {
    english: "Hi! What's the weather like where you are?",
    japanese: "やあ！そっちの天気はどう？",
  },
  {
    english: "Hey! Do you like cooking?",
    japanese: "ねえ！料理するのは好き？",
  },
  {
    english: "Hi! What's your favorite way to relax?",
    japanese: "やあ！一番好きなリラックス方法は何？",
  },
];

// The Cantonese course's fixed openers: colloquial written Cantonese a
// beginner can read, with Jyutping and English.
const CANTONESE_OPENERS: ChallengeOpener[] = [
  { text: "你好！你今日點呀？", romanization: "nei5 hou2! nei5 gam1 jat6 dim2 aa3?", translation: "Hi! How are you today?" },
  { text: "你好！你食咗飯未呀？", romanization: "nei5 hou2! nei5 sik6 zo2 faan6 mei6 aa3?", translation: "Hi! Have you eaten yet?" },
  { text: "你好！你鍾意食乜嘢？", romanization: "nei5 hou2! nei5 zung1 ji3 sik6 mat1 je5?", translation: "Hi! What do you like to eat?" },
  { text: "你好！你今日做咗乜嘢呀？", romanization: "nei5 hou2! nei5 gam1 jat6 zou6 zo2 mat1 je5 aa3?", translation: "Hi! What did you do today?" },
  { text: "你好！你有冇養寵物呀？", romanization: "nei5 hou2! nei5 jau5 mou5 joeng5 cung2 mat6 aa3?", translation: "Hi! Do you have any pets?" },
  { text: "你好！你鍾意飲咖啡定茶呀？", romanization: "nei5 hou2! nei5 zung1 ji3 jam2 gaa3 fe1 ding6 caa4 aa3?", translation: "Hi! Do you like coffee or tea?" },
  { text: "你好！你週末想做乜嘢呀？", romanization: "nei5 hou2! nei5 zau1 mut6 soeng2 zou6 mat1 je5 aa3?", translation: "Hi! What do you want to do this weekend?" },
  { text: "你好！你鍾意咩運動呀？", romanization: "nei5 hou2! nei5 zung1 ji3 me1 wan6 dung6 aa3?", translation: "Hi! What sports do you like?" },
];

function fixedOpeners(targetLanguage: string): ChallengeOpener[] {
  return targetLanguage === "yue"
    ? CANTONESE_OPENERS
    : OPENERS.map(({ english, japanese }) => ({
        text: english,
        romanization: null,
        translation: japanese,
      }));
}

// cyrb53-style string hash → mulberry32 PRNG. Deterministic so the page and
// the chat action (which never trusts a client-supplied target) agree on the
// same target, and reloading the page can't reroll an easier one.
function hashSeed(value: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const challengeWordSelect = {
  id: true,
  path: true,
  term: true,
  translation: true,
  romanization: true,
  explanation: true,
  forms: { select: { value: true }, orderBy: { position: "asc" } },
} as const;

// XP (profile-wide, the same XP that sets the Donguri level) at which the
// challenge steps up: words only to begin with, then grammar patterns, then
// a word and a grammar pattern together in the same message. Lined up with
// the level-2 and level-3 thresholds in lib/levels.ts.
export const CHALLENGE_GRAMMAR_XP = 50;
export const CHALLENGE_COMBINED_XP = 120;

type ChallengeMode = "vocab" | "grammar" | "both";

// The hardest mode the learner's XP allows, stepped down to what they've
// actually learnt — e.g. a combined-tier learner who hasn't learnt any
// grammar yet still gets a word.
function challengeModeFor(xp: number, hasVocab: boolean, hasGrammar: boolean): ChallengeMode {
  if (xp >= CHALLENGE_COMBINED_XP && hasVocab && hasGrammar) return "both";
  if (xp >= CHALLENGE_GRAMMAR_XP && hasGrammar) return "grammar";
  return hasVocab ? "vocab" : "grammar";
}

// Picks the target for the user's `attemptIndex`-th attempt (0-based) of
// `challengeDate` in this course. Only draws from words and grammar the user
// has learnt (introduced, not skipped); how hard it is depends on their XP
// (see challengeModeFor). Null when they haven't learnt anything yet.
export async function pickChallengeTarget(
  userId: string,
  courseId: string,
  challengeDate: Date,
  attemptIndex: number,
): Promise<ChallengeTarget | null> {
  const [words, profile, course] = await Promise.all([
    prisma.word.findMany({
      where: {
        active: true,
        languageDeck: { courseId, active: true },
        progress: { some: { userId, skipped: false } },
      },
      select: challengeWordSelect,
      orderBy: { id: "asc" },
    }),
    prisma.profile.findUnique({ where: { id: userId }, select: { xp: true } }),
    prisma.course.findUniqueOrThrow({ where: { id: courseId }, select: { targetLanguage: true } }),
  ]);

  const vocab = words.filter((word) => word.path !== "grammar");
  const grammar = words.filter((word) => word.path === "grammar");

  if (vocab.length === 0 && grammar.length === 0) return null;

  const seed = `${userId}:${courseId}:${challengeDate.toISOString().slice(0, 10)}:${attemptIndex}`;
  const random = mulberry32(hashSeed(seed));
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];

  const mode = challengeModeFor(profile?.xp ?? 0, vocab.length > 0, grammar.length > 0);

  const toItem = (word: (typeof words)[number]): ChallengeItem => ({
    term: word.term,
    translation: word.translation,
    romanization: word.romanization,
    explanation: word.explanation,
    forms: word.forms.map((form) => form.value),
  });

  // Its own stream, so adding or reordering openers never changes which
  // word or grammar point an attempt picks.
  const openerRandom = mulberry32(hashSeed(`${seed}:opener`));

  const openers = fixedOpeners(course.targetLanguage);

  return {
    targetLanguage: course.targetLanguage,
    vocab: mode === "grammar" ? null : toItem(pick(vocab)),
    grammar: mode === "vocab" ? null : toItem(pick(grammar)),
    fallbackOpener: openers[Math.floor(openerRandom() * openers.length)],
  };
}
