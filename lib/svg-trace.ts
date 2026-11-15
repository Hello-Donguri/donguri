import "server-only";

import OpenAI from "openai";
import sharp from "sharp";
import { optimize } from "@neplex/vectorizer";
import type { SvgResult } from "@/lib/generated-word-image";

export type SvgTrace = SvgResult;

// Progress notes for the generation log, and a signal that stops the trace
// part-way when the admin presses Stop (see lib/word-image-generate.ts).
export type TraceLog = (message: string) => void;
export type TraceOptions = { log?: TraceLog; signal?: AbortSignal };
const noLog: TraceLog = () => {};

// Runs the result through the SVG optimiser (merges and shortens path
// data, the same as SVGO).
async function timed(trace: () => Promise<string>): Promise<SvgTrace> {
  const start = Date.now();
  try {
    const svg = await optimize(await trace(), { multipass: true });
    return {
      ok: true,
      svg,
      bytes: Buffer.byteLength(svg),
      paths: svg.match(/<path\b/g)?.length ?? 0,
      ms: Date.now() - start,
    };
  } catch (error) {
    // A Stop isn't a failure worth logging.
    if (!(error instanceof Error && error.name === "AbortError")) console.error("SVG trace failed", error);
    return { ok: false, error: error instanceof Error ? error.message : "Tracing failed." };
  }
}

const CHATGPT_SVG_TIMEOUT_MS = 180_000;

// Which model writes the SVG, and where its token usage goes (so the
// caller can work out what it cost).
export type ChatGptOptions = TraceOptions & {
  model: string;
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; cached_tokens?: number }) => void;
};

// Sends ChatGPT the instructions and the picture, and pulls the SVG out of
// its reply.
async function askChatGptForSvg(
  instructions: string[],
  png: Buffer,
  { log = noLog, signal, model, onUsage }: ChatGptOptions,
) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const start = Date.now();
  // On white: a transparent background can read as black to the model.
  const onWhite = await sharp(png).flatten({ background: "#ffffff" }).png().toBuffer();
  log(`Sending the picture to ${model} (reasoning effort: medium, ${CHATGPT_SVG_TIMEOUT_MS / 1000}s limit)…`);
  const response = await openai.chat.completions.create(
    {
      model,
      reasoning_effort: "medium",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instructions.join("\n") },
            { type: "image_url", image_url: { url: `data:image/png;base64,${onWhite.toString("base64")}` } },
          ],
        },
      ],
    },
    {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(CHATGPT_SVG_TIMEOUT_MS)])
        : AbortSignal.timeout(CHATGPT_SVG_TIMEOUT_MS),
      maxRetries: 0,
    },
  );

  const reply = response.choices[0]?.message.content ?? "";
  const { usage } = response;
  if (usage) {
    onUsage?.({
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      cached_tokens: usage.prompt_tokens_details?.cached_tokens,
    });
  }
  log(
    `Reply after ${((Date.now() - start) / 1000).toFixed(1)}s: ${Math.round(reply.length / 1024)} KB` +
      (usage ? `, ${usage.prompt_tokens} tokens in, ${usage.completion_tokens} out` : ""),
  );
  const svg = reply.match(/<svg[\s\S]*<\/svg>/i)?.[0];
  if (!svg) throw new Error("ChatGPT didn't reply with an SVG.");
  return svg;
}

const SVG_RULES = [
  "Flat solid fills only. No gradients, filters, masks, clip paths, text, images, scripts or event handlers.",
  "No comments.",
  "Reply with only the SVG markup, starting with <svg and ending with </svg>.",
];

// Not a trace: ChatGPT looks at the picture and writes the SVG by hand,
// with real shapes — two overlapping circles come back as two <circle>s,
// outlines as strokes — so it's clean and editable.
export function traceWithChatGpt(png: Buffer, subject: string, options: ChatGptOptions): Promise<SvgTrace> {
  return timed(() =>
    askChatGptForSvg(
      [
        `Recreate this illustration (${subject}) as a polished, hand-written SVG that is true to the original.`,
        'Use viewBox="0 0 1024 1024" with width="1024" height="1024".',
        "Stay true to the picture: if the SVG were laid over it, the shapes should line up. The same pose, composition, positions, sizes, proportions, line thickness and colours, and every detail in it (eyes, nose, hands, feet, markings, props) — nothing added, nothing left out, nothing restyled or simplified away. It should be the same drawing, cleaned up — not a reinterpretation or a new drawing in a similar style.",
        "Use simple geometric elements wherever they fit — <circle>, <ellipse>, <rect> with rx, <line>, <polygon> — and smooth <path> curves with as few points as possible for the rest. Two overlapping circles should be two <circle> elements.",
        'Draw the outlines as strokes (stroke, stroke-width, stroke-linecap="round", stroke-linejoin="round"), in the picture\'s outline colour and the same thickness throughout.',
        "No gaps: every area that's coloured in the picture must be filled, with no background showing through anywhere it doesn't in the picture. Draw each filled shape first and its outline on top, with the fill following the outline's centre line so it runs right up under the stroke. Where two coloured areas meet, overlap them slightly rather than letting the edges just touch. Closed shapes must actually close.",
        "Use colours taken from the image. No background: leave it transparent, with no background <rect> or fill behind the drawing — but areas inside the drawing that are white in the picture (inside eyes, a page, a sign) are still filled white.",
        "Before replying, compare the SVG against the picture part by part — positions, sizes, colours, gaps, missing details — and fix anything that doesn't match.",
        "Keep it compact — well under 30KB.",
        ...SVG_RULES,
      ],
      png,
      options,
    ),
  );
}
