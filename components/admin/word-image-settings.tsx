"use client";

import { useState } from "react";
import { Check, Coins, Lightbulb } from "lucide-react";
import { WORD_IMAGE_CHARACTERS, type WordImageCharacterId } from "@/lib/word-image-characters";
import {
  CUSTOM_SCENE_ID,
  CUSTOM_SCENE_MAX_CHARS,
  CUSTOM_SCENE_MAX_WORDS,
  WORD_IMAGE_SCENES,
  type WordImageSceneId,
} from "@/lib/word-image-scenes";
import type { WordImageEvent } from "@/lib/generated-word-image";
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_IMAGE_QUALITY,
  DEFAULT_SVG_MODEL,
  FALLBACK_EXCHANGE_RATES,
  IMAGE_MODELS,
  IMAGE_QUALITIES,
  SVG_MODELS,
  estimateImageCost,
  estimateSvgCost,
  formatCost,
  imageEstimateKey,
  parseImageModel,
  parseImageQuality,
  parseSvgModel,
  svgEstimateKey,
  type ExchangeRates,
  type ImageModelId,
  type ImageQuality,
  type SvgModelId,
} from "@/lib/word-image-models";
import { useTranslations } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

// What the single-word image window (GenerateWordImage) and the course
// page's batch window (BatchWordImages) share: the settings — characters,
// scene, models — the cost shown for them, and reading the generation
// streams.

// A light checkerboard behind pictures, so their transparent background
// shows as transparent rather than as white — an SVG pattern, not a
// gradient.
export const CHECKERBOARD = {
  backgroundColor: "#ffffff",
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M0 0h8v8H0zM8 8h8v8H8z' fill='%23e8e8e8'/%3E%3C/svg%3E\")",
};

export const SELECT_CLASS =
  "h-9 min-w-0 rounded-full border border-sumi/15 bg-washi px-3 text-sm font-normal text-sumi outline-none focus:border-ai/50 focus:ring-2 focus:ring-ai-soft disabled:opacity-60";

export function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Reads one of the word-picture streams (see app/api/admin/word-images),
// one JSON event per line, handing each to `onEvent` as it arrives.
export async function readStream(
  url: string,
  body: object,
  signal: AbortSignal,
  onEvent: (event: WordImageEvent) => void,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error ?? `Request failed (${response.status}).`);
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffered = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffered += value;
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as WordImageEvent);
  }
}

// The models chosen last time, and what each kind of call actually cost
// last time (see WordImageEvent's "cost"), kept in this browser — a
// convenience only, so storage being unavailable just means the defaults
// and rough estimates. Shared by both windows, so a choice made in one
// carries to the other.
const MODELS_STORAGE_KEY = "word-image-models";
const COSTS_STORAGE_KEY = "word-image-costs";

export type ModelChoice = { imageModel: ImageModelId; quality: ImageQuality; svgModel: SvgModelId | "off" };

