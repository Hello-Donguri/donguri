import type { TFunction } from "@/lib/i18n/translate";
import { DecksShowcase } from "@/components/landing/decks-showcase";

// The landing page's decks section — translated here on the server and
// handed to the interactive level picker as plain strings.
export function Decks({ t }: { t: TFunction }) {
  return (
    <DecksShowcase
      labels={{
        eyebrow: t("home.decks.eyebrow", "Decks"),
        heading: t("home.decks.heading", "Pick a topic. Pick your level."),
        body: t(
          "home.decks.body",
          "From your very first hello to business meetings, choose the decks that fit you — and switch any time.",
        ),
        levels: {
          beginner: { name: t("home.decks.beginner", "Beginner"), cefr: "A1–A2" },
          intermediate: { name: t("home.decks.intermediate", "Intermediate"), cefr: "B1" },
          advanced: { name: t("home.decks.advanced", "Advanced"), cefr: "B2" },
          expert: { name: t("home.decks.expert", "Expert"), cefr: "C1" },
        },
        vocabulary: t("course_home.vocabulary", "Vocabulary"),
        grammar: t("course_home.grammar", "Grammar"),
        mixed: t("course_home.mixed", "Mixed"),
        wordsLabel: t("home.decks.words", "{{count}} words and patterns"),
        descriptions: {
          greetings: t("home.decks.d_greetings", "Hello, goodbye, thank you — the words you'll use every day."),
          food: t("home.decks.d_food", "Order, cook and talk about what you eat."),
          "be-verb": t("home.decks.d_be_verb", "Your first sentences: I am, you are, it is."),
          travel: t("home.decks.d_travel", "Tickets, directions and getting around a new city."),
          sport: t("home.decks.d_sport", "Talk about what you play, watch and love doing."),
          past: t("home.decks.d_past", "Tell stories about what happened yesterday and last year."),
          opinions: t("home.decks.d_opinions", "Agree, disagree and explain why — politely."),
          health: t("home.decks.d_health", "Describe how you feel, at the doctor's and beyond."),
          conditionals: t("home.decks.d_conditionals", "Talk about what might have been."),
          business: t("home.decks.d_business", "Run meetings, give updates and make your point."),
          idioms: t("home.decks.d_idioms", "Sound natural with the phrases native speakers use."),
          nuance: t("home.decks.d_nuance", "Soften, stress and hedge — say exactly what you mean."),
        },
      }}
    />
  );
}
