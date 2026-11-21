"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Lightbulb,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Shapes,
  Sparkles,
  Square,
  ThumbsDown,
  Undo2,
  Wand2,
  X,
} from "lucide-react";
import { chooseGeneratedWordImage, suggestWordImagePrompts } from "@/lib/actions/word-media";
import {
  WORD_IMAGE_CHARACTERS,
  referenceImageCount,
  type WordImageCharacterId,
} from "@/lib/word-image-characters";
import { CUSTOM_SCENE_ID, CUSTOM_SCENE_MAX_CHARS, cleanCustomScene } from "@/lib/word-image-scenes";
import {
  GENERATED_IMAGE_MAX_BYTES,
  GENERATED_IMAGE_WARN_BYTES,
  type SvgResult,
  type WordImageEvent,
} from "@/lib/generated-word-image";
import type { WordImageIdea } from "@/lib/word-image-ideas";
import {
  CHECKERBOARD,
  CharacterPicker,
  FaceToggle,
  FullSizeHint,
  ImageModelPicker,
  LoadingPicture,
  RecommendedModelsNote,
  SpendBadge,
  SvgModelPicker,
  formatBytes,
  readStream,
  useWordImageSettings,
} from "@/components/admin/word-image-settings";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useTranslations } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

// How many words are worked on together.
const GROUP_SIZE = 3;

type AutoWord = { id: string; term: string };
type Picture = { dataUrl: string; bytes: number };

// One word in the current group. It moves prompt → drawn → traced → saved,
// with "drawing", "tracing" and "saving" while each step runs. `skipped`
// leaves it out of every step (and the save) without losing its place.
type Card = {
  id: string;
  term: string;
  ideas: WordImageIdea[] | null;
  ideasLoading: boolean;
  ideasError: string | null;
  showIdeas: boolean;
  scene: string;
  characterIds: WordImageCharacterId[];
  status: "prompt" | "drawing" | "drawn" | "tracing" | "traced" | "saving" | "saved";
  skipped: boolean;
  picture: Picture | null;
  svg: SvgResult | null;
  error: string | null;
  activity: string | null;
  startedAt: number | null;
};

function newCard(word: AutoWord): Card {
  return {
    ...word,
    ideas: null,
    ideasLoading: true,
    ideasError: null,
    showIdeas: false,
    scene: "",
    characterIds: [],
    status: "prompt",
    skipped: false,
    picture: null,
    svg: null,
    error: null,
    activity: null,
    startedAt: null,
  };
}

// The SVG that would be saved: made, and small enough to use.
function usableSvg(card: Card) {
  return card.svg?.ok && card.svg.bytes <= GENERATED_IMAGE_MAX_BYTES ? card.svg : null;
}

// When a card's step starts, for its timer — read when the step is kicked
// off, never during render.
function stepStart() {
  return Date.now();
}