function readStored(key: string): Record<string, unknown> {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "{}") as unknown;
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function writeStored(key: string, value: object) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// A window's model settings, what things cost, and what it's spent.
// `open` is called as the window opens: it loads the stored choices and
// costs, starts the spend from zero and fetches today's exchange rates.
export function useWordImageSettings() {
  const [models, setModels] = useState<ModelChoice>({
    imageModel: DEFAULT_IMAGE_MODEL,
    quality: DEFAULT_IMAGE_QUALITY,
    svgModel: DEFAULT_SVG_MODEL,
  });
  const [lastCosts, setLastCosts] = useState<Record<string, number>>({});
  const [rates, setRates] = useState<ExchangeRates>(FALLBACK_EXCHANGE_RATES);
  // What this window has spent on OpenAI since it was opened.
  const [spent, setSpent] = useState(0);

  const chooseModels = (change: Partial<ModelChoice>) => {
    const next = { ...models, ...change };
    setModels(next);
    writeStored(MODELS_STORAGE_KEY, next);
  };

  // GPT Image 2 on low quality and Sol for the ChatGPT SVG — or no ChatGPT
  // SVG at all, which is cheaper still.
  const usingRecommended =
    models.imageModel === DEFAULT_IMAGE_MODEL &&
    models.quality === DEFAULT_IMAGE_QUALITY &&
    (models.svgModel === DEFAULT_SVG_MODEL || models.svgModel === "off");
  const useRecommended = () =>
    chooseModels({ imageModel: DEFAULT_IMAGE_MODEL, quality: DEFAULT_IMAGE_QUALITY, svgModel: DEFAULT_SVG_MODEL });

  const open = () => {
    const stored = readStored(MODELS_STORAGE_KEY);
    setModels({
      imageModel: parseImageModel(stored.imageModel).id,
      quality: parseImageQuality(stored.quality),
      svgModel: parseSvgModel(stored.svgModel)?.id ?? "off",
    });
    const costs = readStored(COSTS_STORAGE_KEY);
    setLastCosts(
      Object.fromEntries(Object.entries(costs).filter((entry): entry is [string, number] => typeof entry[1] === "number")),
    );
    setSpent(0);
    fetch("/api/admin/exchange-rates")
      .then((response) => (response.ok ? (response.json() as Promise<ExchangeRates>) : null))
      .then((loaded) => {
        if (loaded?.gbp && loaded.jpy) setRates(loaded);
      })
      .catch(() => {});
  };

  // A call's actual cost, from a stream's "cost" event.
  const recordCost = (event: Extract<WordImageEvent, { type: "cost" }>) => {
    setSpent((current) => current + event.usd);
    setLastCosts((current) => {
      const next = { ...current, [event.estimateKey]: event.usd };
      writeStored(COSTS_STORAGE_KEY, next);
      return next;
    });
  };

  const imageModel = parseImageModel(models.imageModel);
  const svgModel = parseSvgModel(models.svgModel);

  // What drawing one picture should cost with `inputImages` going in
  // (character references, plus the picture for an edit), and one ChatGPT
  // SVG — what it really cost last time when that's known.
  const imageCostFor = (inputImages: number) => {
    const last = lastCosts[imageEstimateKey(imageModel, models.quality, inputImages)];
    return { usd: last ?? estimateImageCost(imageModel, models.quality, inputImages), measured: last !== undefined };
  };
  const svgCostEach = svgModel
    ? (() => {
        const last = lastCosts[svgEstimateKey(svgModel)];
        return { usd: last ?? estimateSvgCost(svgModel), measured: last !== undefined };
      })()
    : { usd: 0, measured: true };

  return {
    models,
    imageModel,
    svgModel,
    chooseModels,
    usingRecommended,
    useRecommended,
    rates,
    spent,
    open,
    recordCost,
    imageCostFor,
    svgCostEach,
    format: (usd: number) => formatCost(usd, rates),
  };
}

export type WordImageSettings = ReturnType<typeof useWordImageSettings>;

// The window's spend so far, large, in its header.
export function SpendBadge({ settings, label }: { settings: WordImageSettings; label?: string }) {
  const t = useTranslations();
  return (
    <div
      aria-live="polite"
      className="ml-auto flex shrink-0 items-center gap-2 rounded-full border border-kin/40 bg-kin/15 py-1.5 pr-4 pl-2"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-kin/30 text-acorn">
        <Coins aria-hidden className="h-4 w-4" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-semibold tracking-wide text-sumi-soft uppercase">
          {label ?? t("admin_category_words.cost_spent_label", "Spent this window")}
        </span>
        <span className="font-nunito text-lg font-extrabold tabular-nums text-sumi">{settings.format(settings.spent)}</span>
      </span>
    </div>
  );
}

// Under a model select: what one call should cost.
export function CostEstimate({ settings, cost }: { settings: WordImageSettings; cost: { usd: number; measured: boolean } }) {
  const t = useTranslations();
  return (
    <span className="font-normal text-sumi-soft">
      {cost.measured
        ? t("admin_category_words.cost_last", "≈ {{cost}} each (last time)", { cost: settings.format(cost.usd) })
        : t("admin_category_words.cost_estimate", "≈ {{cost}} each (estimate)", { cost: settings.format(cost.usd) })}
    </span>
  );
}

