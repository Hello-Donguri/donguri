import { Blocks, Image as ImageIcon, Languages, ListTree, Quote, Volume2 } from "lucide-react";
import { Section, SectionHeading, FeatureList } from "@/components/landing/section";
import type { TFunction } from "@/lib/i18n/translate";

export function Lessons({ t }: { t: TFunction }) {
  const icon = "h-5 w-5";
  const items = [
    {
      icon: <ImageIcon aria-hidden className={icon} />,
      title: t("home.lessons.picture_title", "A picture for every word"),
      body: t("home.lessons.picture_body", "So you link the English to the thing itself, not just a translation."),
    },
    {
      icon: <Volume2 aria-hidden className={icon} />,
      title: t("home.lessons.audio_title", "Hear it said"),
      body: t("home.lessons.audio_body", "Play the word and every example sentence out loud."),
    },
    {
      icon: <Quote aria-hidden className={icon} />,
      title: t("home.lessons.examples_title", "Real example sentences"),
      body: t(
        "home.lessons.examples_body",
        "The word is highlighted in each one, with a natural Japanese translation underneath.",
      ),
    },
    {
      icon: <ListTree aria-hidden className={icon} />,
      title: t("home.lessons.forms_title", "Every form in one place"),
      body: t("home.lessons.forms_body", "go, goes, went, gone, going — laid out side by side."),
    },
    {
      icon: <Blocks aria-hidden className={icon} />,
      title: t("home.lessons.grammar_title", "Grammar you can see"),
      body: t(
        "home.lessons.grammar_body",
        "Patterns are drawn as building blocks, showing which parts you say and which you fill in.",
      ),
    },
    {
      icon: <Languages aria-hidden className={icon} />,
      title: t("home.lessons.japanese_title", "Explained in Japanese"),
      body: t(
        "home.lessons.japanese_body",
        "Short explanations in Japanese whenever a word or pattern needs one.",
      ),
    },
  ];

  return (
    <Section>
      <div className="grid items-center gap-14 md:grid-cols-2">
        <div>
          <SectionHeading
            center={false}
            eyebrow={t("home.lessons.eyebrow", "Lessons")}
            heading={t("home.lessons.heading", "Lessons that explain, not just list.")}
            subtext={t(
              "home.lessons.subtext",
              "Vocabulary and grammar are taught in the same short sessions, so you learn a word and how to use it together.",
            )}
          />
          <div className="mt-10">
            <FeatureList items={items} accent="ai" />
          </div>
        </div>

        <GrammarCardMock t={t} />
      </div>
    </Section>
  );
}

// A grammar learn card, mirroring PatternChart in components/vocab/word-lesson.tsx:
// solid green boxes for the words you say, dashed ones for the parts you fill in.
function GrammarCardMock({ t }: { t: TFunction }) {
  const slots: { words: string[]; placeholder: boolean }[] = [
    { words: ["Do", "Does"], placeholder: false },
    { words: ["subject"], placeholder: true },
    { words: ["verb"], placeholder: true },
  ];

  return (
    <div className="rounded-4xl border border-card-border bg-washi p-6 shadow-lg sm:p-8">
      <div className="flex flex-col items-center text-center">
        <span className="rounded-full bg-matcha-soft px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-matcha-dark">
          {t("home.mock.grammar", "Grammar")}
        </span>

        <div aria-hidden="true" className="mt-7 flex flex-wrap items-center justify-center gap-2">
          {slots.map((slot, index) => (
            <div key={slot.words.join()} className="flex items-center gap-2">
              {index > 0 && <span className="text-2xl font-bold text-sumi-soft">+</span>}
              <div
                className={
                  slot.placeholder
                    ? "flex flex-col divide-y divide-dashed divide-sumi/15 rounded-2xl border-2 border-dashed border-sumi/25 text-xl font-bold italic text-sumi-soft"
                    : "flex flex-col divide-y divide-matcha/25 rounded-2xl border-2 border-matcha/40 bg-matcha-soft/60 text-xl font-bold text-sumi"
                }
              >
                {slot.words.map((word) => (
                  <span key={word} className="px-4 py-1">
                    {word}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <span className="text-2xl font-bold text-sumi">?</span>
        </div>
        <p className="sr-only">Do / Does + subject + verb?</p>

        <p className="mt-6 border-t border-sumi/10 pt-5 text-2xl font-bold text-sumi">
          {t("home.mock.grammar_meaning", "Ask if someone does something.")}
        </p>

        <div className="mt-5 w-full space-y-3 rounded-2xl bg-washi-soft px-5 py-4 text-left">
          {[
            ["they live here?", "彼らはここに住んでいますか？"],
            ["you like coffee?", "コーヒーは好きですか？"],
          ].map(([rest, ja]) => (
            <div key={rest}>
              <p className="text-sumi">
                <strong className="rounded bg-matcha-soft px-1 font-bold text-matcha-dark">Do</strong>{" "}
                {rest}
              </p>
              <p lang="ja" className="mt-0.5 text-sm text-sumi-soft">
                {ja}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
