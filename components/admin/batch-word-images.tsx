"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Clock,
  RefreshCw,
  Save,
  Shapes,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import {
  chooseGeneratedWordImage,
  listWordsForBatchImages,
} from "@/lib/actions/word-media";
import {
  referenceImageCount,
  type WordImageCharacterId,
} from "@/lib/word-image-characters";
import {
  GENERATED_IMAGE_MAX_BYTES,
  GENERATED_IMAGE_WARN_BYTES,
  SVG_OPTIONS,
  type SvgOptionKey,
  type SvgResult,
  type WordImageEvent,
} from "@/lib/generated-word-image";
import {
  CHECKERBOARD,
  CharacterPicker,
  FaceToggle,
  FullSizeHint,
  LoadingPicture,
  ImageModelPicker,
  RecommendedModelsNote,
  SELECT_CLASS,
  ScenePicker,
  SpendBadge,
  SvgModelPicker,
  formatBytes,
  readStream,
  useWordImageSettings,
  type SceneChoice,
} from "@/components/admin/word-image-settings";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useTranslations } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

type Picture = { dataUrl: string; bytes: number };
type Choice = Parameters<typeof chooseGeneratedWordImage>[1];

// One word in the batch, through both stages: its picture drawn (and
// approved or rejected by the admin), then — approved ones only — its
// SVGs made and one chosen, then saved.
type Item = {
  id: string;
  term: string;
  deckTitle: string;
  status:
    | "queued"
    | "drawing"
    | "drawn"
    | "tracing"
    | "traced"
    | "saving"
    | "saved"
    | "failed";
  picture: Picture | null;
  approved: boolean | null;
  svgs: Partial<Record<SvgOptionKey, SvgResult>> | null;
  chosen: string | null;
  error: string | null;
  // The latest log line, so a running card says what it's doing, and when
  // the current step started, for its timer.
  activity: string | null;
  startedAt: number | null;
};

type WordFilter = "missing" | "not-svg" | "all";

// How many words go in at once — each picture is one image call, so this
// is also the most a batch can cost.
const BATCH_MAX = 50;
const DRAW_AT_ONCE = 3;
// Tracing is heavy work on this server (six tracers each), so fewer at once.
const TRACE_AT_ONCE = 2;

// Which made SVG is chosen for a word to start with: the first in this
// order under the warning size, or failing that the smallest under the
// maximum. The admin can choose another before saving.
const PREFERRED: SvgOptionKey[] = [
  "potrace",
  "chatgpt",
  "vtracerClean",
  "vtracer",
  "imagetracer",
  "inkscape",
];

function autoChoose(
  svgs: Partial<Record<SvgOptionKey, SvgResult>>,
): string | null {
  const ready = PREFERRED.flatMap((key) => {
    const result = svgs[key];
    return result?.ok ? [{ key, bytes: result.bytes }] : [];
  });
  return (
    ready.find((option) => option.bytes <= GENERATED_IMAGE_WARN_BYTES)?.key ??
    ready
      .filter((option) => option.bytes <= GENERATED_IMAGE_MAX_BYTES)
      .sort((a, b) => a.bytes - b.bytes)[0]?.key ??
    null
  );
}

function choiceFor(item: Item, key: string | null): Choice | null {
  if (!key) return null;
  if (key === "png")
    return item.picture
      ? { type: "image/png", base64: item.picture.dataUrl.split(",")[1] }
      : null;
  const result = item.svgs?.[key as SvgOptionKey];
  return result?.ok ? { type: "image/svg+xml", svg: result.svg } : null;
}

// When a card's step starts, for its timer — read when the step is kicked
// off, never during render.
function stepStart() {
  return Date.now();
}

// Runs `work` over `items`, `limit` at a time, until they're done or
// `signal` is aborted.
async function inPool<T>(
  items: T[],
  limit: number,
  signal: AbortSignal,
  work: (item: T) => Promise<void>,
) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      while (queue.length && !signal.aborted) await work(queue.shift()!);
    }),
  );
}

