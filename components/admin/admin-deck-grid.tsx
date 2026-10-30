"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { FlaskConical, Image as ImageIcon, Mars, Shapes, Venus, type LucideIcon } from "lucide-react";
import { setCategoryActive, setCategoryTest } from "@/lib/actions/admin-content";
import { DeleteDeckButton } from "@/components/admin/delete-deck-button";
import { VisibilityToggle } from "@/components/ui/visibility-toggle";
import { WordImage } from "@/components/ui/word-image";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n/locale-provider";
import type { TFunction } from "@/lib/i18n/translate";
import type { AdminCategorySummary } from "@/lib/definitions";

type Media = AdminCategorySummary["media"];

// Green when every word has it, gold when some do, red when none do.
function statusClass(count: number, total: number) {
  if (total > 0 && count === total) return "border-matcha/30 bg-matcha-soft text-matcha-dark";
  if (count === 0) return "border-shu/30 bg-shu/10 text-shu-dark";
  return "border-kin/40 bg-kin/15 text-sumi";
}

function mediaStats(media: Media, t: TFunction): { key: string; label: string; count: number; Icon: LucideIcon }[] {
  return [
    { key: "images", label: t("admin_course_decks.media_images", "Images"), count: media.images, Icon: ImageIcon },
    { key: "svg", label: t("admin_course_decks.media_svg", "SVG images"), count: media.svgImages, Icon: Shapes },
    { key: "female", label: t("admin_course_decks.media_female", "Female voice"), count: media.femaleVoice, Icon: Venus },
    { key: "male", label: t("admin_course_decks.media_male", "Male voice"), count: media.maleVoice, Icon: Mars },
  ];
}

function sumMedia(categories: AdminCategorySummary[]): Media {
  return categories.reduce<Media>(
    (sum, { media }) => ({
      total: sum.total + media.total,
      images: sum.images + media.images,
      svgImages: sum.svgImages + media.svgImages,
      femaleVoice: sum.femaleVoice + media.femaleVoice,
      maleVoice: sum.maleVoice + media.maleVoice,
    }),
    { total: 0, images: 0, svgImages: 0, femaleVoice: 0, maleVoice: 0 },
  );
}

function MediaSummary({ media }: { media: Media }) {
  const t = useTranslations();

  return (
    <ul className="grid grid-cols-2 gap-2">
      {mediaStats(media, t).map(({ key, label, count, Icon }) => (
        <li
          key={key}
          className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${statusClass(count, media.total)}`}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </span>
          <span className="shrink-0 font-bold tabular-nums">
            {count}/{media.total}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DeckCard({
  category,
  courseSlug,
  onSetTest,
}: {
  category: AdminCategorySummary;
  courseSlug: string;
  onSetTest: (isTest: boolean) => void;
}) {
  const t = useTranslations();
  const { vocabCount, grammarCount } = category;
  const hasVocab = vocabCount > 0;
  const hasGrammar = grammarCount > 0;
  const badgeLabel =
    hasVocab && hasGrammar
      ? t("course_home.mixed", "Mixed")
      : hasGrammar
        ? t("course_home.grammar", "Grammar")
        : t("course_home.vocabulary", "Vocabulary");
  const badgeClass =
    hasVocab && hasGrammar
      ? "bg-sakura-soft text-sakura-dark"
      : hasGrammar
        ? "bg-matcha-soft text-matcha-dark"
        : "bg-ai-soft text-ai-dark";
  const href = `/dashboard/admin/courses/${courseSlug}/categories/${category.id}`;
  const initial = (
    <div className={`flex h-full w-full items-center justify-center font-nunito text-3xl font-bold ${badgeClass}`}>
      {category.title.charAt(0)}
    </div>
  );

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border bg-washi-soft p-4 shadow-sm ${
        category.isTest ? "border-dashed border-sumi/25" : "border-card-border"
      }`}
    >
      <Link href={href} className="group flex items-start gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-washi shadow-sm">
          {category.coverImage ? (
            <WordImage src={category.coverImage} alt="" className="h-full w-full object-cover" fallback={initial} />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>{badgeLabel}</span>
            {category.isTest && (
              <span className="flex items-center gap-1 rounded-full bg-neutral-soft px-2 py-0.5 text-xs font-medium text-sumi-soft">
                <FlaskConical className="h-3 w-3" aria-hidden />
                {t("admin_course_decks.test_badge", "Test")}
              </span>
            )}
            {category.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-sumi/15 bg-washi px-2 py-0.5 text-xs font-medium text-sumi-soft"
              >
                {tag}
              </span>
            ))}
          </div>
          <h3 className="mt-1.5 font-nunito font-bold leading-snug text-sumi transition group-hover:text-ai">
            {category.title}
          </h3>
          {category.subheading && <p className="mt-0.5 truncate text-xs text-sumi-soft">{category.subheading}</p>}
          <p className="mt-1 text-xs text-sumi-soft">
            {t("deck_list.content_breakdown", "{{vocab}} vocab · {{grammar}} grammar", {
              vocab: vocabCount,
              grammar: grammarCount,
            })}
          </p>
        </div>
      </Link>

      <MediaSummary media={category.media} />

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-card-border pt-3">
        <VisibilityToggle
          active={category.active}
          toggleAction={setCategoryActive.bind(null, category.id)}
          label={category.title}
        />
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onSetTest(!category.isTest)}>
            {category.isTest
              ? t("admin_course_decks.mark_live", "Move to live")
              : t("admin_course_decks.mark_test", "Mark as test")}
          </Button>
          <DeleteDeckButton
            languageDeckId={category.id}
            label={category.title}
            wordCount={vocabCount + grammarCount}
          />
        </div>
      </div>
    </div>
  );
}

function DeckSection({
  title,
  subtitle,
  categories,
  courseSlug,
  onSetTest,
}: {
  title: string;
  subtitle: string;
  categories: AdminCategorySummary[];
  courseSlug: string;
  onSetTest: (id: string, isTest: boolean) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-nunito text-lg font-bold text-sumi">
          {title} <span className="text-sm font-semibold text-sumi-soft">{categories.length}</span>
        </h2>
        <p className="text-sm text-sumi-soft">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <DeckCard
            key={category.id}
            category={category}
            courseSlug={courseSlug}
            onSetTest={(isTest) => onSetTest(category.id, isTest)}
          />
        ))}
      </div>
    </section>
  );
}

