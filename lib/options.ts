// Fixed lists of choices shared by the forms and the server — with no
// dependencies, so client components can import them without pulling zod
// (which lib/definitions.ts, re-exporting these, needs for its schemas)
// into every page's JavaScript.

// What a learner can say they speak natively — the two courses' audiences,
// and everyone else. Kept in step with profiles_native_language_check
// (section 48 of supabase/schema.sql).
export const NATIVE_LANGUAGES = ["en", "ja", "other"] as const;
export type NativeLanguage = (typeof NATIVE_LANGUAGES)[number];

// Which spelling of a word a learner sees — the content is written in UK
// spelling, with a US one on the words where it differs (Word.usSpelling).
// Kept in step with profiles_spelling_preference_check (section 65 of
// supabase/schema.sql).
export const SPELLING_PREFERENCES = ["uk", "us"] as const;
export type SpellingPreference = (typeof SPELLING_PREFERENCES)[number];

// Why a learner is learning, picked from a dropdown on sign-up/onboarding
// and changeable on the profile page. Kept in step with
// profiles_learning_reason_check (section 54 of supabase/schema.sql).
export const LEARNING_REASONS = [
  "friends",
  "travel",
  "work",
  "study",
  "living_abroad",
  "culture",
  "family",
  "fun",
  "other",
] as const;
export type LearningReason = (typeof LEARNING_REASONS)[number];

export const WORD_TYPES = [
  "noun",
  "verb",
  "irregular_verb",
  "adjective",
  "adverb",
  "pronoun",
  "determiner",
  "preposition",
  "conjunction",
  "interjection",
  "phrase",
  "numeral",
  "particle",
] as const;

export type WordType = (typeof WORD_TYPES)[number];

// A deck's cover image — always an SVG, like a word's picture — is on
// every deck card learners see, so it's kept small: checked on the server
// and, as soon as one's picked, in the browser (see FileField's
// `maxBytes`).
export const MAX_DECK_COVER_BYTES = 70 * 1024;
