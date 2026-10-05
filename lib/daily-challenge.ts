import { prisma } from "@/lib/prisma";
import { addDays, startOfUTCDay } from "@/lib/srs";
import { parseCourseLevel, type CourseLevel } from "@/lib/definitions";

// What a daily-challenge attempt asks the learner to use in their chat with
// Charles Duck: a vocab word, a grammar point, or one of each (anywhere in
// the chat).
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
  // Word-by-word meanings for hovering over Charles's message — null when
  // there aren't any (the fixed openers, or the model leaving them out).
  glosses: WordGloss[] | null;
};

// One word (or short set phrase) of Charles's message with its meaning in
// the learner's language, and its Jyutping for Cantonese.
export type WordGloss = {
  text: string;
  romanization: string | null;
  meaning: string;
};

const MAX_GLOSSES = 60;

// Reads the model's "words" list, keeping only well-formed entries. Null
// when there's nothing usable, so the chat just shows the plain message.
export function parseGlosses(value: unknown, withRomanization: boolean): WordGloss[] | null {
  if (!Array.isArray(value)) return null;

  const glosses = value.flatMap((entry): WordGloss[] => {
    if (!entry || typeof entry !== "object") return [];
    const { text, meaning, romanization } = entry as Record<string, unknown>;
    if (typeof text !== "string" || typeof meaning !== "string") return [];
    if (!text.trim() || !meaning.trim()) return [];
    return [
      {
        text: text.trim(),
        meaning: meaning.trim(),
        romanization:
          withRomanization && typeof romanization === "string" && romanization.trim()
            ? romanization.trim()
            : null,
      },
    ];
  });

  return glosses.length > 0 ? glosses.slice(0, MAX_GLOSSES) : null;
}

// The "words" field both of Charles's prompts ask for (an example entry,
// for the JSON shape) and how to fill it in (a line after the shape).
export function glossesPromptField(targetLanguage: string): string {
  if (targetLanguage === "yue") return `"words": [{ "text": "你", "romanization": "nei5", "meaning": "you" }]`;
  if (targetLanguage === "fr") return `"words": [{ "text": "jardin", "meaning": "garden" }]`;
  return `"words": [{ "text": "weekend", "meaning": "週末" }]`;
}

// How English feedback quotes Cantonese, so a beginner can both say and
// understand every quoted bit — shared by the chat and the daily review.
export const CANTONESE_QUOTE_RULE = `Whenever you quote Cantonese — a single word or a whole phrase — write the characters, then in brackets its Jyutping with tone numbers and a short English meaning in quotes, e.g. 飲 (jam2, "drink") or 我鍾意飲茶 (ngo5 zung1 ji3 jam2 caa4, "I like drinking tea"). Never quote Cantonese without its English meaning.`;

// The same for French: the learner reads English, so every bit of French
// quoted in feedback comes with what it means.
export const FRENCH_QUOTE_RULE = `Whenever you quote French — a single word or a whole phrase — write it exactly, with its accents, followed by a short English meaning in brackets and quotes, e.g. tailler ("to prune") or j'aurais dû arroser ("I should have watered"). Never quote French without its English meaning.`;

export function glossesPromptRule(targetLanguage: string): string {
  if (targetLanguage === "fr") {
    return `"words" lists every word of your message, in order: "text" exactly as it appears in the message (keep elided forms like l', j', qu' joined to their word), "meaning" a short English meaning of that word as used here. Keep a set phrase together if its words don't make sense apart. Leave out punctuation.`;
  }
  return targetLanguage === "yue"
    ? `"words" lists every word of your message, in order, split into natural words (a word can be more than one character, e.g. 鍾意, 今日): "text" exactly as it appears in the message, "romanization" its Jyutping with tone numbers, "meaning" a short English meaning of that word as used here. Leave out punctuation.`
    : `"words" lists every word of your message, in order: "text" exactly as it appears in the message, "meaning" a short Japanese meaning of that word as used here. Keep a set phrase together if its words don't make sense apart. Leave out punctuation.`;
}

