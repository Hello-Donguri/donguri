"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  Download,
  Undo2,
  Loader2,
  Pencil,
  RefreshCw,
  Shapes,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { chooseGeneratedWordImage } from "@/lib/actions/word-media";
import { referenceImageCount, type WordImageCharacterId } from "@/lib/word-image-characters";
import { CUSTOM_SCENE_ID, cleanCustomScene } from "@/lib/word-image-scenes";
import {
  EDIT_INSTRUCTION_MAX_CHARS,
  GENERATED_IMAGE_MAX_BYTES,
  cleanEditInstruction,
  GENERATED_IMAGE_WARN_BYTES,
  SVG_OPTIONS,
  type SvgOptionKey,
  type SvgResult,
  type WordImageEvent,
} from "@/lib/generated-word-image";
import {
  CHECKERBOARD,
  CharacterPicker,
  CostEstimate,
  ImageModelPicker,
  RecommendedModelsNote,
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

type Choice = Parameters<typeof chooseGeneratedWordImage>[1];
type LogLine = Extract<WordImageEvent, { type: "log" }>;
type Step = "picture" | "svgs";

// One result in the side-by-side: still working, failed, or ready to be
// chosen (unless it's too big).
type Option = {
  key: string;
  label: string;
  pending: boolean;
  src: string | null;
  filename: string;
  bytes: number | null;
  detail: string | null;
  error?: string;
  choice: Choice | null;
};

function formatElapsed(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

// A result's thumbnail (opens full size), its size — gold over the warning
// size, red over the maximum — and a download. Selectable unless it's
// still working, failed, or is over the maximum.
function OptionTile({
  option,
  selected,
  onSelect,
}: {
  option: Option;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations();
  const tooBig = option.bytes !== null && option.bytes > GENERATED_IMAGE_MAX_BYTES;
  const large = !tooBig && option.bytes !== null && option.bytes > GENERATED_IMAGE_WARN_BYTES;
  const selectable = option.choice !== null && !tooBig;

  return (
    <figure
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-lg border-2 p-1 transition",
        selected ? "border-ai bg-ai-soft" : "border-transparent",
      )}
    >
      {option.src ? (
        <ImageLightbox src={option.src} alt={option.label}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a data URL, not a hosted file. */}
          <img
            src={option.src}
            alt={option.label}
            style={CHECKERBOARD}
            className={cn(
              "aspect-square w-full rounded-md border border-card-border object-contain",
              tooBig && "opacity-60",
            )}
          />
        </ImageLightbox>
      ) : option.pending ? (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-card-border bg-washi-soft text-[10px] text-sumi-soft">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          {t("admin_category_words.option_working", "Working…")}
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-shu/50 bg-shu/5 p-1 text-center text-[10px] text-shu-dark">
          {option.error}
        </div>
      )}
      <figcaption className="flex min-w-0 flex-col gap-0.5 text-[11px] leading-tight">
        <span className="flex items-center justify-between gap-1 font-semibold text-sumi">
          <span className="truncate">{option.label}</span>
          {option.src && (
            <a
              href={option.src}
              download={option.filename}
              aria-label={t("admin_category_words.download_option", "Download {{label}}", { label: option.label })}
              className="shrink-0 text-ai hover:text-ai-dark"
            >
              <Download aria-hidden className="h-3.5 w-3.5" />
            </a>
          )}
        </span>
        {option.bytes !== null && (
          <span
            className={cn(
              "flex items-center gap-1 font-semibold",
              tooBig ? "text-shu-dark" : large ? "text-acorn" : "text-matcha-dark",
            )}
          >
            {tooBig && <Ban aria-hidden className="h-3 w-3 shrink-0" />}
            {large && <AlertTriangle aria-hidden className="h-3 w-3 shrink-0" />}
            {formatBytes(option.bytes)}
          </span>
        )}
        {option.detail && <span className="truncate text-sumi-soft">{option.detail}</span>}
      </figcaption>
      {option.choice && (
        <button
          type="button"
          onClick={onSelect}
          disabled={!selectable}
          title={
            tooBig
              ? t("admin_category_words.option_too_big", "Over {{max}}KB — too big to use", {
                  max: GENERATED_IMAGE_MAX_BYTES / 1024,
                })
              : undefined
          }
          className={cn(
            "mt-auto rounded-full border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed",
            selected
              ? "border-ai bg-ai text-washi"
              : "border-sumi/15 bg-washi text-sumi hover:border-ai/50 disabled:text-sumi-soft/60 disabled:hover:border-sumi/15",
          )}
        >
          {tooBig
            ? t("admin_category_words.option_too_big_short", "Too big")
            : selected
              ? t("admin_category_words.option_selected", "Selected")
              : t("admin_category_words.option_select", "Select")}
        </button>
      )}
    </figure>
  );
}

