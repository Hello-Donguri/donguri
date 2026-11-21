"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  FlaskConical,
  Image as ImageIcon,
  Mars,
  MessageCircle,
  MoreHorizontal,
  Rocket,
  Trash2,
  Venus,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { setCategoryActive, setCategoryStarter, setCategoryTest } from "@/lib/actions/admin-content";
import { useDeleteDeck } from "@/components/admin/use-delete-deck";
import { ReadinessRing, deckReadiness } from "@/components/admin/readiness-ring";
import { VisibilityToggle } from "@/components/ui/visibility-toggle";
import { WordImage } from "@/components/ui/word-image";
import { Button } from "@/components/ui/button";
import { useDismissableMenu } from "@/components/ui/use-dismissable-menu";
import { useTranslations } from "@/components/i18n/locale-provider";
import type { TFunction } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import type { AdminCategorySummary } from "@/lib/definitions";

type Media = AdminCategorySummary["media"];

// Green once everything has it; muted grey until then, so the page isn't
// a wall of red while recordings are still to come.
function Pill({ complete, children }: { complete: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        complete ? "bg-matcha-soft text-matcha-dark" : "bg-neutral-soft text-sumi-soft",
      )}
    >
      {children}
    </span>
  );
}

function sumMedia(categories: AdminCategorySummary[]): Media {
  return categories.reduce<Media>(
    (sum, { media }) => ({
      total: sum.total + media.total,
      svgImages: sum.svgImages + media.svgImages,
      femaleVoice: sum.femaleVoice + media.femaleVoice,
      maleVoice: sum.maleVoice + media.maleVoice,
      sentences: sum.sentences + media.sentences,
      sentenceFemaleVoice: sum.sentenceFemaleVoice + media.sentenceFemaleVoice,
      sentenceMaleVoice: sum.sentenceMaleVoice + media.sentenceMaleVoice,
    }),
    {
      total: 0,
      svgImages: 0,
      femaleVoice: 0,
      maleVoice: 0,
      sentences: 0,
      sentenceFemaleVoice: 0,
      sentenceMaleVoice: 0,
    },
  );
}

// The course's media at a glance, for the live decks: images (usually the
// first thing done, so given room), then each voice's recordings — of
// words, and of example sentences (one recording per sentence per voice).
function MediaOverview({ media }: { media: Media }) {
  const t = useTranslations();
  const imagesComplete = media.total > 0 && media.svgImages === media.total;

  return (
    <section className="grid gap-5 rounded-2xl border border-card-border bg-washi-soft p-4 sm:p-5 md:grid-cols-3 md:gap-0 md:divide-x md:divide-card-border">
      <div className="flex flex-col gap-2 md:pr-5">
        <h3 className="flex items-center gap-2 font-nunito font-bold text-sumi">
          <ImageIcon className="h-4 w-4 text-sumi-soft" aria-hidden />
          {t("admin_course_decks.media_images", "Images")}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="font-nunito text-2xl font-extrabold tabular-nums text-sumi">
            {media.svgImages} / {media.total}{" "}
            <span className="text-sm font-semibold text-sumi-soft">{t("admin_course_decks.unit_words", "words")}</span>
          </p>
          <Pill complete={imagesComplete}>
            {imagesComplete
              ? t("admin_course_decks.complete", "Complete")
              : media.svgImages === 0
                ? t("admin_course_decks.empty", "Empty")
                : t("admin_course_decks.in_progress", "In progress")}
          </Pill>
        </div>
      </div>

      <AudioGroup
        title={t("admin_course_decks.media_word_audio", "Word audio")}
        Icon={Volume2}
        female={media.femaleVoice}
        male={media.maleVoice}
        total={media.total}
        unit={t("admin_course_decks.unit_words", "words")}
        className="md:px-5"
      />
      <AudioGroup
        title={t("admin_course_decks.media_sentence_audio", "Example sentence audio")}
        Icon={MessageCircle}
        female={media.sentenceFemaleVoice}
        male={media.sentenceMaleVoice}
        total={media.sentences}
        unit={t("admin_course_decks.unit_sentences", "sentences")}
        className="md:pl-5"
      />
    </section>
  );
}