export type ChallengeTarget = {
  // The course's target language ("en", "yue", "fr") — what Charles chats in.
  targetLanguage: string;
  // The level the learner picked when they enrolled — how Charles pitches
  // his messages and feedback (see levelProfile).
  level: CourseLevel;
  vocab: ChallengeItem | null;
  grammar: ChallengeItem | null;
  fallbackOpener: ChallengeOpener;
  // Charles's friends for this attempt, one "he" and one "she" (see
  // friendsPromptRule) — who he talks about when a third person comes up.
  friends: ChallengeFriend[];
  // What the learner has learnt in this course, newest first, one line each
  // ('今日 (gam1 jat6) — "today"') — so Charles can ask things they can
  // answer with words they know (see knownWordsPromptRule).
  knownWords: string[];
};

// How Charles pitches everything to the learner's level: who he says he's
// talking to, how he writes his messages, and how he writes feedback. Shared
// by the chat, the opener, the hints and the end-of-day review, so they all
// agree. Beginner is how Charles has always talked.
export function levelProfile(level: CourseLevel) {
  switch (level) {
    case "advanced":
      return {
        learner: "an advanced learner",
        chatStyle:
          "Write the way you'd text a fluent friend: natural, idiomatic and varied — colloquial expressions, idioms and any tense or structure that fits. Don't simplify. 1-3 sentences per reply.",
        openerStyle:
          "Natural, idiomatic language, the way you'd text a fluent friend — idioms and colloquial expressions are welcome.",
        feedbackStyle:
          "clear, concise English. Grammar terms are fine. Point out nuance, register and more idiomatic ways to say things, not just outright mistakes",
      };
    case "intermediate":
      return {
        learner: "an intermediate learner",
        chatStyle:
          "Write natural, everyday sentences for an intermediate learner: a range of tenses, common idioms and the odd longer sentence are fine, but avoid rare vocabulary and slang. 1-3 sentences per reply.",
        openerStyle:
          "Everyday words and natural grammar an intermediate learner knows. A common idiom is fine; no rare words or slang.",
        feedbackStyle:
          "clear, friendly English with short sentences. Name a grammar point (e.g. \"past tense\", \"subjunctive\") when it helps them understand",
      };
    default:
      return {
        learner: "a beginner",
        chatStyle:
          "Use very simple, short sentences, like you are talking to a total beginner. Only common, everyday words — no idioms, no rare or advanced vocabulary, no hard grammar. 1-3 short sentences per reply.",
        openerStyle: "",
        feedbackStyle: "very simple, beginner-friendly English — short words, short sentences, no grammar jargon",
      };
  }
}

// How many learnt words Charles is shown — the most recent, which are the
// freshest in the learner's mind, and enough to build answers from without
// bloating every prompt.
const MAX_KNOWN_WORDS = 120;

// The learner's learnt words, and how Charles should lean on them: every
// question should be answerable with words they know, so the way towards
// the target never needs vocabulary they haven't met — e.g. offer a choice
// built from known words rather than ask "how will you celebrate?" when
// they know no words for celebrating. Shared by his opener and his replies.
// Intermediate and advanced learners know far more than they've learnt in
// the app, so for them the list is only a hint of what they've been
// practising, never a limit.
export function knownWordsPromptRule(target: ChallengeTarget): string {
  if (target.knownWords.length === 0) return "";
  if (target.level !== "beginner") {
    return `- The user is ${levelProfile(target.level).learner}. They've recently been practising these words and patterns in the app (newest first) — feel free to bring some of them up, but they know plenty more, so don't limit yourself to them:
${target.knownWords.map((line) => `  ${line}`).join("\n")}
- Never quiz them or mention the list.`;
  }
  return `- The user is a beginner. These are the ${target.knownWords.length} words and patterns they've learnt most recently, newest first — they also know the very basics (I, you, yes, no, like, have, is):
${target.knownWords.map((line) => `  ${line}`).join("\n")}
- Phrase your questions so the user can answer with words from that list plus the target. This changes how you ask, never where you're heading: the steps toward the target should be things they can say — e.g. if they know 食, 飯 and 今日, "Did you eat rice today?" works; "How do you want to celebrate?" doesn't, if they know no words for celebrating.
- If a step toward the target would need a word they haven't learnt, find another step toward the target that doesn't. Don't fall back on easy questions that lead nowhere (like "Do you like X or Y?" when neither leads to the target). Never quiz them or mention the list.`;
}