const LEVEL_CLASS: Record<LogLine["level"], string> = {
  info: "text-sumi-soft",
  start: "text-ai-dark",
  done: "text-matcha-dark",
  warn: "text-acorn",
  error: "text-shu-dark",
};

// The log of everything so far, newest at the bottom and kept scrolled
// there: each line's time since its step started, where it came from and
// what happened. While a step is running, a ticking clock and which parts
// of it are still going.
function RunLog({
  log,
  running,
  startedAt,
  status,
}: {
  log: LogLine[];
  running: boolean;
  startedAt: number | null;
  status: string;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [log.length, open]);

  // Which parts of the current step have started but not finished — only
  // the lines since that step's own "Setup".
  const lastSetup = log.findLastIndex((line) => line.source === "Setup");
  const current = log.slice(Math.max(lastSetup, 0));
  const finished = new Set(
    current.filter((line) => line.level === "done" || line.level === "error").map((line) => line.source),
  );
  const stillRunning = [
    ...new Set(current.filter((line) => line.level === "start" && !finished.has(line.source)).map((line) => line.source)),
  ];

  return (
    <div className="rounded-lg border border-card-border bg-washi-soft text-[11px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 font-semibold text-sumi"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {running && <Loader2 aria-hidden className="h-3.5 w-3.5 shrink-0 animate-spin text-ai" />}
          <span className="truncate">
            {running && stillRunning.length
              ? t("admin_category_words.log_running", "Running: {{steps}}", { steps: stillRunning.join(", ") })
              : status}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 tabular-nums text-sumi-soft">
          {startedAt !== null && running && formatElapsed(now - startedAt)}
          <ChevronDown aria-hidden className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
        </span>
      </button>
      {open && log.length > 0 && (
        <ol
          ref={listRef}
          className="max-h-48 overflow-y-auto border-t border-card-border px-2.5 py-1.5 font-mono leading-relaxed"
        >
          {log.map((line, index) => (
            <li key={index} className={cn("flex gap-2", LEVEL_CLASS[line.level])}>
              <span className="shrink-0 tabular-nums text-sumi-soft/70">{formatElapsed(line.at).padStart(6)}</span>
              <span className="min-w-0 wrap-break-word">
                <span className="font-semibold">{line.source}</span> {line.message}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// On the admin deck page: a button that opens a window for making the
// word's picture, in two steps. First the picture itself — a small PNG
// with whichever characters are ticked, framed by the chosen scene (see
// generateWordPicture) — redrawn until it's right. Then, on request, SVGs
// made from it several ways (see traceWordPicture), each shown the moment
// it's ready. Both steps show a running log and can be stopped, keeping
// whatever's already arrived. Any result under the size limit can be
// selected and set as the word's image (see chooseGeneratedWordImage),
// with a warning first when it's over the warning size.
export function GenerateWordImage({ wordId, term }: { wordId: string; term: string }) {
  const t = useTranslations();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [characterIds, setCharacterIds] = useState<WordImageCharacterId[]>([]);
  const [sceneId, setSceneId] = useState<SceneChoice>("auto");
  const [customScene, setCustomScene] = useState("");
  const needsCustomScene = sceneId === CUSTOM_SCENE_ID && !cleanCustomScene(customScene);
  const [png, setPng] = useState<{ dataUrl: string; bytes: number } | null>(null);
  // The picture from before the last edit, to go back to if the edit made
  // it worse.
  const [beforeEdit, setBeforeEdit] = useState<{ dataUrl: string; bytes: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [svgs, setSvgs] = useState<Partial<Record<SvgOptionKey, SvgResult>> | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [running, setRunning] = useState<Step | null>(null);
  const [stopped, setStopped] = useState<Step | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const settings = useWordImageSettings();
  const { models } = settings;

  const open = () => {
    settings.open();
    dialogRef.current?.showModal();
  };

  // Stop listening (and so stop the server's work) when the card goes.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Runs one step's stream, feeding its events into the window.
  const runStep = async (step: Step, url: string, body: object) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(step);
    setStopped(null);
    setError(null);
    setStartedAt(Date.now());
    setSelectedKey(null);

    try {
      await readStream(url, body, controller.signal, (event) => {
        switch (event.type) {
          case "log":
            setLog((current) => [...current, event]);
            break;
          case "png":
            setPng({ dataUrl: event.dataUrl, bytes: event.bytes });
            break;
          case "svg":
            setSvgs((current) => ({ ...current, [event.key]: event.result }));
            break;
          case "cost":
            settings.recordCost(event);
            break;
          case "end":
            if (!event.ok) setError(event.error ?? "Something went wrong.");
            break;
        }
      });
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      if (abortRef.current === controller) setRunning(null);
    }
  };

  const drawPicture = () => {
    setPng(null);
    setBeforeEdit(null);
    setEditing(false);
    setSvgs(null);
    setLog([]);
    void runStep("picture", "/api/admin/word-images/generate", {
      wordId,
      characterIds,
      sceneId,
      customScene: sceneId === CUSTOM_SCENE_ID ? cleanCustomScene(customScene) : undefined,
      imageModel: models.imageModel,
      quality: models.quality,
    });
  };

  // Sends the current picture back with the admin's change, keeping it on
  // screen until the edited one arrives (and if it's stopped, for good).
  const editPicture = () => {
    const change = cleanEditInstruction(instruction);
    if (!png || !change) return;
    setBeforeEdit(png);
    setSvgs(null);
    setLog([]);
    setEditing(false);
    void runStep("picture", "/api/admin/word-images/edit", {
      wordId,
      characterIds,
      png: png.dataUrl.split(",")[1],
      instruction: change,
      imageModel: models.imageModel,
      quality: models.quality,
    });
  };

  const undoEdit = () => {
    if (!beforeEdit) return;
    setPng(beforeEdit);
    setBeforeEdit(null);
    setSvgs(null);
    setSelectedKey(null);
  };

  const makeSvgs = () => {
    if (!png) return;
    setSvgs({});
    void runStep("svgs", "/api/admin/word-images/trace", {
      wordId,
      characterIds,
      png: png.dataUrl.split(",")[1],
      svgModel: models.svgModel,
    });
  };

  // Stops the step where it is: the request is cancelled, which stops the
  // server's work still in progress, and everything that's already come
  // back stays.
  const stop = () => {
    if (!running) return;
    abortRef.current?.abort();
    setStopped(running);
    setRunning(null);
    setLog((current) => [
      ...current,
      {
        type: "log",
        at: startedAt === null ? 0 : Date.now() - startedAt,
        level: "warn",
        source: "Stop",
        message: "Stopped — cancelled everything still running and kept what had finished",
      },
    ]);
  };

  const close = () => {
    stop();
    dialogRef.current?.close();
  };

  const options: Option[] = [];
  if (png && svgs) {
    options.push({
      key: "png",
      label: "PNG",
      pending: false,
      src: png.dataUrl,
      filename: `${term}.png`,
      bytes: png.bytes,
      detail: null,
      choice: { type: "image/png", base64: png.dataUrl.split(",")[1] },
    });
    for (const { key, label } of SVG_OPTIONS) {
      const result = svgs[key];
      const base = { key, label, filename: `${term}-${key}.svg`, detail: null, bytes: null, src: null, choice: null };
      if (!result) {
        options.push({
          ...base,
          pending: running === "svgs",
          error: running === "svgs" ? undefined : stopped === "svgs" ? "Stopped." : "Didn't finish.",
        });
      } else if (!result.ok) {
        options.push({ ...base, pending: false, error: result.error });
      } else {
        options.push({
          ...base,
          pending: false,
          src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`,
          bytes: result.bytes,
          detail: `${result.paths} paths · ${formatElapsed(result.ms)}`,
          choice: { type: "image/svg+xml", svg: result.svg },
        });
      }
    }
  }
  const selected = options.find((option) => option.key === selectedKey) ?? null;
  const selectedIsLarge = selected?.bytes != null && selected.bytes > GENERATED_IMAGE_WARN_BYTES;

  const status = error
    ? t("admin_category_words.log_failed", "Failed")
    : stopped
      ? t("admin_category_words.log_stopped", "Stopped — kept what had finished")
      : running === "picture"
        ? t("admin_category_words.log_drawing", "Drawing the picture…")
        : running === "svgs"
          ? t("admin_category_words.log_starting", "Starting…")
          : svgs
            ? t("admin_category_words.log_svgs_done", "SVGs finished")
            : png
              ? t("admin_category_words.log_picture_done", "Picture ready — redraw it, or make SVGs from it")
              : t("admin_category_words.log_idle", "Choose the characters and a scene, then draw the picture");

  const useSelected = () => {
    if (!selected?.choice) return;
    const choice = selected.choice;
    startSaving(async () => {
      const result = await chooseGeneratedWordImage(wordId, choice);
      if (result.error) {
        toast({ title: result.error, tone: "error" });
        return;
      }
      toast(t("admin_category_words.generated_saved", "Saved as {{term}}'s image.", { term }));
      setSvgs(null);
      setSelectedKey(null);
      dialogRef.current?.close();
    });
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={open} className="w-fit">
        <Sparkles aria-hidden className="h-4 w-4" />
        {t("admin_category_words.generate_image", "Generate image")}
      </Button>

      <dialog
        ref={dialogRef}
        aria-label={t("admin_category_words.generate_title", "Image for {{term}}", { term })}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-3xl border border-card-border bg-washi p-0 text-left text-sm text-sumi shadow-2xl backdrop:bg-sumi/50"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-nunito text-lg font-extrabold">
              {t("admin_category_words.generate_title", "Image for {{term}}", { term })}
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
            {/* Step 1: the picture. */}
            <div className="flex flex-col gap-3">
              <CharacterPicker value={characterIds} onChange={setCharacterIds} disabled={running !== null} />
              <ScenePicker
                sceneId={sceneId}
                onSceneChange={setSceneId}
                customScene={customScene}
                onCustomSceneChange={setCustomScene}
                disabled={running !== null}
              />
              <RecommendedModelsNote settings={settings} disabled={running !== null} />
              <ImageModelPicker settings={settings} disabled={running !== null} inputImages={referenceImageCount(characterIds)} />

              <div
                style={png ? CHECKERBOARD : undefined}
                className="relative aspect-square w-full overflow-hidden rounded-2xl border border-card-border bg-white"
              >
                {png ? (
                  <>
                    <ImageLightbox src={png.dataUrl} alt={term} className="block h-full w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element -- a data URL, not a hosted file. */}
                      <img src={png.dataUrl} alt={term} className="h-full w-full object-contain" />
                    </ImageLightbox>
                    {running === "picture" && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-washi/70 text-xs font-semibold text-sumi">
                        <Loader2 aria-hidden className="h-6 w-6 animate-spin" />
                        {t("admin_category_words.editing_picture", "Editing the picture…")}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-sumi-soft">
                    {running === "picture" ? (
                      <>
                        <Loader2 aria-hidden className="h-6 w-6 animate-spin" />
                        {t("admin_category_words.log_drawing", "Drawing the picture…")}
                      </>
                    ) : (
                      <>
                        <Sparkles aria-hidden className="h-6 w-6" />
                        {t("admin_category_words.picture_empty", "The picture shows here — check it before making SVGs.")}
                      </>
                    )}
                  </div>
                )}
              </div>
              {png && (
                <p className="flex items-center justify-between text-xs text-sumi-soft">
                  {formatBytes(png.bytes)} PNG
                  <a
                    href={png.dataUrl}
                    download={`${term}.png`}
                    className="inline-flex items-center gap-1 font-semibold text-ai hover:text-ai-dark"
                  >
                    <Download aria-hidden className="h-3.5 w-3.5" />
                    {t("admin_category_words.download", "Download")}
                  </a>
                </p>
              )}

              <div className="flex flex-wrap gap-2">
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
                  <>
                    <Button
                      type="button"
                      variant={png ? "outline" : "primary"}
                      size="sm"
                      onClick={drawPicture}
                      disabled={needsCustomScene}
                    >
                      {png ? <RefreshCw aria-hidden className="h-4 w-4" /> : <Sparkles aria-hidden className="h-4 w-4" />}
                      {png
                        ? t("admin_category_words.regenerate_picture", "Regenerate")
                        : t("admin_category_words.draw_picture", "Draw picture")}
                    </Button>
                    {png && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(!editing)}
                        aria-expanded={editing}
                      >
                        <Pencil aria-hidden className="h-4 w-4" />
                        {t("admin_category_words.edit_picture", "Edit")}
                      </Button>
                    )}
                    {beforeEdit && (
                      <Button type="button" variant="outline" size="sm" onClick={undoEdit}>
                        <Undo2 aria-hidden className="h-4 w-4" />
                        {t("admin_category_words.undo_edit", "Undo edit")}
                      </Button>
                    )}
                    {png && (
                      <Button type="button" size="sm" onClick={makeSvgs}>
                        <Shapes aria-hidden className="h-4 w-4" />
                        {svgs
                          ? t("admin_category_words.make_svgs_again", "Make SVGs again")
                          : t("admin_category_words.make_svgs", "Make SVGs")}
                      </Button>
                    )}
                  </>
                )}
              </div>

              {png && <SvgModelPicker settings={settings} disabled={running !== null} />}

              {editing && png && !running && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    editPicture();
                  }}
                  className="flex flex-col gap-2 rounded-2xl border border-card-border bg-washi-soft p-3"
                >
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-sumi-soft">
                    {t("admin_category_words.edit_label", "What should change?")}
                    <textarea
                      value={instruction}
                      onChange={(event) => setInstruction(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          editPicture();
                        }
                      }}
                      maxLength={EDIT_INSTRUCTION_MAX_CHARS}
                      rows={2}
                      autoFocus
                      placeholder={t(
                        "admin_category_words.edit_placeholder",
                        "e.g. make the hospital bigger, add a red cross",
                      )}
                      className="resize-none rounded-xl border border-sumi/15 bg-washi px-3 py-2 text-sm font-normal text-sumi outline-none placeholder:text-sumi-soft/50 focus:border-ai/50 focus:ring-2 focus:ring-ai-soft"
                    />
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex flex-col text-xs tabular-nums text-sumi-soft">
                      {instruction.length}/{EDIT_INSTRUCTION_MAX_CHARS}
                      <CostEstimate settings={settings} cost={settings.imageCostFor(characterIds.length + 1)} />
                    </span>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
                        {t("admin_category_words.edit_cancel", "Cancel")}
                      </Button>
                      <Button type="submit" size="sm" disabled={!cleanEditInstruction(instruction)}>
                        <Pencil aria-hidden className="h-4 w-4" />
                        {t("admin_category_words.edit_apply", "Apply edit")}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Step 2: the log and the SVGs. */}
            <div className="flex min-w-0 flex-col gap-3">
              <RunLog log={log} running={running !== null} startedAt={startedAt} status={status} />
              {error && <p className="text-xs text-shu-dark">{error}</p>}

              {options.length > 0 && (
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-4">
                  {options.map((option) => (
                    <OptionTile
                      key={option.key}
                      option={option}
                      selected={option.key === selectedKey}
                      onSelect={() => setSelectedKey(option.key === selectedKey ? null : option.key)}
                    />
                  ))}
                </div>
              )}

              {selected && (
                <div className="flex flex-col gap-2 border-t border-card-border pt-3">
                  {selectedIsLarge && (
                    <p className="flex items-start gap-1.5 rounded-lg border border-kin/40 bg-kin/15 px-2.5 py-1.5 text-xs text-sumi">
                      <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-acorn" />
                      {t(
                        "admin_category_words.option_large_warning",
                        "This is over {{warn}}KB — it'll load slower for learners. A smaller option is better if it looks as good.",
                        { warn: GENERATED_IMAGE_WARN_BYTES / 1024 },
                      )}
                    </p>
                  )}
                  <Button type="button" size="sm" onClick={useSelected} disabled={saving} className="w-fit">
                    {saving ? (
                      <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check aria-hidden className="h-4 w-4" />
                    )}
                    {t("admin_category_words.use_as_image", "Use {{label}} as the image", { label: selected.label })}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