// The characters to put in the picture, as chips.
export function CharacterPicker({
  value,
  onChange,
  disabled,
}: {
  value: WordImageCharacterId[];
  onChange: (ids: WordImageCharacterId[]) => void;
  disabled: boolean;
}) {
  const t = useTranslations();
  const toggle = (id: WordImageCharacterId) =>
    onChange(value.includes(id) ? value.filter((other) => other !== id) : [...value, id]);

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-semibold text-sumi-soft">
        {t("admin_category_words.characters", "Characters")}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {WORD_IMAGE_CHARACTERS.map((character) => {
          const checked = value.includes(character.id);
          return (
            <label
              key={character.id}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-xs font-semibold transition has-disabled:cursor-not-allowed has-disabled:opacity-60 has-focus-visible:ring-2 has-focus-visible:ring-ai-soft",
                checked ? "border-ai bg-ai-soft text-ai-dark" : "border-sumi/15 bg-washi text-sumi hover:border-ai/40",
              )}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(character.id)} className="sr-only" />
              {/* eslint-disable-next-line @next/next/no-img-element -- a small local thumbnail. */}
              <img src={character.src} alt="" className="h-6 w-6 rounded-full bg-white object-contain" />
              {character.name}
              {checked && <Check aria-hidden className="h-3 w-3" strokeWidth={3} />}
            </label>
          );
        })}
      </div>
      {value.length === 0 && (
        <p className="text-xs text-sumi-soft">
          {t("admin_category_words.no_characters", "No characters — just the word, drawn in the style of the cheese picture.")}
        </p>
      )}
    </fieldset>
  );
}

export type SceneChoice = WordImageSceneId | typeof CUSTOM_SCENE_ID;

// How the picture shows the word: a preset, or (unless `allowCustom` is
// off) the admin's own description.
export function ScenePicker({
  sceneId,
  onSceneChange,
  customScene,
  onCustomSceneChange,
  disabled,
  allowCustom = true,
}: {
  sceneId: SceneChoice;
  onSceneChange: (id: SceneChoice) => void;
  customScene: string;
  onCustomSceneChange: (value: string) => void;
  disabled: boolean;
  allowCustom?: boolean;
}) {
  const t = useTranslations();
  const customSceneWords = customScene.trim().split(/\s+/).filter(Boolean).length;

  return (
    <>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-sumi-soft">
        {t("admin_category_words.scene", "Scene")}
        <select
          value={sceneId}
          onChange={(event) => onSceneChange(event.target.value as SceneChoice)}
          disabled={disabled}
          className={SELECT_CLASS}
        >
          {WORD_IMAGE_SCENES.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.name}
            </option>
          ))}
          {allowCustom && <option value={CUSTOM_SCENE_ID}>{t("admin_category_words.scene_custom", "Custom…")}</option>}
        </select>
      </label>

      {allowCustom && sceneId === CUSTOM_SCENE_ID && (
        <label className="flex flex-col gap-1 text-xs font-semibold text-sumi-soft">
          <span className="sr-only">{t("admin_category_words.scene_custom_label", "Describe the scene")}</span>
          <textarea
            value={customScene}
            // Anything past the word limit isn't taken — a paste that runs
            // over keeps its first words.
            onChange={(event) => {
              const next = event.target.value;
              const words = next.trim().split(/\s+/).filter(Boolean);
              onCustomSceneChange(
                words.length <= CUSTOM_SCENE_MAX_WORDS ? next : words.slice(0, CUSTOM_SCENE_MAX_WORDS).join(" "),
              );
            }}
            maxLength={CUSTOM_SCENE_MAX_CHARS}
            rows={2}
            disabled={disabled}
            autoComplete="off"
            placeholder={t("admin_category_words.scene_custom_placeholder", "e.g. running late for the bus")}
            className="resize-none rounded-xl border border-sumi/15 bg-washi px-3 py-2 text-sm font-normal text-sumi outline-none placeholder:text-sumi-soft/50 focus:border-ai/50 focus:ring-2 focus:ring-ai-soft disabled:opacity-60"
          />
          <span className="self-end font-normal tabular-nums">
            {t("admin_category_words.scene_custom_count", "{{count}}/{{max}} words", {
              count: customSceneWords,
              max: CUSTOM_SCENE_MAX_WORDS,
            })}
          </span>
        </label>
      )}
    </>
  );
}