// What makes Charles sound like a real friend rather than a teacher setting
// up an answer — shared by his opener and his replies. Two traps the target
// pulls him into: telling the learner what to say ("Ask me about her") to
// get the pattern out of them, and asking something he'd already know
// ("Are we at school?") because its answer happens to use the target.
export const NATURAL_CHAT_RULE = `- Talk exactly like a friend texting. Never tell the user what to say, ask or write — no "Ask me about…", "Tell me about…", "Describe…", "Use … in a sentence". Get them talking only with real questions and comments.
- Only ask what a friend genuinely wouldn't know: the user's own life, plans, opinions, people they know, things that happened to them. Never ask about things you'd obviously already know — where the two of you are, what you yourself are doing or like, or facts you've just been told. You are not with the user; you're texting from somewhere else.
- Your own friends are yours: you know them, the user doesn't. You can share news about them, but never ask the user questions about them ("What's Rupert's favourite food?", "Are you and Matilda free?"). Ask about the user's own family, friends and life instead.
- If the target is about "we", "you" or "they", make it about real people in the user's life — e.g. for "we are not …": "Are you and your sister going to the party?" → "No, we're not going" — never a question about you two being somewhere together. For "his" / "her", ask about someone the user knows: "What does your brother do?" → "His job is …".`;

// One of Charles's animal friends: a traditional English first name and a
// cute animal, e.g. "Christopher Mouse".
export type ChallengeFriend = { name: string; animal: string; pronoun: "he" | "she" };

const HE_NAMES = [
  "Christopher", "Reginald", "Archibald", "Bartholomew", "Humphrey", "Percival",
  "Frederick", "Montgomery", "Theodore", "Rupert", "Albert", "Edmund",
];
const SHE_NAMES = [
  "Beatrice", "Agatha", "Winifred", "Harriet", "Mildred", "Penelope",
  "Florence", "Matilda", "Cordelia", "Josephine", "Eleanor", "Rosalind",
];
const ANIMALS = [
  "Mouse", "Rabbit", "Badger", "Hedgehog", "Otter", "Squirrel", "Fox",
  "Mole", "Owl", "Hamster", "Panda", "Penguin", "Koala", "Kitten",
];

// How Charles brings in a third person — shared by his opener and his chat
// replies, so the friend he names first is the one he keeps talking about.
// They're his friends, so he tells the learner about them; he asks about
// the learner's own people (see NATURAL_CHAT_RULE).
export function friendsPromptRule(target: ChallengeTarget): string {
  const [he, she] = [
    target.friends.find((friend) => friend.pronoun === "he"),
    target.friends.find((friend) => friend.pronoun === "she"),
  ];
  if (!he || !she) return "";
  const cantonese = target.targetLanguage === "yue";
  const fullName = (friend: ChallengeFriend) => `${friend.name} ${friend.animal}`;

  return `- Whenever you mention someone from your own life — which can help when the target is a third-person word or pattern (he, she, they, him, her, his${cantonese ? ", 佢, 佢哋" : ""}) — make it one of your friends: ${fullName(he)} (a he) or ${fullName(she)} (a she), whichever fits; both of them together for "they". Share something about them, then ask about the user's side of it (e.g. "My friend ${fullName(she)} just got a new bike! Does anyone in your family cycle?") — never ask the user about your friends. Introduce them by full name the first time ("my friend ${fullName(he)}"), then just use he or she.${cantonese ? ` In Cantonese, keep the first name in English letters and write the animal in Cantonese (e.g. "${he.name} + the Cantonese for ${he.animal.toLowerCase()}"), the way people in Hong Kong mix in English names; in the Jyutping, leave the English name as it is.` : ""} Only bring them up when it's natural — never just to mention them.`;
}

