import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, FileX2, ImageOff } from "lucide-react";
import { requireAdminProfile, getAdminCategoryWords } from "@/lib/dal";
import { setWordActive } from "@/lib/actions/admin-content";
import { DeleteWordButton } from "@/components/admin/delete-word-button";
import { WordMediaSlots } from "@/components/admin/word-media-slots";
import { DeckMediaSummary } from "@/components/admin/deck-media-summary";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { imageUrl } from "@/lib/bunny";
import { prisma } from "@/lib/prisma";
import { WordImage } from "@/components/ui/word-image";
import { VisibilityToggle } from "@/components/ui/visibility-toggle";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { getTranslator } from "@/lib/i18n/server";
import { cn, getContrastTextClass } from "@/lib/utils";

// Whether a word's uploaded picture is an SVG — flagged on its card.
function isSvgImage(imageKey: string | null): boolean {
  return Boolean(imageKey?.toLowerCase().endsWith(".svg"));
}

type PageProps = {
  params: Promise<{ courseSlug: string; languageDeckId: string }>;
  // `?missing=image` shows only the words still without a picture;
  // `?missing=svg` only those whose picture isn't an SVG yet.
  searchParams: Promise<{ missing?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { languageDeckId } = await params;
  const { languageDeck } = await getAdminCategoryWords(languageDeckId);
  return { title: `${languageDeck.title} — Donguri` };
}

export default async function AdminCategoryWordsPage({ params, searchParams }: PageProps) {
  await requireAdminProfile();
  const [{ courseSlug, languageDeckId }, { missing }] = await Promise.all([params, searchParams]);
  const filter: "all" | "image" | "svg" = missing === "image" || missing === "svg" ? missing : "all";
  const { languageDeck, course, words } =
    await getAdminCategoryWords(languageDeckId);
  const { t } = await getTranslator();

  if (course.slug !== courseSlug) {
    redirect(`/dashboard/admin/courses/${courseSlug}`);
  }

  const withoutImage = words.filter((word) => !word.imageKey);
  const notSvg = words.filter((word) => word.imageKey && !isSvgImage(word.imageKey));
  const shownWords = filter === "image" ? withoutImage : filter === "svg" ? notSvg : words;

  // Words in other decks using the very same picture file (a deck copied
  // to another course shares its images), by file — so replacing one can
  // ask whether to replace it everywhere.
  const imageKeys = [...new Set(words.flatMap((word) => (word.imageKey ? [word.imageKey] : [])))];
  const sharing = imageKeys.length
    ? await prisma.word.findMany({
        where: { imageKey: { in: imageKeys }, languageDeckId: { not: languageDeckId } },
        select: {
          imageKey: true,
          term: true,
          languageDeck: { select: { title: true, course: { select: { title: true } } } },
        },
      })
    : [];
  const sharedImages = new Map<string, { course: string; deck: string; term: string }[]>();
  for (const other of sharing) {
    const list = sharedImages.get(other.imageKey!) ?? [];
    list.push({ course: other.languageDeck.course.title, deck: other.languageDeck.title, term: other.term });
    sharedImages.set(other.imageKey!, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          {
            href: "/dashboard",
            label: t("breadcrumbs.dashboard", "Dashboard"),
          },
          {
            href: "/dashboard/admin",
            label: t("admin_hub.title", "Admin"),
          },
          {
            href: "/dashboard/admin/courses",
            label: t("admin_courses.title", "Course content"),
          },
          {
            href: `/dashboard/admin/courses/${courseSlug}`,
            label: course.title,
          },
          { label: languageDeck.title },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        {languageDeck.coverImage ? (
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl">
            <WordImage
              src={languageDeck.coverImage}
              alt=""
              className="h-40 w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(to right, transparent 0%, transparent 33%, ${languageDeck.bgColor ?? "rgba(22, 13, 4, 0.7)"} 66%, ${languageDeck.bgColor ?? "rgba(22, 13, 4, 0.7)"} 100%)`,
              }}
            />
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <div className="ml-auto max-w-[45%] text-right">
                <PageTitle
                  className={getContrastTextClass(languageDeck.bgColor)}
                >
                  {languageDeck.title}
                </PageTitle>
                <PageSubtitle
                  className={cn(
                    "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    getContrastTextClass(languageDeck.primaryColor),
                  )}
                  style={
                    languageDeck.primaryColor
                      ? { backgroundColor: languageDeck.primaryColor }
                      : undefined
                  }
                >
                  {languageDeck.subheading}
                </PageSubtitle>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <PageTitle>{languageDeck.title}</PageTitle>
            <PageSubtitle>{course.title}</PageSubtitle>
          </div>
        )}
        <div className="flex shrink-0 flex-col gap-3">
          {languageDeck.description && (
            <p className="max-w-xs text-sm text-sumi-soft">
              {languageDeck.description}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <Button
              href={`/dashboard/admin/courses/${courseSlug}/categories/${languageDeckId}/edit`}
              variant="outline"
              size="sm"
            >
              {t("admin_category_words.edit_deck", "Edit deck")}
            </Button>
            <Button
              href={`/dashboard/admin/courses/${courseSlug}/categories/${languageDeckId}/import`}
              variant="outline"
              size="sm"
            >
              {t("admin_category_words.import", "Import from another course")}
            </Button>
            <Button
              href={`/dashboard/admin/courses/${courseSlug}/categories/${languageDeckId}/import-spreadsheet`}
              variant="outline"
              size="sm"
            >
              {t("admin_category_words.import_spreadsheet", "Import from spreadsheet")}
            </Button>
            <Button
              href={`/dashboard/admin/courses/${courseSlug}/categories/${languageDeckId}/words/new`}
              size="sm"
            >
              {t("admin_category_words.add_word", "Add word")}
            </Button>
          </div>
        </div>
      </div>

      {words.length > 0 && <DeckMediaSummary words={words} t={t} />}

      {/* Narrow the list to the words still needing a picture, or an SVG
          version of theirs — and back to all of them. */}
      {words.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "all", label: t("admin_category_words.filter_all", "All words ({{count}})", { count: words.length }), Icon: null },
              {
                key: "image",
                label: t("admin_category_words.filter_missing_image", "Missing image ({{count}})", { count: withoutImage.length }),
                Icon: ImageOff,
              },
              {
                key: "svg",
                label: t("admin_category_words.filter_not_svg", "Not SVG ({{count}})", { count: notSvg.length }),
                Icon: FileX2,
              },
            ] as const
          ).map(({ key, label, Icon }) => {
            const active = filter === key;
            return (
              <Link
                key={key}
                href={`/dashboard/admin/courses/${courseSlug}/categories/${languageDeckId}${key === "all" ? "" : `?missing=${key}`}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition",
                  key === "image" &&
                    (active ? "border-shu bg-shu text-washi" : "border-shu/30 bg-shu/5 text-shu-dark hover:bg-shu/10"),
                  key === "svg" &&
                    (active ? "border-kin bg-kin text-ink-on-light" : "border-kin/50 bg-kin/10 text-acorn hover:bg-kin/20"),
                  key === "all" &&
                    (active ? "border-sumi bg-sumi text-washi" : "border-ghost-border text-ghost-text hover:bg-ghost-hover"),
                )}
              >
                {Icon && <Icon aria-hidden className="h-4 w-4" />}
                {label}
              </Link>
            );
          })}
        </div>
      )}

      {filter !== "all" && shownWords.length === 0 && (
        <p className="rounded-2xl border border-dashed border-card-border p-6 text-center text-sumi-soft">
          {filter === "image"
            ? t("admin_category_words.all_have_images", "Every word in this deck has an image. 🎉")
            : t("admin_category_words.all_svg", "Every image in this deck is an SVG. 🎉")}
        </p>
      )}

      {words.length === 0 ? (
        <p className="text-sumi-soft">
          {t("admin_category_words.no_words", "No words yet.")}
        </p>
      ) : (
        // A grid rather than one long single-column stack — with a deck's
        // worth of imported words (spreadsheet imports easily run to the
        // hundreds), a single column meant scrolling through a very tall
        // page to find anything.
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shownWords.map((word) => (
            <div
              key={word.id}
              className="flex flex-col gap-3 rounded-2xl border border-card-border bg-washi-soft p-4"
            >
              <div className="flex items-center gap-3">
                {/* An uploaded picture opens full size; the naming-convention
                    fallback may not exist, so it stays a plain thumbnail. */}
                {word.imageKey ? (
                  <ImageLightbox src={imageUrl(word.imageKey)} alt={word.term} className="shrink-0">
                    <WordImage
                      src={imageUrl(word.imageKey)}
                      alt={word.term}
                      className={cn(
                        "h-12 w-12 rounded-lg object-cover",
                        // An SVG upload (crisp at any size) gets a gold frame.
                        isSvgImage(word.imageKey) && "border-2 border-kin",
                      )}
                    />
                  </ImageLightbox>
                ) : (
                  // No uploaded picture: a dashed red placeholder, hard to miss
                  // when scanning a deck for what still needs one.
                  <span
                    title={t("admin_category_words.no_image", "No image")}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-shu/50 bg-shu/5 text-shu"
                  >
                    <ImageOff aria-hidden className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate font-semibold text-sumi">
                      {word.term} — {word.translation}
                    </h2>
                    {!word.imageKey && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-shu/10 px-2 py-0.5 text-[11px] font-bold text-shu-dark">
                        <ImageOff aria-hidden className="h-3 w-3" />
                        {t("admin_category_words.no_image", "No image")}
                      </span>
                    )}
                    {isSvgImage(word.imageKey) && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-kin/20 px-2 py-0.5 text-[11px] font-bold text-acorn">
                        <Check aria-hidden className="h-3 w-3" strokeWidth={3} />
                        {t("admin_category_words.svg", "SVG")}
                      </span>
                    )}
                  </div>
                  {word.romanization && (
                    <p className="truncate text-sm text-sumi-soft">
                      {word.romanization}
                    </p>
                  )}
                </div>
              </div>

              {/* Its picture and recordings, uploaded right here — no
                  need to open the word. */}
              <WordMediaSlots
                wordId={word.id}
                term={word.term}
                imageUrl={word.imageKey ? imageUrl(word.imageKey) : null}
                sharedImageWith={word.imageKey ? sharedImages.get(word.imageKey) ?? [] : []}
                audio={word.audio}
              />

              {word.exampleSentence && (
                <p className="line-clamp-2 text-sm text-sumi-soft">
                  {word.exampleSentence}
                </p>
              )}

              {(word.category || word.wordType || word.secondaryWordType) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {word.category && (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        getContrastTextClass(word.category.color),
                      )}
                      style={{ backgroundColor: word.category.color }}
                    >
                      {word.category.name}
                    </span>
                  )}
                  {[word.wordType, word.secondaryWordType].map(
                    (type) =>
                      type && (
                        <span
                          key={type}
                          className="inline-flex items-center rounded-full border border-sumi/15 px-2.5 py-0.5 text-xs font-medium text-sumi-soft"
                        >
                          {type.replace(/_/g, " ")}
                        </span>
                      ),
                  )}
                </div>
              )}

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                <Button
                  href={`/dashboard/admin/courses/${courseSlug}/categories/${languageDeckId}/words/${word.id}/quiz`}
                  variant="outline"
                  size="sm"
                >
                  {t("admin_category_words.quiz", "Quiz")}
                </Button>
                <Button
                  href={`/dashboard/admin/courses/${courseSlug}/categories/${languageDeckId}/words/${word.id}/edit`}
                  variant="outline"
                  size="sm"
                >
                  {t("admin_category_words.edit", "Edit")}
                </Button>
                <VisibilityToggle
                  active={word.active}
                  toggleAction={setWordActive.bind(null, word.id)}
                  label={`${word.term} — ${word.translation}`}
                />
                <DeleteWordButton wordId={word.id} label={`${word.term} — ${word.translation}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