function AudioGroup({
  title,
  Icon,
  female,
  male,
  total,
  unit,
  className,
}: {
  title: string;
  Icon: LucideIcon;
  female: number;
  male: number;
  total: number;
  unit: string;
  className?: string;
}) {
  const t = useTranslations();
  const voices = [
    { key: "female", label: t("admin_course_decks.media_female", "Female voice"), count: female, VoiceIcon: Venus },
    { key: "male", label: t("admin_course_decks.media_male", "Male voice"), count: male, VoiceIcon: Mars },
  ];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <h3 className="flex items-center gap-2 font-nunito font-bold text-sumi">
        <Icon className="h-4 w-4 text-sumi-soft" aria-hidden />
        {title}
      </h3>
      {total === 0 ? (
        <p className="text-sm text-sumi-soft">{t("admin_course_decks.no_sentences", "No example sentences yet.")}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {voices.map(({ key, label, count, VoiceIcon }) => (
            <li key={key} className="flex items-center justify-between gap-2 text-sm text-sumi">
              <span className="flex items-center gap-2">
                <VoiceIcon className="h-3.5 w-3.5 text-sumi-soft" aria-hidden />
                {label}
              </span>
              <Pill complete={count === total}>
                {count} / {total} {unit}
              </Pill>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// One deck's media, a row each: images, then word and sentence recordings
// with both voices together — "Empty" until any are uploaded.
function DeckMediaRows({ media }: { media: Media }) {
  const t = useTranslations();
  const empty = t("admin_course_decks.empty", "Empty");

  const audio = (female: number, male: number, total: number, unit: string) => ({
    complete: total > 0 && female === total && male === total,
    value:
      female === 0 && male === 0
        ? empty
        : female === total && male === total
          ? `${total} / ${total} ${unit}`
          : `♀ ${female} · ♂ ${male} / ${total} ${unit}`,
  });

  const rows = [
    {
      key: "images",
      label: t("admin_course_decks.media_images", "Images"),
      Icon: ImageIcon,
      complete: media.total > 0 && media.svgImages === media.total,
      value: media.svgImages === 0 ? empty : `${media.svgImages} / ${media.total}`,
    },
    {
      key: "word-audio",
      label: t("admin_course_decks.media_word_audio", "Word audio"),
      Icon: Volume2,
      ...audio(media.femaleVoice, media.maleVoice, media.total, t("admin_course_decks.unit_words", "words")),
    },
    ...(media.sentences > 0
      ? [
          {
            key: "sentence-audio",
            label: t("admin_course_decks.media_sentence_audio_short", "Sentence audio"),
            Icon: MessageCircle,
            ...audio(
              media.sentenceFemaleVoice,
              media.sentenceMaleVoice,
              media.sentences,
              t("admin_course_decks.unit_sentences", "sentences"),
            ),
          },
        ]
      : []),
  ];

  return (
    <ul className="flex flex-col divide-y divide-card-border border-y border-card-border">
      {rows.map(({ key, label, Icon, complete, value }) => (
        <li key={key} className="flex items-center justify-between gap-2 py-2 text-sm text-sumi">
          <span className="flex min-w-0 items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-sumi-soft" aria-hidden />
            <span className="truncate">{label}</span>
          </span>
          <Pill complete={complete}>{value}</Pill>
        </li>
      ))}
    </ul>
  );
}

// The share of the deck's media slots that are filled — an image and both
// voices for every word, and both voices for every example sentence —
// labelled so it doesn't read as images alone.
function DeckReadiness({ media }: { media: Media }) {
  const t = useTranslations();
  const percent = deckReadiness(media);
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <ReadinessRing
        percent={percent}
        label={t(
          "admin_course_decks.readiness_title",
          "{{percent}}% of media ready — an image and both voices for every word, and both voices for every example sentence",
          { percent },
        )}
      />
      <span className="text-[10px] font-semibold whitespace-nowrap text-sumi-soft">
        {t("admin_course_decks.media_ready", "Media ready")}
      </span>
    </div>
  );
}

// "139 words", "12 grammar points", "120 words · 19 grammar points".
function contentCount(category: AdminCategorySummary, t: TFunction) {
  const { vocabCount, grammarCount } = category;
  const words = t("admin_course_decks.word_count", "{{count}} words", { count: vocabCount });
  const grammar = t("admin_course_decks.grammar_count", "{{count}} grammar points", { count: grammarCount });
  if (grammarCount === 0) return words;
  if (vocabCount === 0) return grammar;
  return `${words} · ${grammar}`;
}

function DeckCover({ category, className }: { category: AdminCategorySummary; className: string }) {
  const initial = (
    <div className="flex h-full w-full items-center justify-center bg-ai-soft font-nunito text-2xl font-bold text-ai-dark">
      {category.title.charAt(0)}
    </div>
  );
  return (
    <div className={cn("shrink-0 overflow-hidden rounded-xl", className)}>
      {category.coverImage ? (
        <WordImage src={category.coverImage} alt="" className="h-full w-full object-contain" fallback={initial} />
      ) : (
        initial
      )}
    </div>
  );
}

// A deck's less-used actions, behind ⋯: make it (or stop it being) the
// starter deck, move it between live and test, delete it.
function DeckActionsMenu({
  category,
  onSetTest,
}: {
  category: AdminCategorySummary;
  onSetTest: (isTest: boolean) => void;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const ref = useDismissableMenu(open, () => setOpen(false));
  const [settingStarter, startStarterTransition] = useTransition();
  const { deleting, deleteDeck } = useDeleteDeck({
    languageDeckId: category.id,
    label: category.title,
    wordCount: category.vocabCount + category.grammarCount,
  });

  const item =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition disabled:opacity-60";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("admin_course_decks.more_actions", "More actions for {{label}}", { label: category.title })}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-ghost-border text-ghost-text transition hover:bg-ghost-hover"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-52 rounded-2xl border border-card-border bg-washi p-1.5 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            disabled={settingStarter}
            onClick={() =>
              startStarterTransition(async () => {
                await setCategoryStarter(category.id, !category.isStarter);
                setOpen(false);
              })
            }
            className={cn(item, "text-sumi hover:bg-sumi/5")}
          >
            <Rocket className="h-4 w-4 shrink-0 text-sumi-soft" aria-hidden />
            {category.isStarter
              ? t("admin_course_decks.unmark_starter", "Remove starter")
              : t("admin_course_decks.mark_starter", "Make starter")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSetTest(!category.isTest);
            }}
            className={cn(item, "text-sumi hover:bg-sumi/5")}
          >
            <FlaskConical className="h-4 w-4 shrink-0 text-sumi-soft" aria-hidden />
            {category.isTest
              ? t("admin_course_decks.mark_live", "Move to live")
              : t("admin_course_decks.mark_test", "Mark as test")}
          </button>
          <div className="my-1 border-t border-card-border" />
          <button
            type="button"
            role="menuitem"
            disabled={deleting}
            onClick={() => {
              setOpen(false);
              deleteDeck();
            }}
            className={cn(item, "text-shu-dark hover:bg-shu/10")}
          >
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
            {t("common.delete", "Delete")}
          </button>
        </div>
      )}
    </div>
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
  const href = `/dashboard/admin/courses/${courseSlug}/categories/${category.id}`;

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-washi-soft p-4 shadow-sm",
        category.isTest ? "border-dashed border-sumi/25" : "border-card-border",
      )}
    >
      {/* Title, then size, then tags — so every card reads the same way
          however many tags it has. */}
      <div className="flex items-start gap-3">
        <Link href={href} tabIndex={-1} aria-hidden>
          <DeckCover category={category} className="h-20 w-20" />
        </Link>
        <div className="min-w-0 flex-1">
          <h3 className="font-nunito text-lg font-bold leading-snug text-sumi">
            <Link href={href} className="transition hover:text-ai hover:underline">
              {category.title}
            </Link>
          </h3>
          <p className="text-sm text-sumi-soft">{contentCount(category, t)}</p>
          {(category.isTest || category.tags.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
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
          )}
        </div>
        <DeckReadiness media={category.media} />
      </div>

      <DeckMediaRows media={category.media} />

      <div className="mt-auto flex items-center gap-2">
        <VisibilityToggle
          active={category.active}
          toggleAction={setCategoryActive.bind(null, category.id)}
          label={category.title}
        />
        <Button href={href} size="sm" variant="outline" className="ml-auto">
          {t("admin_course_decks.edit_deck", "Edit deck")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
        <DeckActionsMenu category={category} onSetTest={onSetTest} />
      </div>
    </article>
  );
}

// The starter deck (guests' first words, never chosen by learners — see
// getStarterWordIds) as one compact row above the live decks, its media
// folded away until asked for.
function StarterDeckPanel({
  category,
  courseSlug,
  onSetTest,
}: {
  category: AdminCategorySummary;
  courseSlug: string;
  onSetTest: (isTest: boolean) => void;
}) {
  const t = useTranslations();
  const [expanded, setExpanded] = useState(false);
  const href = `/dashboard/admin/courses/${courseSlug}/categories/${category.id}`;

  return (
    <section className="rounded-2xl border border-card-border bg-washi-soft shadow-sm">
      <div className="flex flex-wrap items-center gap-3 p-3 sm:px-4">
        <Link href={href} tabIndex={-1} aria-hidden>
          <DeckCover category={category} className="h-14 w-14" />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="font-nunito text-lg font-bold leading-snug text-sumi">
            <Link href={href} className="transition hover:text-ai hover:underline">
              {category.title}
            </Link>
          </h2>
          <p className="text-sm text-sumi-soft">
            {t("admin_course_decks.starter_summary", "{{count}} words · Guest preview", {
              count: category.vocabCount + category.grammarCount,
            })}
          </p>
        </div>
        <VisibilityToggle
          active={category.active}
          toggleAction={setCategoryActive.bind(null, category.id)}
          label={category.title}
        />
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium text-ghost-text transition hover:bg-ghost-hover"
        >
          {t("admin_course_decks.media", "Media")}
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden />
        </button>
        <DeckActionsMenu category={category} onSetTest={onSetTest} />
      </div>
      {expanded && (
        <div className="flex items-center gap-4 border-t border-card-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <DeckMediaRows media={category.media} />
          </div>
          <DeckReadiness media={category.media} />
        </div>
      )}
    </section>
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
  subtitle?: string;
  categories: AdminCategorySummary[];
  courseSlug: string;
  onSetTest: (id: string, isTest: boolean) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-nunito text-xl font-bold text-sumi">
          {title} <span className="text-base font-semibold text-sumi-soft">{categories.length}</span>
        </h2>
        {subtitle && <p className="text-sm text-sumi-soft">{subtitle}</p>}
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

// The admin course page's decks: the live decks' media, the starter deck,
// then the live and test decks. "Mark as test" moves a card across straight
// away via `useOptimistic`, then reconciles with the server once
// `setCategoryTest`'s revalidation lands (or moves it back if the action
// fails).
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

  const starterDecks = optimisticCategories.filter((category) => category.isStarter);
  const liveDecks = optimisticCategories.filter((category) => !category.isStarter && !category.isTest);
  const testDecks = optimisticCategories.filter((category) => !category.isStarter && category.isTest);

  return (
    <>
      {liveDecks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-nunito text-xl font-bold text-sumi">
            {t("admin_course_decks.media_overview", "Media across live decks")}
          </h2>
          <MediaOverview media={sumMedia(liveDecks)} />
        </section>
      )}

      {starterDecks.length > 0 ? (
        starterDecks.map((category) => (
          <StarterDeckPanel
            key={category.id}
            category={category}
            courseSlug={courseSlug}
            onSetTest={(isTest) => handleSetTest(category.id, isTest)}
          />
        ))
      ) : categories.length > 0 ? (
        <p className="rounded-2xl border border-dashed border-card-border px-4 py-3 text-sm text-sumi-soft">
          {t(
            "admin_course_decks.starter_deck_empty",
            "No starter deck yet — use “Make starter” in a deck's ⋯ menu below. Until there is one, guests can't start this course.",
          )}
        </p>
      ) : null}

      <DeckSection
        title={t("admin_course_decks.live_decks", "Live decks")}
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