// One word's card: its picture and where it's up to, approve or reject it
// (or redraw it) once it's drawn, and once its SVGs are made, which one to
// use.
function BatchCard({
  item,
  busy,
  onApprove,
  onRedraw,
  onChoose,
}: {
  item: Item;
  busy: boolean;
  onApprove: (approved: boolean) => void;
  onRedraw: () => void;
  onChoose: (key: string) => void;
}) {
  const t = useTranslations();
  // The version shown large: whichever thumbnail is under the pointer, or
  // was last clicked, or the chosen one — so each can be looked at
  // properly before choosing. One too big to use can still be looked at.
  const [hovered, setHovered] = useState<string | null>(null);
  const [looking, setLooking] = useState<string | null>(null);
  const working =
    item.status === "drawing" ||
    item.status === "tracing" ||
    item.status === "saving";

  const options = item.svgs
    ? [
        ...(item.picture
          ? [
              {
                key: "png",
                label: "PNG",
                src: item.picture.dataUrl,
                bytes: item.picture.bytes,
              },
            ]
          : []),
        ...SVG_OPTIONS.flatMap(({ key, label }) => {
          const result = item.svgs?.[key];
          return result?.ok
            ? [
                {
                  key,
                  label,
                  src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`,
                  bytes: result.bytes,
                },
              ]
            : [];
        }),
      ]
    : [];
  const previewed =
    options.find(
      (option) => option.key === (hovered ?? looking ?? item.chosen),
    ) ?? null;
  const shown =
    previewed ??
    (item.picture
      ? {
          key: "png",
          label: "PNG",
          src: item.picture.dataUrl,
          bytes: item.picture.bytes,
        }
      : null);

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-2xl border-2 bg-washi p-2 transition",
        item.status === "saved"
          ? "border-matcha/50"
          : item.approved === true
            ? "border-ai/60"
            : item.approved === false
              ? "border-sumi/10 opacity-60"
              : "border-card-border",
      )}
    >
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h3 className="truncate font-nunito text-sm font-extrabold">
          {item.term}
        </h3>
        <span className="shrink-0 truncate text-[10px] text-sumi-soft">
          {item.deckTitle}
        </span>
      </div>

      <div
        style={item.picture ? CHECKERBOARD : undefined}
        className="relative aspect-square w-full overflow-hidden rounded-xl border border-card-border bg-washi-soft"
      >
        {shown ? (
          <ImageLightbox
            src={shown.src}
            alt={`${item.term} — ${shown.label}`}
            className="group block h-full w-full"
            inspect
            backgroundStyle={CHECKERBOARD}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a data URL, not a hosted file. */}
            <img
              src={shown.src}
              alt={`${item.term} — ${shown.label}`}
              className="h-full w-full object-contain"
            />
            {!working && <FullSizeHint label={t("admin_batch_images.full_size", "Full size")} />}
          </ImageLightbox>
        ) : item.status === "failed" ? (
          <p className="flex h-full items-center justify-center p-2 text-center text-[11px] text-shu-dark">
            {item.error}
          </p>
        ) : item.status === "drawing" ? (
          <LoadingPicture
            label={t("admin_batch_images.drawing", "Drawing…")}
            activity={item.activity}
            startedAt={item.startedAt}
            compact
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 border-2 border-dashed border-sumi/10 text-[11px] font-semibold text-sumi-soft">
            <Clock aria-hidden className="h-5 w-5" />
            {t("admin_batch_images.queued", "Waiting in line")}
          </div>
        )}
        {previewed && !working && item.status !== "saved" && (
          <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-full bg-washi/90 px-2 py-0.5 text-[10px] font-semibold text-sumi shadow-sm">
            {previewed.label} · {formatBytes(previewed.bytes)}
            {previewed.key === item.chosen &&
              ` · ${t("admin_batch_images.chosen", "chosen")}`}
          </span>
        )}
        {working && item.picture && (
          <LoadingPicture
            label={
              item.status === "tracing"
                ? t("admin_batch_images.making_svgs", "Making SVGs…")
                : item.status === "saving"
                  ? t("admin_batch_images.saving", "Saving…")
                  : t("admin_batch_images.drawing", "Drawing…")
            }
            activity={item.activity}
            startedAt={item.status === "saving" ? null : item.startedAt}
            overlay
            compact
          />
        )}
        {item.status === "saved" && (
          <span className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-matcha text-washi">
            <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        )}
      </div>

      {item.status === "failed" && item.picture && (
        <p className="px-1 text-[11px] text-shu-dark">{item.error}</p>
      )}

      {/* Stage 1: approve or reject the picture, or redraw it. */}
      {item.picture && !item.svgs && item.status !== "saved" && (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onApprove(item.approved !== true)}
            disabled={busy}
            aria-pressed={item.approved === true}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-60",
              item.approved === true
                ? "border-ai bg-ai text-washi"
                : "border-sumi/15 text-sumi hover:border-ai/50",
            )}
          >
            <ThumbsUp aria-hidden className="h-3 w-3" />
            {item.approved === true
              ? t("admin_batch_images.approved", "Approved")
              : t("admin_batch_images.approve", "Approve")}
          </button>
          <button
            type="button"
            onClick={() => onApprove(false)}
            disabled={busy}
            aria-pressed={item.approved === false}
            aria-label={t("admin_batch_images.reject", "Reject")}
            className={cn(
              "flex items-center justify-center rounded-full border px-2 py-1 transition disabled:opacity-60",
              item.approved === false
                ? "border-shu/40 bg-shu/10 text-shu-dark"
                : "border-sumi/15 text-sumi-soft hover:border-shu/40",
            )}
          >
            <ThumbsDown aria-hidden className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onRedraw}
            disabled={busy}
            aria-label={t("admin_batch_images.redraw", "Redraw")}
            title={t("admin_batch_images.redraw", "Redraw")}
            className="flex items-center justify-center rounded-full border border-sumi/15 px-2 py-1 text-sumi-soft transition hover:border-ai/50 hover:text-sumi disabled:opacity-60"
          >
            <RefreshCw aria-hidden className="h-3 w-3" />
          </button>
        </div>
      )}
      {!item.picture && item.status === "failed" && (
        <button
          type="button"
          onClick={onRedraw}
          disabled={busy}
          className="flex items-center justify-center gap-1 rounded-full border border-sumi/15 px-2 py-1 text-[11px] font-semibold text-sumi transition hover:border-ai/50 disabled:opacity-60"
        >
          <RefreshCw aria-hidden className="h-3 w-3" />
          {t("admin_batch_images.try_again", "Try again")}
        </button>
      )}

      {/* Stage 2: which made version to use. */}
      {options.length > 0 && item.status !== "saved" && (
        <div className="grid grid-cols-4 gap-1">
          {options.map((option) => {
            const tooBig = option.bytes > GENERATED_IMAGE_MAX_BYTES;
            const large = !tooBig && option.bytes > GENERATED_IMAGE_WARN_BYTES;
            const chosen = item.chosen === option.key;
            return (
              <button
                key={option.key}
                type="button"
                // Too big to use: shown large, but not chosen.
                onClick={() => {
                  setLooking(option.key);
                  if (!tooBig) onChoose(option.key);
                }}
                onMouseEnter={() => setHovered(option.key)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(option.key)}
                onBlur={() => setHovered(null)}
                disabled={busy}
                title={`${option.label} · ${formatBytes(option.bytes)}`}
                aria-pressed={chosen}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-0.5 rounded-lg border-2 p-0.5 transition disabled:cursor-not-allowed",
                  chosen
                    ? "border-ai bg-ai-soft"
                    : "border-transparent hover:border-ai/30",
                  tooBig && "opacity-50",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a data URL, not a hosted file. */}
                <img
                  src={option.src}
                  alt=""
                  style={CHECKERBOARD}
                  className="aspect-square w-full rounded-md object-contain"
                />
                <span className="w-full truncate text-center text-[9px] font-semibold text-sumi">
                  {option.label}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-[9px] font-semibold tabular-nums",
                    tooBig
                      ? "text-shu-dark"
                      : large
                        ? "text-acorn"
                        : "text-matcha-dark",
                  )}
                >
                  {large && (
                    <AlertTriangle aria-hidden className="h-2.5 w-2.5" />
                  )}
                  {formatBytes(option.bytes)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}

type BatchWord = { id: string; term: string; deckTitle: string };

// On the admin course page (choosing the words by deck and what they're
// missing) and the deck page (the words ticked there, as `presetWords`):
// pictures for many words at once, in the same
// two stages as one word's window (see GenerateWordImage) and with the same
// settings. First every word's PNG is drawn and shown, for the admin to
// approve or reject (or redraw); then SVGs are made for the approved ones
// only, with the best one chosen for each to start with; then the chosen
// versions are saved as the words' images. Stop cancels whatever's
// running and keeps what's finished.
export function BatchWordImages({
  courseSlug,
  decks = [],
  presetWords,
  onSaved,
}: {
  courseSlug: string;
  decks?: { id: string; title: string }[];
  presetWords?: BatchWord[];
  // Called once the chosen pictures are saved and the window has closed.
  onSaved?: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const settings = useWordImageSettings();

  const [deckId, setDeckId] = useState<string>(decks[0]?.id ?? "");
  const [filter, setFilter] = useState<WordFilter>("missing");
  const [limit, setLimit] = useState(12);
  const [loadedWords, setLoadedWords] = useState<BatchWord[] | null>(null);
  const candidates = presetWords ?? loadedWords;
  const [loadingWords, setLoadingWords] = useState(false);
  const [characterIds, setCharacterIds] = useState<WordImageCharacterId[]>([]);
  const [face, setFace] = useState(true);
  const [sceneId, setSceneId] = useState<SceneChoice>("auto");
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState<"draw" | "trace" | "save" | null>(
    null,
  );

  // Stop the server's work when the page goes.
  useEffect(() => () => abortRef.current?.abort(), []);

  // The words the chosen deck and filter pick out.
  const loadWords = async (nextDeckId: string, nextFilter: WordFilter) => {
    setLoadingWords(true);
    const result = await listWordsForBatchImages(
      courseSlug,
      nextDeckId === "all" ? null : nextDeckId,
    );
    setLoadingWords(false);
    if (result.error || !result.words) {
      toast({
        title: result.error ?? "Couldn't load the words.",
        tone: "error",
      });
      setLoadedWords([]);
      return;
    }
    setLoadedWords(
      result.words.filter((word) =>
        nextFilter === "missing"
          ? !word.hasImage
          : nextFilter === "not-svg"
            ? !word.hasSvg
            : true,
      ),
    );
  };

  const open = () => {
    settings.open();
    dialogRef.current?.showModal();
    if (!presetWords && deckId) void loadWords(deckId, filter);
  };

  const update = (
    id: string,
    change: Partial<Item> | ((item: Item) => Partial<Item>),
  ) =>
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...(typeof change === "function" ? change(item) : change),
            }
          : item,
      ),
    );

  // One word's stream, its events fed into its card.
  const streamFor = async (
    id: string,
    url: string,
    body: object,
    signal: AbortSignal,
  ) => {
    let failed: string | null = null;
    try {
      await readStream(url, body, signal, (event: WordImageEvent) => {
        switch (event.type) {
          case "log":
            update(id, { activity: event.message });
            break;
          case "png":
            update(id, {
              picture: { dataUrl: event.dataUrl, bytes: event.bytes },
            });
            break;
          case "svg":
            update(id, (item) => ({
              svgs: { ...item.svgs, [event.key]: event.result },
            }));
            break;
          case "cost":
            settings.recordCost(event);
            break;
          case "end":
            if (!event.ok) failed = event.error ?? "Something went wrong.";
            break;
        }
      });
    } catch (caught) {
      failed = signal.aborted
        ? "Stopped."
        : caught instanceof Error
          ? caught.message
          : "Something went wrong.";
    }
    return failed;
  };

  const draw = async (id: string, signal: AbortSignal) => {
    update(id, {
      status: "drawing",
      picture: null,
      approved: null,
      svgs: null,
      chosen: null,
      error: null,
      activity: null,
      startedAt: stepStart(),
    });
    const failed = await streamFor(
      id,
      "/api/admin/word-images/generate",
      {
        wordId: id,
        characterIds,
        sceneId,
        face,
        imageModel: settings.models.imageModel,
        quality: settings.models.quality,
      },
      signal,
    );
    update(id, (item) =>
      failed || !item.picture
        ? {
            status: "failed",
            error: failed ?? "No picture came back.",
            activity: null,
          }
        : { status: "drawn", activity: null },
    );
  };

  const run = async (
    step: "draw" | "trace" | "save",
    work: (signal: AbortSignal) => Promise<void>,
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(step);
    try {
      await work(controller.signal);
    } finally {
      if (abortRef.current === controller) setRunning(null);
    }
  };

  // Stage 1, for the whole batch.
  const drawAll = () => {
    const words = (candidates ?? []).slice(0, presetWords ? BATCH_MAX : limit);
    setItems(
      words.map((word) => ({
        ...word,
        status: "queued",
        picture: null,
        approved: null,
        svgs: null,
        chosen: null,
        error: null,
        activity: null,
        startedAt: null,
      })),
    );
    void run("draw", (signal) =>
      inPool(words, DRAW_AT_ONCE, signal, (word) => draw(word.id, signal)),
    );
  };

  const redraw = (id: string) => void run("draw", (signal) => draw(id, signal));

  // Stage 2: SVGs for the approved pictures, each given a first choice.
  const approved = items.filter(
    (item) => item.approved === true && item.picture && item.status === "drawn",
  );
  const traceApproved = () =>
    void run("trace", (signal) =>
      inPool(approved, TRACE_AT_ONCE, signal, async (item) => {
        update(item.id, {
          status: "tracing",
          svgs: {},
          error: null,
          activity: null,
          startedAt: stepStart(),
        });
        const failed = await streamFor(
          item.id,
          "/api/admin/word-images/trace",
          {
            wordId: item.id,
            characterIds,
            png: item.picture!.dataUrl.split(",")[1],
            svgModel: settings.models.svgModel,
          },
          signal,
        );
        update(item.id, (current) => ({
          status: "traced",
          chosen: autoChoose(current.svgs ?? {}),
          error: failed,
          activity: null,
        }));
      }),
    );

  // Stage 3: the chosen versions saved as the words' images.
  const toSave = items.filter(
    (item) => item.status === "traced" && choiceFor(item, item.chosen),
  );
  const saveChosen = () =>
    void run("save", async (signal) => {
      let saved = 0;
      let failed = 0;
      for (const item of toSave) {
        if (signal.aborted) break;
        const choice = choiceFor(item, item.chosen);
        if (!choice) continue;
        update(item.id, {
          status: "saving",
          activity: t("admin_batch_images.saving", "Saving…"),
        });
        const result = await chooseGeneratedWordImage(item.id, choice);
        if (result.error) {
          failed++;
          update(item.id, {
            status: "traced",
            error: result.error,
            activity: null,
          });
        } else {
          saved++;
          update(item.id, { status: "saved", error: null, activity: null });
        }
      }
      toast(
        t("admin_batch_images.saved", "Saved {{count}} pictures.", {
          count: saved,
        }),
      );
      router.refresh();
      // All saved: done with this batch. Any that failed keep the window
      // open, with the reason on their cards, to try again.
      if (!failed && !signal.aborted) {
        dialogRef.current?.close();
        setItems([]);
        onSaved?.();
      }
    });

  const stop = () => {
    abortRef.current?.abort();
    setRunning(null);
    setItems((current) =>
      current.map((item) =>
        item.status === "queued" || item.status === "drawing"
          ? {
              ...item,
              status: item.picture ? "drawn" : "failed",
              error: item.picture ? null : "Stopped.",
              activity: null,
            }
          : item.status === "tracing"
            ? {
                ...item,
                status: "traced",
                chosen: autoChoose(item.svgs ?? {}),
                activity: null,
              }
            : item,
      ),
    );
  };

  const close = () => {
    if (running) stop();
    dialogRef.current?.close();
  };

  const batchSize = Math.min(
    presetWords ? BATCH_MAX : limit,
    candidates?.length ?? 0,
  );
  const drawn = items.filter((item) => item.picture && item.status === "drawn");
  const undecided = drawn.filter((item) => item.approved === null).length;
  const drawCost = settings.imageCostFor(referenceImageCount(characterIds));
  const done = items.filter(
    (item) => item.status !== "queued" && item.status !== "drawing",
  ).length;

  return (
    <>
      <Button
        type="button"
        variant={presetWords ? "primary" : "outline"}
        size="sm"
        onClick={open}
        disabled={presetWords ? presetWords.length === 0 : decks.length === 0}
      >
        <Sparkles aria-hidden className="h-4 w-4" />
        {presetWords
          ? t(
              "admin_batch_images.button_selected",
              "Batch images ({{count}})",
              { count: presetWords.length },
            )
          : t("admin_batch_images.button", "Batch images")}
      </Button>

      <dialog
        ref={dialogRef}
        aria-label={t("admin_batch_images.title", "Batch images")}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-7xl overflow-y-auto rounded-3xl border border-card-border bg-washi p-0 text-left text-sm text-sumi shadow-2xl backdrop:bg-sumi/50"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-nunito text-lg font-extrabold">
              {t("admin_batch_images.title", "Batch images")}
            </h2>
            <SpendBadge settings={settings} />
            <button
              type="button"
              onClick={close}
              aria-label={t("common.close", "Close")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sumi-soft transition hover:bg-ghost-hover hover:text-sumi"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            {/* The settings, the same as one word's window. */}
            <div className="flex flex-col gap-3">
              {presetWords ? (
                <p className="text-xs text-sumi-soft">
                  {presetWords.length > BATCH_MAX
                    ? t(
                        "admin_batch_images.selected_over",
                        "{{count}} words selected — this batch draws the first {{batch}}.",
                        {
                          count: presetWords.length,
                          batch: BATCH_MAX,
                        },
                      )
                    : t(
                        "admin_batch_images.selected_count",
                        "{{count}} selected words.",
                        { count: presetWords.length },
                      )}
                </p>
              ) : (
                <>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-sumi-soft">
                    {t("admin_batch_images.deck", "Deck")}
                    <select
                      value={deckId}
                      onChange={(event) => {
                        setDeckId(event.target.value);
                        void loadWords(event.target.value, filter);
                      }}
                      disabled={running !== null}
                      className={SELECT_CLASS}
                    >
                      {decks.map((deck) => (
                        <option key={deck.id} value={deck.id}>
                          {deck.title}
                        </option>
                      ))}
                      <option value="all">
                        {t("admin_batch_images.all_decks", "All decks")}
                      </option>
                    </select>
                  </label>
                  <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2">
                    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-sumi-soft">
                      {t("admin_batch_images.words", "Words")}
                      <select
                        value={filter}
                        onChange={(event) => {
                          const next = event.target.value as WordFilter;
                          setFilter(next);
                          void loadWords(deckId, next);
                        }}
                        disabled={running !== null}
                        className={SELECT_CLASS}
                      >
                        <option value="missing">
                          {t(
                            "admin_batch_images.filter_missing",
                            "Without a picture",
                          )}
                        </option>
                        <option value="not-svg">
                          {t(
                            "admin_batch_images.filter_not_svg",
                            "Without an SVG picture",
                          )}
                        </option>
                        <option value="all">
                          {t("admin_batch_images.filter_all", "All words")}
                        </option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-sumi-soft">
                      {t("admin_batch_images.limit", "Up to")}
                      <input
                        type="number"
                        min={1}
                        max={BATCH_MAX}
                        value={limit}
                        onChange={(event) =>
                          setLimit(
                            Math.max(
                              1,
                              Math.min(
                                BATCH_MAX,
                                Math.round(Number(event.target.value)) || 1,
                              ),
                            ),
                          )
                        }
                        disabled={running !== null}
                        className={SELECT_CLASS}
                      />
                    </label>
                  </div>
                  <p className="-mt-1 text-xs text-sumi-soft">
                    {loadingWords || candidates === null
                      ? t("admin_batch_images.loading_words", "Finding words…")
                      : t(
                          "admin_batch_images.word_count",
                          "{{count}} words match — this batch draws {{batch}}.",
                          {
                            count: candidates.length,
                            batch: batchSize,
                          },
                        )}
                  </p>
                </>
              )}

              <CharacterPicker
                value={characterIds}
                onChange={setCharacterIds}
                disabled={running !== null}
              />
              {characterIds.length === 0 && (
                <FaceToggle value={face} onChange={setFace} disabled={running !== null} />
              )}
              {/* No custom scene: one description can't suit every word. */}
              <ScenePicker
                sceneId={sceneId}
                onSceneChange={setSceneId}
                customScene=""
                onCustomSceneChange={() => {}}
                disabled={running !== null}
                allowCustom={false}
              />
              <RecommendedModelsNote
                settings={settings}
                disabled={running !== null}
              />
              <ImageModelPicker
                settings={settings}
                disabled={running !== null}
                inputImages={referenceImageCount(characterIds)}
              />
              <SvgModelPicker settings={settings} disabled={running !== null} />

              <p className="rounded-xl border border-kin/40 bg-kin/10 px-3 py-2 text-xs text-sumi">
                {t(
                  "admin_batch_images.estimate",
                  "Pictures for {{count}} words ≈ {{pictures}}. SVGs for every approved one add ≈ {{svg}} each.",
                  {
                    count: batchSize,
                    pictures: settings.format(drawCost.usd * batchSize),
                    svg: settings.format(settings.svgCostEach.usd),
                  },
                )}
              </p>

              {running ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={stop}
                  className="w-fit border-shu/40 text-shu-dark hover:bg-shu/10"
                >
                  <Square aria-hidden className="h-3.5 w-3.5 fill-current" />
                  {t("admin_category_words.stop_generating", "Stop")}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={drawAll}
                  disabled={batchSize === 0 || loadingWords}
                  variant={items.length ? "outline" : "primary"}
                  className="w-fit"
                >
                  <Sparkles aria-hidden className="h-4 w-4" />
                  {t("admin_batch_images.draw", "Draw {{count}} pictures", {
                    count: batchSize,
                  })}
                </Button>
              )}
            </div>

            {/* The batch. */}
            <div className="flex min-w-0 flex-col gap-3">
              {items.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-card-border p-6 text-center text-xs text-sumi-soft">
                  <Sparkles aria-hidden className="h-6 w-6" />
                  {t(
                    "admin_batch_images.empty",
                    "Pick a deck and the settings, then draw. You'll approve each picture before any SVGs are made.",
                  )}
                </div>
              ) : (
                <>
                  <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-card-border bg-washi-soft px-3 py-2 text-xs">
                    <span className="mr-auto font-semibold text-sumi">
                      {running === "draw"
                        ? t(
                            "admin_batch_images.progress_drawing",
                            "Drawing — {{done}} of {{total}} done",
                            {
                              done,
                              total: items.length,
                            },
                          )
                        : running === "trace"
                          ? t(
                              "admin_batch_images.progress_tracing",
                              "Making SVGs…",
                            )
                          : running === "save"
                            ? t("admin_batch_images.progress_saving", "Saving…")
                            : t(
                                "admin_batch_images.progress_review",
                                "{{approved}} approved · {{undecided}} to check",
                                {
                                  approved: approved.length,
                                  undecided,
                                },
                              )}
                    </span>
                    {!running && undecided > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setItems((current) =>
                            current.map((item) =>
                              item.picture &&
                              item.status === "drawn" &&
                              item.approved === null
                                ? { ...item, approved: true }
                                : item,
                            ),
                          )
                        }
                      >
                        <ThumbsUp aria-hidden className="h-3.5 w-3.5" />
                        {t(
                          "admin_batch_images.approve_rest",
                          "Approve the rest",
                        )}
                      </Button>
                    )}
                    {!running && approved.length > 0 && (
                      <Button type="button" size="sm" onClick={traceApproved}>
                        <Shapes aria-hidden className="h-4 w-4" />
                        {t(
                          "admin_batch_images.make_svgs",
                          "Make SVGs for {{count}} approved",
                          {
                            count: approved.length,
                          },
                        )}
                      </Button>
                    )}
                    {!running && toSave.length > 0 && (
                      <Button type="button" size="sm" onClick={saveChosen}>
                        <Save aria-hidden className="h-4 w-4" />
                        {t("admin_batch_images.save", "Save {{count}} chosen", {
                          count: toSave.length,
                        })}
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {items.map((item) => (
                      <BatchCard
                        key={item.id}
                        item={item}
                        busy={running !== null}
                        onApprove={(value) =>
                          update(item.id, { approved: value })
                        }
                        onRedraw={() => redraw(item.id)}
                        onChoose={(key) => update(item.id, { chosen: key })}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