// One word's card: its prompt (the scene and characters, from the first
// idea to start with, any of the others a click away, and editable), then
// its picture, then its SVG — each with what can be done at that point.
function AutoCard({
  card,
  busy,
  onChange,
  onPickIdea,
  onNewIdeas,
  onRedraw,
  onRetrace,
  onEditPrompt,
  onSkip,
}: {
  card: Card;
  busy: boolean;
  onChange: (change: Partial<Card>) => void;
  onPickIdea: (idea: WordImageIdea) => void;
  onNewIdeas: () => void;
  onRedraw: () => void;
  onRetrace: () => void;
  onEditPrompt: () => void;
  onSkip: () => void;
}) {
  const t = useTranslations();
  const working = card.status === "drawing" || card.status === "tracing" || card.status === "saving";
  const svg = card.svg?.ok ? card.svg : null;
  const shown = svg
    ? { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.svg)}`, label: "SVG", bytes: svg.bytes }
    : card.picture
      ? { src: card.picture.dataUrl, label: "PNG", bytes: card.picture.bytes }
      : null;
  const tooBig = svg ? svg.bytes > GENERATED_IMAGE_MAX_BYTES : false;
  const large = svg ? !tooBig && svg.bytes > GENERATED_IMAGE_WARN_BYTES : false;
  const characters = WORD_IMAGE_CHARACTERS.filter((character) => card.characterIds.includes(character.id));

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-2xl border-2 bg-washi p-3 transition",
        card.skipped
          ? "border-sumi/10 opacity-60"
          : card.status === "saved"
            ? "border-matcha/50"
            : card.status === "traced" && usableSvg(card)
              ? "border-ai/60"
              : "border-card-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate font-nunito text-base font-extrabold">{card.term}</h3>
        {card.status !== "saved" && (
          <button
            type="button"
            onClick={onSkip}
            disabled={busy || working}
            aria-pressed={card.skipped}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-60",
              card.skipped
                ? "border-sumi/15 text-sumi hover:border-ai/50"
                : "border-sumi/15 text-sumi-soft hover:border-shu/40 hover:text-shu-dark",
            )}
          >
            {card.skipped ? <Undo2 aria-hidden className="h-3 w-3" /> : <ThumbsDown aria-hidden className="h-3 w-3" />}
            {card.skipped
              ? t("admin_auto_images.unskip", "Include")
              : t("admin_auto_images.skip", "Skip word")}
          </button>
        )}
      </div>

      {card.status === "prompt" ? (
        // Step 1: the prompt.
        <div className="flex flex-col gap-2.5">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-sumi-soft">
            {t("admin_auto_images.prompt", "Prompt")}
            <textarea
              value={card.scene}
              onChange={(event) => onChange({ scene: event.target.value })}
              disabled={busy || card.skipped}
              rows={3}
              maxLength={CUSTOM_SCENE_MAX_CHARS}
              placeholder={
                card.ideasLoading
                  ? t("admin_auto_images.prompt_loading", "Coming up with ideas…")
                  : t("admin_auto_images.prompt_placeholder", "Describe the picture, or leave empty for the best fit")
              }
              className="resize-y rounded-xl border border-sumi/15 bg-washi px-3 py-2 text-sm font-normal text-sumi outline-none focus:border-ai focus:ring-2 focus:ring-ai-soft disabled:opacity-60"
            />
          </label>
          {card.ideasError && <p className="text-[11px] font-semibold text-shu-dark">{card.ideasError}</p>}

          <CharacterPicker
            value={card.characterIds}
            onChange={(characterIds) => onChange({ characterIds })}
            disabled={busy || card.skipped}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ showIdeas: !card.showIdeas })}
              disabled={!card.ideas?.length || card.skipped}
              aria-expanded={card.showIdeas}
              className="inline-flex items-center gap-1 rounded-full border border-sumi/15 px-2.5 py-1 text-[11px] font-semibold text-sumi transition hover:border-ai/50 disabled:opacity-60"
            >
              {card.ideasLoading ? (
                <Loader2 aria-hidden className="h-3 w-3 animate-spin" />
              ) : (
                <Lightbulb aria-hidden className="h-3 w-3" />
              )}
              {t("admin_auto_images.other_ideas", "Other ideas ({{count}})", { count: card.ideas?.length ?? 0 })}
              <ChevronDown aria-hidden className={cn("h-3 w-3 transition", card.showIdeas && "rotate-180")} />
            </button>
            <button
              type="button"
              onClick={onNewIdeas}
              disabled={busy || card.ideasLoading || card.skipped}
              className="inline-flex items-center gap-1 rounded-full border border-sumi/15 px-2.5 py-1 text-[11px] font-semibold text-sumi-soft transition hover:border-ai/50 hover:text-sumi disabled:opacity-60"
            >
              <RefreshCw aria-hidden className="h-3 w-3" />
              {t("admin_auto_images.new_ideas", "New ideas")}
            </button>
          </div>

          {card.showIdeas && card.ideas && (
            <ul className="flex max-h-60 flex-col gap-1.5 overflow-y-auto pr-1">
              {card.ideas.map((idea) => {
                const ideaCharacters = WORD_IMAGE_CHARACTERS.filter((character) =>
                  idea.characterIds.includes(character.id),
                );
                const active = idea.scene === cleanCustomScene(card.scene);
                return (
                  <li key={idea.scene}>
                    <button
                      type="button"
                      onClick={() => onPickIdea(idea)}
                      disabled={busy}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full flex-col gap-1 rounded-xl border px-3 py-2 text-left text-xs transition disabled:opacity-60",
                        active ? "border-ai bg-ai-soft text-ai-dark" : "border-sumi/15 bg-washi text-sumi hover:border-ai/40",
                      )}
                    >
                      <span className="leading-snug">{idea.scene}</span>
                      <span className="text-[11px] font-semibold text-sumi-soft">
                        {ideaCharacters.length
                          ? ideaCharacters.map((character) => character.name).join(", ")
                          : t("admin_category_words.prompt_ideas_none", "No characters")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        // Steps 2–3: the picture, then its SVG.
        <>
          <div
            style={shown ? CHECKERBOARD : undefined}
            className="relative aspect-square w-full overflow-hidden rounded-xl border border-card-border bg-washi-soft"
          >
            {shown ? (
              <ImageLightbox
                src={shown.src}
                alt={`${card.term} — ${shown.label}`}
                className="group block h-full w-full"
                inspect
                backgroundStyle={CHECKERBOARD}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a data URL, not a hosted file. */}
                <img src={shown.src} alt={`${card.term} — ${shown.label}`} className="h-full w-full object-contain" />
                {!working && <FullSizeHint label={t("admin_batch_images.full_size", "Full size")} />}
              </ImageLightbox>
            ) : card.status === "drawing" ? (
              <LoadingPicture
                label={t("admin_batch_images.drawing", "Drawing…")}
                activity={card.activity}
                startedAt={card.startedAt}
                compact
              />
            ) : (
              <p className="flex h-full items-center justify-center p-3 text-center text-xs text-shu-dark">
                {card.error ?? t("admin_auto_images.no_picture", "No picture yet.")}
              </p>
            )}
            {working && shown && (
              <LoadingPicture
                label={
                  card.status === "tracing"
                    ? t("admin_batch_images.making_svgs", "Making SVGs…")
                    : card.status === "saving"
                      ? t("admin_batch_images.saving", "Saving…")
                      : t("admin_batch_images.drawing", "Drawing…")
                }
                activity={card.activity}
                startedAt={card.status === "saving" ? null : card.startedAt}
                overlay
                compact
              />
            )}
            {shown && !working && card.status !== "saved" && (
              <span
                className={cn(
                  "pointer-events-none absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-washi/90 px-2 py-0.5 text-[10px] font-semibold shadow-sm",
                  tooBig ? "text-shu-dark" : large ? "text-acorn" : "text-sumi",
                )}
              >
                {large && <AlertTriangle aria-hidden className="h-2.5 w-2.5" />}
                {shown.label} · {formatBytes(shown.bytes)}
              </span>
            )}
            {card.status === "saved" && (
              <span className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-matcha text-washi">
                <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            )}
          </div>

          {card.error && shown && !working && <p className="text-[11px] text-shu-dark">{card.error}</p>}
          {tooBig && !working && (
            <p className="text-[11px] text-shu-dark">
              {t("admin_auto_images.too_big", "Too big to use — redo the SVG or redraw the picture.")}
            </p>
          )}

          <p className="line-clamp-2 text-[11px] text-sumi-soft" title={card.scene}>
            {card.scene || t("admin_auto_images.best_fit", "Best fit")}
            {characters.length > 0 && ` · ${characters.map((character) => character.name).join(", ")}`}
          </p>

          {card.status !== "saved" && !working && !card.skipped && (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={onEditPrompt}
                disabled={busy}
                className="flex items-center gap-1 rounded-full border border-sumi/15 px-2.5 py-1 text-[11px] font-semibold text-sumi transition hover:border-ai/50 disabled:opacity-60"
              >
                <Pencil aria-hidden className="h-3 w-3" />
                {t("admin_auto_images.edit_prompt", "Edit prompt")}
              </button>
              <button
                type="button"
                onClick={onRedraw}
                disabled={busy}
                className="flex items-center gap-1 rounded-full border border-sumi/15 px-2.5 py-1 text-[11px] font-semibold text-sumi transition hover:border-ai/50 disabled:opacity-60"
              >
                <RefreshCw aria-hidden className="h-3 w-3" />
                {t("admin_batch_images.redraw", "Redraw")}
              </button>
              {card.status === "traced" && card.picture && (
                <button
                  type="button"
                  onClick={onRetrace}
                  disabled={busy}
                  className="flex items-center gap-1 rounded-full border border-sumi/15 px-2.5 py-1 text-[11px] font-semibold text-sumi transition hover:border-ai/50 disabled:opacity-60"
                >
                  <Shapes aria-hidden className="h-3 w-3" />
                  {t("admin_batch_images.redo_svg", "Redo SVG")}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}

// On the admin deck page: works through the words the list is showing,
// top to bottom, three at a time. For each three: a prompt for each (the
// first of ten ideas, any of the others a click away, or the admin's own),
// then — once they're happy — the pictures, then the SVGs, then the save,
// which moves on to the next three. Any word can be skipped, and any
// picture or SVG redone, before moving on. Closing keeps the place.
export function AutoWordImages({ words }: { words: AutoWord[] }) {
  const t = useTranslations();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const settings = useWordImageSettings();

  // The words when the run started, so saving (which drops a word from a
  // "Missing image" list) doesn't shift the run's place.
  const [queue, setQueue] = useState<AutoWord[] | null>(null);
  const [groupStart, setGroupStart] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [running, setRunning] = useState<"draw" | "trace" | "save" | null>(null);
  const [face, setFace] = useState(true);
  const [noCharacters, setNoCharacters] = useState(false);

  // Stop the server's work when the page goes.
  useEffect(() => () => abortRef.current?.abort(), []);

  const update = (id: string, change: Partial<Card> | ((card: Card) => Partial<Card>)) =>
    setCards((current) =>
      current.map((card) =>
        card.id === id ? { ...card, ...(typeof change === "function" ? change(card) : change) } : card,
      ),
    );

  // Ten ideas for a word, the first put in as its prompt (with its
  // characters) unless the prompt's already been written.
  const fetchIdeas = async (id: string, replacePrompt: boolean) => {
    update(id, { ideasLoading: true, ideasError: null });
    const result = await suggestWordImagePrompts(id, noCharacters);
    if ("error" in result) {
      update(id, { ideasLoading: false, ideasError: result.error });
      return;
    }
    settings.recordCost({ type: "cost", usd: result.usd, estimateKey: "ideas" });
    const [first] = result.ideas;
    update(id, (card) => ({
      ideas: result.ideas,
      ideasLoading: false,
      ...(first && (replacePrompt || !card.scene.trim())
        ? { scene: first.scene, characterIds: first.characterIds }
        : {}),
    }));
  };

  const startGroup = (list: AutoWord[], start: number) => {
    const group = list.slice(start, start + GROUP_SIZE);
    setGroupStart(start);
    setCards(group.map(newCard));
    for (const word of group) void fetchIdeas(word.id, true);
  };

  const begin = () => {
    abortRef.current?.abort();
    setRunning(null);
    setQueue(words);
    startGroup(words, 0);
  };

  const open = () => {
    settings.open();
    dialogRef.current?.showModal();
    if (!queue) begin();
  };

  // One word's stream, its events fed into its card.
  const streamFor = async (id: string, url: string, body: object, signal: AbortSignal) => {
    let failed: string | null = null;
    try {
      await readStream(url, body, signal, (event: WordImageEvent) => {
        switch (event.type) {
          case "log":
            update(id, { activity: event.message });
            break;
          case "png":
            update(id, { picture: { dataUrl: event.dataUrl, bytes: event.bytes } });
            break;
          case "svg":
            update(id, { svg: event.result });
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
      failed = signal.aborted ? "Stopped." : caught instanceof Error ? caught.message : "Something went wrong.";
    }
    return failed;
  };

  const run = async (step: "draw" | "trace" | "save", work: (signal: AbortSignal) => Promise<void>) => {
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

  const draw = async (card: Card, signal: AbortSignal) => {
    const scene = cleanCustomScene(card.scene);
    update(card.id, {
      status: "drawing",
      picture: null,
      svg: null,
      error: null,
      activity: null,
      startedAt: stepStart(),
      showIdeas: false,
    });
    const failed = await streamFor(
      card.id,
      "/api/admin/word-images/generate",
      {
        wordId: card.id,
        characterIds: card.characterIds,
        sceneId: scene ? CUSTOM_SCENE_ID : "auto",
        customScene: scene || undefined,
        face,
        imageModel: settings.models.imageModel,
        quality: settings.models.quality,
      },
      signal,
    );
    update(card.id, (current) =>
      current.picture
        ? { status: "drawn", error: failed, activity: null }
        : { status: "drawn", error: failed ?? "No picture came back.", activity: null },
    );
  };

  const trace = async (card: Card, signal: AbortSignal) => {
    if (!card.picture) return;
    update(card.id, { status: "tracing", svg: null, error: null, activity: null, startedAt: stepStart() });
    const failed = await streamFor(
      card.id,
      "/api/admin/word-images/trace",
      {
        wordId: card.id,
        characterIds: card.characterIds,
        png: card.picture.dataUrl.split(",")[1],
        svgModel: settings.models.svgModel,
      },
      signal,
    );
    update(card.id, (current) => ({
      status: "traced",
      error: failed ?? (current.svg && !current.svg.ok ? current.svg.error : null),
      activity: null,
    }));
  };

  const active = cards.filter((card) => !card.skipped && card.status !== "saved");
  const toDraw = active.filter((card) => card.status === "prompt");
  const toTrace = active.filter((card) => card.status === "drawn" && card.picture);
  const toSave = active.filter((card) => card.status === "traced" && usableSvg(card));
  // Pictures that haven't come out yet (failed draws, SVGs that failed or
  // are too big) hold up the save until they're redone or skipped.
  const stuck = active.filter(
    (card) => (card.status === "drawn" && !card.picture) || (card.status === "traced" && !usableSvg(card)),
  );
  const ideasLoading = toDraw.some((card) => card.ideasLoading);

  const drawAll = () => void run("draw", (signal) => Promise.all(toDraw.map((card) => draw(card, signal))).then(() => {}));
  const traceAll = () =>
    void run("trace", (signal) => Promise.all(toTrace.map((card) => trace(card, signal))).then(() => {}));
  const redraw = (card: Card) => void run("draw", (signal) => draw(card, signal));
  const retrace = (card: Card) => void run("trace", (signal) => trace(card, signal));

  const nextStart = groupStart + GROUP_SIZE;
  const hasNext = queue !== null && nextStart < queue.length;

  // Saves this group's SVGs, then moves on to the next three — unless a
  // save failed, which stays on its card to try again.
  const saveAndNext = () =>
    void run("save", async (signal) => {
      let failed = 0;
      for (const card of toSave) {
        if (signal.aborted) return;
        const svg = usableSvg(card);
        if (!svg) continue;
        update(card.id, { status: "saving", activity: t("admin_batch_images.saving", "Saving…") });
        const result = await chooseGeneratedWordImage(card.id, { type: "image/svg+xml", svg: svg.svg });
        if (result.error) {
          failed++;
          update(card.id, { status: "traced", error: result.error, activity: null });
        } else {
          update(card.id, { status: "saved", error: null, activity: null });
        }
      }
      if (toSave.length) router.refresh();
      if (failed || signal.aborted) return;
      if (toSave.length) {
        toast(t("admin_batch_images.saved", "Saved {{count}} pictures.", { count: toSave.length }));
      }
      if (queue && hasNext) startGroup(queue, nextStart);
      else setGroupStart(queue?.length ?? 0);
    });

  const stop = () => {
    abortRef.current?.abort();
    setRunning(null);
    setCards((current) =>
      current.map((card) =>
        card.status === "drawing"
          ? { ...card, status: "drawn", error: card.picture ? null : "Stopped.", activity: null }
          : card.status === "tracing"
            ? { ...card, status: "traced", error: card.svg?.ok ? null : "Stopped.", activity: null }
            : card.status === "saving"
              ? { ...card, status: "traced", activity: null }
              : card,
      ),
    );
  };

  const close = () => {
    if (running) stop();
    dialogRef.current?.close();
  };

  const finished = queue !== null && groupStart >= queue.length;
  const total = queue?.length ?? 0;
  const groupEnd = Math.min(groupStart + GROUP_SIZE, total);
  const drawCost = toDraw.reduce(
    (sum, card) => sum + settings.imageCostFor(referenceImageCount(card.characterIds)).usd,
    0,
  );
  const maxReferences = Math.max(1, ...cards.map((card) => referenceImageCount(card.characterIds)));

  // The group's next step, as one button.
  const nextAction = toDraw.length
    ? {
        label: t("admin_auto_images.draw", "Draw {{count}} pictures", { count: toDraw.length }),
        Icon: Sparkles,
        action: "draw" as const,
        disabled: ideasLoading,
        note: t("admin_auto_images.draw_cost", "≈ {{cost}}", { cost: settings.format(drawCost) }),
      }
    : toTrace.length
      ? {
          label: t("admin_auto_images.make_svgs", "Make {{count}} SVGs", { count: toTrace.length }),
          Icon: Shapes,
          action: "trace" as const,
          disabled: false,
          note: t("admin_auto_images.draw_cost", "≈ {{cost}}", {
            cost: settings.format(settings.svgCostEach.usd * toTrace.length),
          }),
        }
      : {
          label: hasNext
            ? toSave.length
              ? t("admin_auto_images.save_next", "Save {{count}} & next", { count: toSave.length })
              : t("admin_auto_images.next", "Next {{count}} words", { count: Math.min(GROUP_SIZE, total - nextStart) })
            : toSave.length
              ? t("admin_auto_images.save_finish", "Save {{count}} & finish", { count: toSave.length })
              : t("admin_auto_images.finish", "Finish"),
          Icon: hasNext ? ArrowRight : Save,
          action: "save" as const,
          disabled: stuck.length > 0,
          note: stuck.length
            ? t("admin_auto_images.stuck", "Redo or skip the words without a usable picture first.")
            : null,
        };

  const step = toDraw.length ? 1 : toTrace.length ? 2 : 3;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={open} disabled={words.length === 0 && !queue}>
        <Wand2 aria-hidden className="h-4 w-4" />
        {t("admin_auto_images.button", "Auto images ({{count}})", { count: words.length })}
      </Button>

      <dialog
        ref={dialogRef}
        aria-label={t("admin_auto_images.title", "Auto images")}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-7xl overflow-y-auto rounded-3xl border border-card-border bg-washi p-0 text-left text-sm text-sumi shadow-2xl backdrop:bg-sumi/50"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-nunito text-lg font-extrabold">{t("admin_auto_images.title", "Auto images")}</h2>
              <p className="text-xs text-sumi-soft">
                {finished
                  ? t("admin_auto_images.done_summary", "All {{total}} words done.", { total })
                  : t("admin_auto_images.progress", "Words {{from}}–{{to}} of {{total}}", {
                      from: groupStart + 1,
                      to: groupEnd,
                      total,
                    })}
              </p>
            </div>
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

          <div className="grid gap-5 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            {/* The settings, for every group. */}
            <div className="flex flex-col gap-3">
              <label className="flex w-fit cursor-pointer items-center gap-2 text-xs font-semibold text-sumi has-disabled:cursor-not-allowed has-disabled:opacity-60">
                <input
                  type="checkbox"
                  role="switch"
                  checked={noCharacters}
                  onChange={(event) => setNoCharacters(event.target.checked)}
                  disabled={running !== null}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="relative h-5 w-9 shrink-0 rounded-full bg-sumi/20 transition peer-checked:bg-ai peer-focus-visible:ring-2 peer-focus-visible:ring-ai-soft after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-washi after:shadow-sm after:transition peer-checked:after:translate-x-4"
                />
                {t("admin_auto_images.ideas_no_characters", "Ideas without characters")}
              </label>
              <FaceToggle value={face} onChange={setFace} disabled={running !== null} />
              <p className="-mt-1.5 text-[11px] text-sumi-soft">
                {t("admin_auto_images.face_note", "For pictures with no characters.")}
              </p>
              <RecommendedModelsNote settings={settings} disabled={running !== null} />
              <ImageModelPicker settings={settings} disabled={running !== null} inputImages={maxReferences} />
              <SvgModelPicker settings={settings} disabled={running !== null} />
              <button
                type="button"
                onClick={begin}
                disabled={running !== null || words.length === 0}
                className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-sumi-soft underline-offset-2 transition hover:text-sumi hover:underline disabled:opacity-60"
              >
                <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                {t("admin_auto_images.restart", "Start again from the top ({{count}})", { count: words.length })}
              </button>
            </div>

            {/* The current three. */}
            <div className="flex min-w-0 flex-col gap-3">
              {finished ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-card-border p-6 text-center text-sm text-sumi-soft">
                  <Check aria-hidden className="h-6 w-6 text-matcha-dark" />
                  {t("admin_auto_images.done", "That's every word. Close this, or start again from the top.")}
                </div>
              ) : (
                <>
                  <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-card-border bg-washi-soft px-3 py-2 text-xs">
                    <ol className="mr-auto flex flex-wrap items-center gap-1.5 font-semibold">
                      {[
                        t("admin_auto_images.step_prompt", "Prompts"),
                        t("admin_auto_images.step_picture", "Pictures"),
                        t("admin_auto_images.step_svg", "SVGs & save"),
                      ].map((label, index) => (
                        <li
                          key={label}
                          className={cn(
                            "rounded-full px-2.5 py-1",
                            index + 1 === step
                              ? "bg-ai text-washi"
                              : index + 1 < step
                                ? "bg-ai-soft text-ai-dark"
                                : "bg-neutral-soft text-sumi-soft",
                          )}
                        >
                          {index + 1}. {label}
                        </li>
                      ))}
                    </ol>
                    {nextAction.note && <span className="text-sumi-soft">{nextAction.note}</span>}
                    {running ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={stop}
                        className="border-shu/40 text-shu-dark hover:bg-shu/10"
                      >
                        <Square aria-hidden className="h-3.5 w-3.5 fill-current" />
                        {t("admin_category_words.stop_generating", "Stop")}
                      </Button>
                    ) : (
                      <Button type="button" size="sm" onClick={() => (nextAction.action === "draw" ? drawAll() : nextAction.action === "trace" ? traceAll() : saveAndNext())} disabled={nextAction.disabled}>
                        <nextAction.Icon aria-hidden className="h-4 w-4" />
                        {nextAction.label}
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {cards.map((card) => (
                      <AutoCard
                        key={card.id}
                        card={card}
                        busy={running !== null}
                        onChange={(change) => update(card.id, change)}
                        onPickIdea={(idea) =>
                          update(card.id, { scene: idea.scene, characterIds: idea.characterIds, showIdeas: false })
                        }
                        onNewIdeas={() => void fetchIdeas(card.id, true)}
                        onRedraw={() => redraw(card)}
                        onRetrace={() => retrace(card)}
                        onEditPrompt={() =>
                          update(card.id, { status: "prompt", picture: null, svg: null, error: null })
                        }
                        onSkip={() => update(card.id, { skipped: !card.skipped })}
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