// The nudge towards the cheap settings, while anything else is chosen.
export function RecommendedModelsNote({ settings, disabled }: { settings: WordImageSettings; disabled: boolean }) {
  const t = useTranslations();
  if (settings.usingRecommended) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-ai/30 bg-ai-soft px-3 py-2 text-xs text-sumi">
      <Lightbulb aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ai-dark" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <p>
          {t(
            "admin_category_words.models_recommendation",
            "Use GPT Image 2 on Low quality and GPT-6.1 Sol for the ChatGPT SVG — good enough for tracing, for a fraction of the cost.",
          )}
        </p>
        <button
          type="button"
          onClick={settings.useRecommended}
          disabled={disabled}
          className="w-fit rounded-full bg-ai px-3 py-1 text-[11px] font-semibold text-washi transition hover:bg-ai-dark disabled:opacity-60"
        >
          {t("admin_category_words.models_use_recommended", "Use recommended")}
        </button>
      </div>
    </div>
  );
}

// The image model and quality, with what a picture costs drawn with
// `inputImages` reference images.
export function ImageModelPicker({
  settings,
  disabled,
  inputImages,
}: {
  settings: WordImageSettings;
  disabled: boolean;
  inputImages: number;
}) {
  const t = useTranslations();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-sumi-soft">
        {t("admin_category_words.image_model", "Image model")}
        <select
          value={settings.models.imageModel}
          onChange={(event) => settings.chooseModels({ imageModel: event.target.value as ImageModelId })}
          disabled={disabled}
          className={SELECT_CLASS}
        >
          {IMAGE_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.id === DEFAULT_IMAGE_MODEL
                ? t("admin_category_words.model_recommended", "{{name}} (recommended)", { name: model.name })
                : model.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-sumi-soft">
        {t("admin_category_words.image_quality", "Quality")}
        <select
          value={settings.models.quality}
          onChange={(event) => settings.chooseModels({ quality: event.target.value as ImageQuality })}
          disabled={disabled}
          className={SELECT_CLASS}
        >
          {IMAGE_QUALITIES.map((quality) => (
            <option key={quality} value={quality}>
              {quality === "low"
                ? t("admin_category_words.quality_low_recommended", "Low (recommended)")
                : quality === "medium"
                  ? t("admin_category_words.quality_medium", "Medium")
                  : t("admin_category_words.quality_high", "High")}
            </option>
          ))}
        </select>
      </label>
      <span className="col-span-2 -mt-1 text-xs">
        <CostEstimate settings={settings} cost={settings.imageCostFor(inputImages)} />
      </span>
    </div>
  );
}

// Which model writes the ChatGPT SVG, or none.
export function SvgModelPicker({ settings, disabled }: { settings: WordImageSettings; disabled: boolean }) {
  const t = useTranslations();
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-sumi-soft">
      {t("admin_category_words.svg_model", "ChatGPT SVG")}
      <select
        value={settings.models.svgModel}
        onChange={(event) => settings.chooseModels({ svgModel: event.target.value as SvgModelId | "off" })}
        disabled={disabled}
        className={SELECT_CLASS}
      >
        {SVG_MODELS.map((model) => (
          <option key={model.id} value={model.id}>
            {model.id === DEFAULT_SVG_MODEL
              ? t("admin_category_words.model_recommended", "{{name}} (recommended)", { name: model.name })
              : model.name}
          </option>
        ))}
        <option value="off">{t("admin_category_words.svg_model_off", "Off — free tracers only")}</option>
      </select>
      {settings.svgModel ? (
        <CostEstimate settings={settings} cost={settings.svgCostEach} />
      ) : (
        <span className="font-normal text-sumi-soft">
          {t("admin_category_words.svg_model_off_note", "The other SVGs are made here, at no cost.")}
        </span>
      )}
    </label>
  );
}
