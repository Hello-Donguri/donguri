// The OpenAI models the generate-image window can use, and what they cost —
// shared by the server (which checks the choice and works out what each
// call cost from its token usage) and the deck page (which shows an
// estimate before each run). Prices are OpenAI's standard rates in US
// dollars per million tokens, as listed in October 2026; update them here
// if OpenAI changes them.

// Shown in pence; close enough for an estimate.
export const GBP_PER_USD = 0.75;

const PER_MILLION = 1 / 1_000_000;

export const IMAGE_QUALITIES = ["low", "medium", "high"] as const;
export type ImageQuality = (typeof IMAGE_QUALITIES)[number];

// `side` is the square the picture is drawn at: as small as the model
// takes, since it's traced into an SVG anyway. GPT Image 2 and 2.5 take
// any square whose side is a multiple of 16 with at least 655,360 pixels
// (816² is the smallest); GPT Image 1 Mini only takes fixed sizes.
// `outputTokens` is roughly what a 1024×1024 picture comes back as at each
// quality, from OpenAI's per-image price table (scaled by area for other
// sides); `referenceTokens` a rough guess at one input image. Both are
// only for the estimate — what a call actually cost comes from its usage.
export const IMAGE_MODELS = [
  {
    id: "gpt-image-2",
    name: "GPT Image 2",
    side: 816,
    price: { textIn: 5, imageIn: 8, imageOut: 30 },
    outputTokens: { low: 200, medium: 1770, high: 7030 },
    referenceTokens: 1500,
  },
  {
    id: "gpt-image-2.5-flare",
    name: "GPT Image 2.5 Flare",
    side: 816,
    price: { textIn: 5, imageIn: 8, imageOut: 30 },
    outputTokens: { low: 200, medium: 1770, high: 7030 },
    referenceTokens: 1500,
  },
  {
    id: "gpt-image-2.5-sunburst",
    name: "GPT Image 2.5 Sunburst",
    side: 816,
    price: { textIn: 5, imageIn: 8, imageOut: 30 },
    outputTokens: { low: 200, medium: 1770, high: 7030 },
    referenceTokens: 1500,
  },
  {
    id: "gpt-image-1-mini",
    name: "GPT Image 1 Mini",
    side: 1024,
    price: { textIn: 2, imageIn: 2.5, imageOut: 8 },
    outputTokens: { low: 630, medium: 1380, high: 4500 },
    referenceTokens: 800,
  },
] as const;

export type ImageModel = (typeof IMAGE_MODELS)[number];
export type ImageModelId = ImageModel["id"];

// ChatGPT turning the picture into an SVG (the ChatGPT option among the
// SVGs). `null` skips it, leaving only the free tracers. The estimate is
// one picture and the instructions in (~1,700 tokens) and the SVG plus
// its reasoning out (~5,000) — Astra at about 20p.
export const SVG_MODELS = [
  { id: "gpt-6-astra", name: "GPT-6 Astra", price: { in: 10, cachedIn: 1, out: 50 } },
  { id: "gpt-6.1-sol", name: "GPT-6.1 Sol", price: { in: 2, cachedIn: 0.1, out: 10 } },
  { id: "gpt-6.1-terra", name: "GPT-6.1 Terra", price: { in: 1, cachedIn: 0.05, out: 5 } },
  { id: "gpt-6-luna", name: "GPT-6 Luna", price: { in: 0.1, cachedIn: 0.01, out: 0.5 } },
] as const;

export type SvgModel = (typeof SVG_MODELS)[number];
export type SvgModelId = SvgModel["id"];

const SVG_ESTIMATE_TOKENS = { in: 1700, out: 5000 };

// The recommended choices, and the defaults: GPT Image 2 on low quality is
// plenty for a picture that's traced into an SVG anyway, and GPT-6.1 Sol
// writes a usable SVG at about a fifth of Astra's cost.
export const DEFAULT_IMAGE_MODEL: ImageModelId = "gpt-image-2";
export const DEFAULT_IMAGE_QUALITY: ImageQuality = "low";
export const DEFAULT_SVG_MODEL: SvgModelId = "gpt-6.1-sol";

// The choices a request asked for, or the defaults for anything that isn't
// one of them.
export function parseImageModel(value: unknown): ImageModel {
  return IMAGE_MODELS.find((model) => model.id === value) ?? IMAGE_MODELS[0];
}

export function parseImageQuality(value: unknown): ImageQuality {
  return IMAGE_QUALITIES.find((quality) => quality === value) ?? DEFAULT_IMAGE_QUALITY;
}

// `null` (or "off") is no ChatGPT SVG.
export function parseSvgModel(value: unknown): SvgModel | null {
  if (value === null || value === "off") return null;
  return (
    SVG_MODELS.find((model) => model.id === value) ??
    SVG_MODELS.find((model) => model.id === DEFAULT_SVG_MODEL) ??
    SVG_MODELS[0]
  );
}

// A rough cost before drawing, in dollars: the prompt, each input image
// (character references, plus the picture itself for an edit) and the
// picture out.
export function estimateImageCost(model: ImageModel, quality: ImageQuality, inputImages: number) {
  const scale = (model.side * model.side) / (1024 * 1024);
  return (
    (800 * model.price.textIn +
      inputImages * model.referenceTokens * model.price.imageIn +
      model.outputTokens[quality] * scale * model.price.imageOut) *
    PER_MILLION
  );
}

export function estimateSvgCost(model: SvgModel) {
  return (SVG_ESTIMATE_TOKENS.in * model.price.in + SVG_ESTIMATE_TOKENS.out * model.price.out) * PER_MILLION;
}

// What an image call actually cost, in dollars, from the usage it returned.
// If the usage doesn't split text from image input, it's all counted as
// image (the dearer).
export function imageCost(
  model: ImageModel,
  usage: { input_tokens: number; output_tokens: number; input_tokens_details?: { image_tokens: number; text_tokens: number } },
) {
  const details = usage.input_tokens_details;
  const imageIn = details ? details.image_tokens : usage.input_tokens;
  const textIn = details ? details.text_tokens : 0;
  return (
    (textIn * model.price.textIn + imageIn * model.price.imageIn + usage.output_tokens * model.price.imageOut) *
    PER_MILLION
  );
}

// What a ChatGPT SVG actually cost, in dollars, from its usage — output
// includes its reasoning.
export function svgCost(model: SvgModel, usage: { prompt_tokens: number; completion_tokens: number; cached_tokens?: number }) {
  const cached = usage.cached_tokens ?? 0;
  return (
    ((usage.prompt_tokens - cached) * model.price.in + cached * model.price.cachedIn + usage.completion_tokens * model.price.out) *
    PER_MILLION
  );
}

// What the page remembers a call's actual cost under, so its next estimate
// for the same thing can show what it really cost last time.
export const imageEstimateKey = (model: ImageModel, quality: ImageQuality, inputImages: number) =>
  `image:${model.id}:${quality}:${inputImages}`;
export const svgEstimateKey = (model: SvgModel) => `svg:${model.id}`;

// "0.4p", "17p", "£1.20".
export function formatCost(usd: number) {
  const pence = usd * GBP_PER_USD * 100;
  if (pence >= 100) return `£${(pence / 100).toFixed(2)}`;
  if (pence < 10) return `${pence.toFixed(1)}p`;
  return `${Math.round(pence)}p`;
}
