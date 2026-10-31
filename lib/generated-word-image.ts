// Shared by the server that generates a word's picture (see
// lib/word-image-generate.ts and its streaming route) and the deck page
// that shows it (see GenerateWordImage).

// Size limits for choosing a generated picture as a word's image (see
// chooseGeneratedWordImage): over the warning size it can still be chosen,
// with a warning; over the maximum it can be viewed and downloaded but not
// chosen.
export const GENERATED_IMAGE_WARN_BYTES = 30 * 1024;
export const GENERATED_IMAGE_MAX_BYTES = 100 * 1024;

// Every way the picture is turned into an SVG, in the order they're shown.
export const SVG_OPTIONS = [
  { key: "vtracer", label: "vTracer" },
  { key: "vtracerClean", label: "vTracer (clean)" },
  { key: "potrace", label: "Potrace (smooth)" },
  { key: "inkscape", label: "Inkscape" },
  { key: "imagetracer", label: "ImageTracer" },
  { key: "chatgpt", label: "ChatGPT" },
] as const;

export type SvgOptionKey = (typeof SVG_OPTIONS)[number]["key"];

export type SvgResult = { ok: true; svg: string; bytes: number; paths: number; ms: number } | { ok: false; error: string };

export type LogLevel = "info" | "start" | "done" | "warn" | "error";

// One line of the generation stream, sent as JSON per line: a log entry
// (`at` is milliseconds since the request started), the generated PNG, an
// SVG as soon as it's ready, what an OpenAI call cost (in US dollars, from
// its usage; `estimateKey` matches the estimate it's remembered against on
// the page), or the end of the run.
export type WordImageEvent =
  | { type: "log"; at: number; level: LogLevel; source: string; message: string }
  | { type: "png"; dataUrl: string; bytes: number }
  | { type: "svg"; key: SvgOptionKey; result: SvgResult }
  | { type: "cost"; usd: number; estimateKey: string }
  | { type: "end"; ok: boolean; error?: string };

// An edit asked of a drawn picture ("make the hospital bigger"), trimmed to
// one short line — the same on the page and the server, which checks it
// again. Empty when there's nothing usable.
export const EDIT_INSTRUCTION_MAX_CHARS = 200;

export function cleanEditInstruction(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, EDIT_INSTRUCTION_MAX_CHARS);
}