// The admin course page's decks, split into live and test. "Mark as test"
// moves a card across straight away via `useOptimistic`, then reconciles
// with the server once `setCategoryTest`'s revalidation lands (or moves it
// back if the action fails).
export function AdminDeckGrid({
  categories,
  courseSlug,
}: {
  categories: AdminCategorySummary[];
  courseSlug: string;
}) {
  const t = useTranslations();
  const [, startTransition] = useTransition();
  const [optimisticCategories, setOptimisticTest] = useOptimistic(
    categories,
    (current, { id, isTest }: { id: string; isTest: boolean }) =>
      current.map((category) => (category.id === id ? { ...category, isTest } : category)),
  );

  const handleSetTest = (id: string, isTest: boolean) => {
    startTransition(async () => {
      setOptimisticTest({ id, isTest });
      await setCategoryTest(id, isTest);
    });
  };

  const liveDecks = optimisticCategories.filter((category) => !category.isTest);
  const testDecks = optimisticCategories.filter((category) => category.isTest);
  const liveMedia = sumMedia(liveDecks);

  return (
    <>
      {liveDecks.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-card-border bg-washi-soft p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-nunito font-bold text-sumi">
              {t("admin_course_decks.media_overview", "Media across live decks")}
            </h2>
            <p className="text-xs text-sumi-soft">
              {t(
                "admin_course_decks.media_legend",
                "Green: every word · Gold: some words · Red: no words",
              )}
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {mediaStats(liveMedia, t).map(({ key, label, count, Icon }) => (
              <li
                key={key}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${statusClass(count, liveMedia.total)}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{label}</span>
                </span>
                <span className="shrink-0 font-bold tabular-nums">
                  {count}/{liveMedia.total}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DeckSection
        title={t("admin_course_decks.live_decks", "Live decks")}
        subtitle={t("admin_course_decks.live_decks_subtitle", "Decks being readied for learners.")}
        categories={liveDecks}
        courseSlug={courseSlug}
        onSetTest={handleSetTest}
      />
      <DeckSection
        title={t("admin_course_decks.test_decks", "Test decks")}
        subtitle={t("admin_course_decks.test_decks_subtitle", "Only admins can see these — they'll never go live.")}
        categories={testDecks}
        courseSlug={courseSlug}
        onSetTest={handleSetTest}
      />
    </>
  );
}