// The course languages the chat knows how to run in: who Charles is
// talking to, and how his messages and feedback are written. Anything
// else falls back to the English course's setup.
export function challengeLanguage(targetLanguage: string) {
  if (targetLanguage === "fr") {
    return {
      target: "French",
      learner: "an English speaker",
      feedbackIn: "English",
      hasRomanization: false,
      quoteRule: FRENCH_QUOTE_RULE,
    };
  }
  return targetLanguage === "yue"
    ? {
        target: "Cantonese",
        learner: "an English speaker",
        feedbackIn: "English",
        hasRomanization: true,
        quoteRule: CANTONESE_QUOTE_RULE,
      }
    : {
        target: "English",
        learner: "a Japanese speaker",
        feedbackIn: "Japanese",
        hasRomanization: false,
        quoteRule: "",
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
  // Skipped as too hard: no message, scores or XP.
  skipped: boolean;
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
  {
    english: "Hey! Do you have any brothers or sisters?",
    japanese: "ねえ！兄弟や姉妹はいる？",
  },
  {
    english: "Hi! What's your favorite season?",
    japanese: "やあ！一番好きな季節は何？",
  },
  {
    english: "Hey! How do you usually get to work or school?",
    japanese: "ねえ！仕事や学校にはいつもどうやって行ってる？",
  },
  {
    english: "Hi! What do you want to eat for dinner tonight?",
    japanese: "やあ！今夜の夕ごはんは何が食べたい？",
  },
  {
    english: "Hey! Do you play any video games?",
    japanese: "ねえ！何かゲームはしてる？",
  },
  {
    english: "Hi! Have you read any good books lately?",
    japanese: "やあ！最近何かいい本を読んだ？",
  },
  {
    english: "Hey! Is there a good restaurant near your home?",
    japanese: "ねえ！家の近くにおいしいレストランはある？",
  },
  {
    english: "Hi! Are you busy today?",
    japanese: "やあ！今日は忙しい？",
  },
  {
    english: "Hey! When is your birthday?",
    japanese: "ねえ！誕生日はいつ？",
  },
  {
    english: "Hi! Do you like shopping?",
    japanese: "やあ！買い物は好き？",
  },
  {
    english: "Hey! What did you do yesterday evening?",
    japanese: "ねえ！昨日の夜は何してた？",
  },
  {
    english: "Hi! Do you like going to the beach?",
    japanese: "やあ！海に行くのは好き？",
  },
  {
    english: "Hey! What's your favorite snack?",
    japanese: "ねえ！好きなおやつは何？",
  },
];

// The Cantonese course's fixed openers: colloquial written Cantonese a
// beginner can read, with Jyutping and English.
const CANTONESE_OPENERS: Omit<ChallengeOpener, "glosses">[] = [
  { text: "你好！你今日點呀？", romanization: "nei5 hou2! nei5 gam1 jat6 dim2 aa3?", translation: "Hi! How are you today?" },
  { text: "你好！你食咗飯未呀？", romanization: "nei5 hou2! nei5 sik6 zo2 faan6 mei6 aa3?", translation: "Hi! Have you eaten yet?" },
  { text: "你好！你鍾意食乜嘢？", romanization: "nei5 hou2! nei5 zung1 ji3 sik6 mat1 je5?", translation: "Hi! What do you like to eat?" },
  { text: "你好！你今日做咗乜嘢呀？", romanization: "nei5 hou2! nei5 gam1 jat6 zou6 zo2 mat1 je5 aa3?", translation: "Hi! What did you do today?" },
  { text: "你好！你有冇養寵物呀？", romanization: "nei5 hou2! nei5 jau5 mou5 joeng5 cung2 mat6 aa3?", translation: "Hi! Do you have any pets?" },
  { text: "你好！你鍾意飲咖啡定茶呀？", romanization: "nei5 hou2! nei5 zung1 ji3 jam2 gaa3 fe1 ding6 caa4 aa3?", translation: "Hi! Do you like coffee or tea?" },
  { text: "你好！你週末想做乜嘢呀？", romanization: "nei5 hou2! nei5 zau1 mut6 soeng2 zou6 mat1 je5 aa3?", translation: "Hi! What do you want to do this weekend?" },
  { text: "你好！你鍾意咩運動呀？", romanization: "nei5 hou2! nei5 zung1 ji3 me1 wan6 dung6 aa3?", translation: "Hi! What sports do you like?" },
  { text: "早晨！你今朝食咗乜嘢早餐呀？", romanization: "zou2 san4! nei5 gam1 ziu1 sik6 zo2 mat1 je5 zou2 caan1 aa3?", translation: "Good morning! What did you have for breakfast?" },
  { text: "你好！你尋晚瞓得好唔好呀？", romanization: "nei5 hou2! nei5 cam4 maan5 fan3 dak1 hou2 m4 hou2 aa3?", translation: "Hi! Did you sleep well last night?" },
  { text: "你好！你而家做緊乜嘢呀？", romanization: "nei5 hou2! nei5 ji4 gaa1 zou6 gan2 mat1 je5 aa3?", translation: "Hi! What are you doing right now?" },
  { text: "你好！你上個週末做咗乜嘢呀？", romanization: "nei5 hou2! nei5 soeng6 go3 zau1 mut6 zou6 zo2 mat1 je5 aa3?", translation: "Hi! What did you do last weekend?" },
  { text: "你好！你鍾意聽咩音樂呀？", romanization: "nei5 hou2! nei5 zung1 ji3 teng1 me1 jam1 ngok6 aa3?", translation: "Hi! What kind of music do you like?" },
  { text: "你好！你最近有冇睇戲呀？", romanization: "nei5 hou2! nei5 zeoi3 gan6 jau5 mou5 tai2 hei3 aa3?", translation: "Hi! Have you seen any movies lately?" },
  { text: "你好！你下次旅行想去邊度呀？", romanization: "nei5 hou2! nei5 haa6 ci3 leoi5 hang4 soeng2 heoi3 bin1 dou6 aa3?", translation: "Hi! Where do you want to go on your next trip?" },
  { text: "你好！你放工之後通常做乜嘢呀？", romanization: "nei5 hou2! nei5 fong3 gung1 zi1 hau6 tung1 soeng4 zou6 mat1 je5 aa3?", translation: "Hi! What do you usually do after work?" },
  { text: "你好！你鍾唔鍾意煮嘢食呀？", romanization: "nei5 hou2! nei5 zung1 m4 zung1 ji3 zyu2 je5 sik6 aa3?", translation: "Hi! Do you like cooking?" },
  { text: "你好！你嗰邊今日天氣點呀？", romanization: "nei5 hou2! nei5 go2 bin1 gam1 jat6 tin1 hei3 dim2 aa3?", translation: "Hi! What's the weather like where you are today?" },
  { text: "你好！你今個星期點呀？", romanization: "nei5 hou2! nei5 gam1 go3 sing1 kei4 dim2 aa3?", translation: "Hi! How is your week going?" },
  { text: "你好！你今日有冇開心嘅事呀？", romanization: "nei5 hou2! nei5 gam1 jat6 jau5 mou5 hoi1 sam1 ge3 si6 aa3?", translation: "Hi! Did anything make you happy today?" },
  { text: "你好！我啱啱食咗薄餅。你晏晝食咗乜嘢呀？", romanization: "nei5 hou2! ngo5 aam1 aam1 sik6 zo2 bok6 beng2. nei5 aan3 zau3 sik6 zo2 mat1 je5 aa3?", translation: "Hi! I just had pizza. What did you have for lunch?" },
  { text: "你好！你有冇兄弟姊妹呀？", romanization: "nei5 hou2! nei5 jau5 mou5 hing1 dai6 zi2 mui6 aa3?", translation: "Hi! Do you have any brothers or sisters?" },
  { text: "你好！你平時點返工呀？", romanization: "nei5 hou2! nei5 ping4 si4 dim2 faan1 gung1 aa3?", translation: "Hi! How do you usually get to work?" },
  { text: "你好！你最鍾意邊個季節呀？", romanization: "nei5 hou2! nei5 zeoi3 zung1 ji3 bin1 go3 gwai3 zit3 aa3?", translation: "Hi! What's your favorite season?" },
  { text: "你好！你今晚想食乜嘢呀？", romanization: "nei5 hou2! nei5 gam1 maan5 soeng2 sik6 mat1 je5 aa3?", translation: "Hi! What do you want to eat tonight?" },
  { text: "你好！你有冇玩遊戲機呀？", romanization: "nei5 hou2! nei5 jau5 mou5 waan2 jau4 hei3 gei1 aa3?", translation: "Hi! Do you play video games?" },
  { text: "你好！你鍾唔鍾意行街呀？", romanization: "nei5 hou2! nei5 zung1 m4 zung1 ji3 haang4 gaai1 aa3?", translation: "Hi! Do you like going shopping?" },
  { text: "你好！你最近有冇睇書呀？", romanization: "nei5 hou2! nei5 zeoi3 gan6 jau5 mou5 tai2 syu1 aa3?", translation: "Hi! Have you read any books lately?" },
  { text: "你好！你屋企附近有冇好食嘅餐廳呀？", romanization: "nei5 hou2! nei5 uk1 kei2 fu6 gan6 jau5 mou5 hou2 sik6 ge3 caan1 teng1 aa3?", translation: "Hi! Are there any good restaurants near your home?" },
  { text: "你好！你今日忙唔忙呀？", romanization: "nei5 hou2! nei5 gam1 jat6 mong4 m4 mong4 aa3?", translation: "Hi! Are you busy today?" },
  { text: "你好！你生日係幾時呀？", romanization: "nei5 hou2! nei5 saang1 jat6 hai6 gei2 si4 aa3?", translation: "Hi! When is your birthday?" },
  { text: "你好！你放假鍾意去邊度玩呀？", romanization: "nei5 hou2! nei5 fong3 gaa3 zung1 ji3 heoi3 bin1 dou6 waan2 aa3?", translation: "Hi! Where do you like to go on your days off?" },
];

// The French course's fixed openers: casual, natural French (tu, as
// friends text), with English.
const FRENCH_OPENERS: Omit<ChallengeOpener, "glosses">[] = [
  { text: "Salut ! Tu as passé une bonne journée ?", romanization: null, translation: "Hi! Did you have a good day?" },
  { text: "Coucou ! Qu'est-ce que tu as fait ce week-end ?", romanization: null, translation: "Hey! What did you do this weekend?" },
  { text: "Salut ! Tu as des projets pour le week-end ?", romanization: null, translation: "Hi! Do you have any plans for the weekend?" },
  { text: "Salut ! Tu fais du sport en ce moment ?", romanization: null, translation: "Hi! Are you doing any sport at the moment?" },
  { text: "Coucou ! Il fait quel temps chez toi aujourd'hui ?", romanization: null, translation: "Hey! What's the weather like where you are today?" },
  { text: "Salut ! Tu as un jardin, ou des plantes chez toi ?", romanization: null, translation: "Hi! Do you have a garden, or any plants at home?" },
  { text: "Salut ! Qu'est-ce que tu as mangé de bon aujourd'hui ?", romanization: null, translation: "Hi! What did you eat that was good today?" },
  { text: "Coucou ! Tu as regardé un bon film récemment ?", romanization: null, translation: "Hey! Have you watched a good film recently?" },
  { text: "Salut ! Tu préfères la mer ou la montagne ?", romanization: null, translation: "Hi! Do you prefer the sea or the mountains?" },
  { text: "Salut ! Qu'est-ce que tu fais d'habitude après le travail ?", romanization: null, translation: "Hi! What do you usually do after work?" },
  { text: "Coucou ! Tu as lu quelque chose d'intéressant cette semaine ?", romanization: null, translation: "Hey! Have you read anything interesting this week?" },
  { text: "Salut ! Où est-ce que tu aimerais partir en vacances ?", romanization: null, translation: "Hi! Where would you like to go on holiday?" },
];

function fixedOpeners(targetLanguage: string): ChallengeOpener[] {
  if (targetLanguage === "fr") return FRENCH_OPENERS.map((opener) => ({ ...opener, glosses: null }));
  return targetLanguage === "yue"
    ? CANTONESE_OPENERS.map((opener) => ({ ...opener, glosses: null }))
    : OPENERS.map(({ english, japanese }) => ({
        text: english,
        romanization: null,
        translation: japanese,
        glosses: null,
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
// challenge steps up: one word to begin with, then one grammar pattern,
// then a word and a grammar pattern together — used anywhere in the chat,
// in the same message or different ones (see sendDailyChallengeMessage).
// A single target until 250 XP, since two at once was too much for
// beginners. Lined up with level thresholds in lib/levels.ts.
export const CHALLENGE_GRAMMAR_XP = 50;
export const CHALLENGE_COMBINED_XP = 250;

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
// - Nothing used in one of today's earlier attempts comes up again, while
//   anything else is left — read from the saved attempts, so the page and
//   the chat action always agree. Only once everything learnt has been used
//   today can a target repeat.
// - Words and grammar learnt since the start of yesterday are picked first;
//   with nothing that new, it draws from everything learnt.
export async function pickChallengeTarget(
  userId: string,
  courseId: string,
  challengeDate: Date,
  attemptIndex: number,
): Promise<ChallengeTarget | null> {
  const [words, profile, course, todaysAttempts, enrollment] = await Promise.all([
    prisma.word.findMany({
      where: {
        active: true,
        languageDeck: { courseId, active: true },
        progress: { some: { userId, skipped: false } },
      },
      select: {
        ...challengeWordSelect,
        progress: { where: { userId }, select: { introducedAt: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.profile.findUnique({ where: { id: userId }, select: { xp: true } }),
    prisma.course.findUniqueOrThrow({ where: { id: courseId }, select: { targetLanguage: true } }),
    prisma.dailyChallengeAttempt.findMany({
      where: { userId, courseId, challengeDate },
      select: { targetTerms: true },
    }),
    prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { level: true },
    }),
  ]);

  if (words.length === 0) return null;

  const usedToday = new Set(todaysAttempts.flatMap((attempt) => attempt.targetTerms));
  const unused = words.filter((word) => !usedToday.has(word.term));
  const pool = unused.length > 0 ? unused : words;

  const vocab = pool.filter((word) => word.path !== "grammar");
  const grammar = pool.filter((word) => word.path === "grammar");

  const seed = `${userId}:${courseId}:${challengeDate.toISOString().slice(0, 10)}:${attemptIndex}`;
  const random = mulberry32(hashSeed(seed));
  const freshSince = addDays(startOfUTCDay(challengeDate), -1);
  const isFresh = (word: (typeof words)[number]) =>
    word.progress.some((progress) => progress.introducedAt >= freshSince);
  // Something learnt since yesterday if there is one, else anything.
  const pick = (items: typeof words) => {
    const fresh = items.filter(isFresh);
    const from = fresh.length > 0 ? fresh : items;
    return from[Math.floor(random() * from.length)];
  };

  // Stepped down to what's still unused today — e.g. a grammar-tier learner
  // whose only grammar point came up in an earlier attempt gets a word.
  const mode = challengeModeFor(profile?.xp ?? 0, vocab.length > 0, grammar.length > 0);

  const knownWords = [...words]
    .sort(
      (a, b) =>
        Math.max(...b.progress.map((progress) => progress.introducedAt.getTime())) -
        Math.max(...a.progress.map((progress) => progress.introducedAt.getTime())),
    )
    .slice(0, MAX_KNOWN_WORDS)
    .map((word) => {
      const reading = word.romanization ? ` (${word.romanization})` : "";
      return word.path === "grammar"
        ? `pattern ${word.term}${reading} — ${word.translation}`
        : `${word.term}${reading} — "${word.translation}"`;
    });

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

  // Also its own stream: new friends each attempt, without moving the target.
  const friendRandom = mulberry32(hashSeed(`${seed}:friends`));
  const pickFrom = <T>(items: T[]): T => items[Math.floor(friendRandom() * items.length)];
  const heAnimal = pickFrom(ANIMALS);
  const friends: ChallengeFriend[] = [
    { name: pickFrom(HE_NAMES), animal: heAnimal, pronoun: "he" },
    {
      name: pickFrom(SHE_NAMES),
      animal: pickFrom(ANIMALS.filter((animal) => animal !== heAnimal)),
      pronoun: "she",
    },
  ];

  return {
    targetLanguage: course.targetLanguage,
    level: parseCourseLevel(enrollment?.level),
    vocab: mode === "grammar" ? null : toItem(pick(vocab)),
    grammar: mode === "vocab" ? null : toItem(pick(grammar)),
    fallbackOpener: openers[Math.floor(openerRandom() * openers.length)],
    friends,
    knownWords,
  };
}
