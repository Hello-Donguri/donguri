import "server-only";

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import OpenAI from "openai";
import sharp from "sharp";
import ImageTracer from "imagetracerjs";
import { Potrace } from "potrace";
import { ColorMode, Hierarchical, PathSimplifyMode, optimize, vectorize } from "@neplex/vectorizer";
import type { SvgResult } from "@/lib/generated-word-image";

export type SvgTrace = SvgResult;

// Progress notes for the generation log, and a signal that stops the trace
// part-way when the admin presses Stop (see lib/word-image-generate.ts).
export type TraceLog = (message: string) => void;
export type TraceOptions = { log?: TraceLog; signal?: AbortSignal };
const noLog: TraceLog = () => {};

// `optimise` runs the result through the SVG optimiser (merges and
// shortens path data, the same as SVGO). Off for traces with even-odd
// paths, which it can break (see compactPotracePath).
async function timed(trace: () => Promise<string>, { optimise = true } = {}): Promise<SvgTrace> {
  const start = Date.now();
  try {
    const traced = await trace();
    const svg = optimise ? await optimize(traced, { multipass: true }) : traced;
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

// vTracer, tuned on generated word pictures (flat fills, thick outlines —
// see VECTOR_STYLE in lib/word-image-generate.ts). It traces the
// PNG as it comes: quantising or upscaling first made its outlines wobblier,
// not smoother. What smooths them is curve fitting with longer segments
// (`lengthThreshold`), fewer corners (`cornerThreshold`) and fewer splice
// points (`spliceThreshold`) — any more than this and real corners, like
// where a line meets a ring, start to bulge.
export function traceWithVtracer(png: Buffer, { signal }: TraceOptions = {}): Promise<SvgTrace> {
  return timed(() =>
    vectorize(png, {
      colorMode: ColorMode.Color,
      hierarchical: Hierarchical.Stacked,
      filterSpeckle: 8,
      colorPrecision: 6,
      layerDifference: 16,
      mode: PathSimplifyMode.Spline,
      cornerThreshold: 75,
      lengthThreshold: 10,
      maxIterations: 10,
      spliceThreshold: 60,
      pathPrecision: 1,
    }, signal),
  );
}

// vTracer again, merging near-identical shades: the soft edge along a
// dark line (brown fading into white) otherwise traces as its own layer
// of smudges beside the line. Coarser colour precision and a much bigger
// gap between layers fold those shades into their neighbours, and bigger
// specks are dropped — fewer, cleaner paths, at the risk of merging two
// genuinely similar colours.
export function traceWithVtracerClean(png: Buffer, { signal }: TraceOptions = {}): Promise<SvgTrace> {
  return timed(() =>
    vectorize(png, {
      colorMode: ColorMode.Color,
      hierarchical: Hierarchical.Stacked,
      filterSpeckle: 16,
      colorPrecision: 5,
      layerDifference: 48,
      mode: PathSimplifyMode.Spline,
      cornerThreshold: 75,
      lengthThreshold: 10,
      maxIterations: 10,
      spliceThreshold: 60,
      pathPrecision: 1,
    }, signal),
  );
}

// The picture cut down to a few solid colours before ImageTracer sees it:
// median-filtered to drop noise, doubled in size and lightly blurred so
// the colour boundaries land on smooth curves instead of pixel steps, then
// reduced to an 8-colour palette with no dithering. Without this, every
// anti-aliased edge pixel became its own shape (megabytes of SVG).
// Which pixels of the picture, scaled to `width`×`height`, are transparent
// background (see removeWhiteBackground) — 1 where they are. All zeros for
// a picture without transparency.
async function transparentPixels(png: Buffer, width: number, height: number) {
  const alpha = await sharp(png)
    .ensureAlpha()
    .resize(width, height, { kernel: "lanczos3" })
    .extractChannel(3)
    .raw()
    .toBuffer();
  const mask = new Uint8Array(alpha.length);
  for (let p = 0; p < alpha.length; p++) mask[p] = alpha[p] < 128 ? 1 : 0;
  return mask;
}

async function flattenColours(png: Buffer) {
  const { width = 1024, height = 1024 } = await sharp(png).metadata();
  const smoothed = await sharp(png)
    .flatten({ background: "#ffffff" })
    .median(3)
    .resize(width * 2, height * 2, { kernel: "lanczos3" })
    .png()
    .toBuffer();
  const quantised = await sharp(smoothed).blur(1).png({ palette: true, colours: 8, dither: 0 }).toBuffer();
  const { data, info } = await sharp(quantised).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // The transparent background as one fully transparent colour of its own,
  // which traceWithImageTracer then leaves out.
  const transparent = await transparentPixels(png, info.width, info.height);
  for (let p = 0; p < transparent.length; p++) {
    if (transparent[p]) data.fill(255, p * 4, p * 4 + 3);
    data[p * 4 + 3] = transparent[p] ? 0 : 255;
  }

  // The palette ImageTracer should use: exactly the colours left, so it
  // doesn't re-quantise them into different ones of its own.
  const palette = new Map<number, { r: number; g: number; b: number; a: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i + 3] << 24) | (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    if (!palette.has(key)) palette.set(key, { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] });
  }

  return { imageData: { width: info.width, height: info.height, data }, palette: [...palette.values()], width, height };
}

// ImageTracer (pure JS), for comparison. Traced at double size from the
// flattened colours, then shown at the original size. `strokewidth` outlines
// each shape in its own colour, closing the hairline cracks that otherwise
// show between neighbouring shapes.
export function traceWithImageTracer(png: Buffer, { signal }: TraceOptions = {}): Promise<SvgTrace> {
  return timed(async () => {
    const { imageData, palette, width, height } = await flattenColours(png);
    // ImageTracer runs in one go, so it can only stop before it starts.
    signal?.throwIfAborted();
    const svg = ImageTracer.imagedataToSVG(imageData, {
      pal: palette,
      colorquantcycles: 1,
      pathomit: 32,
      ltres: 2,
      qtres: 2,
      rightangleenhance: false,
      strokewidth: 2,
      roundcoords: 0,
      viewbox: true,
    });
    // The transparent background's own shapes, which draw nothing.
    return svg
      .replace(/<path\b[^>]*opacity="0"[^>]*\/>/g, "")
      .replace("<svg ", `<svg width="${width}" height="${height}" `);
  });
}

type Rgb = [number, number, number];

const luminance = ([r, g, b]: Rgb) => 0.299 * r + 0.587 * g + 0.114 * b;
const distance = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const hex = ([r, g, b]: Rgb) => `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;

// Where `colour` sits on the line from `a` to `b` (0 at a, 1 at b), when
// it's an anti-aliased blend of the two: close to that line and not at
// either end. Null when it isn't.
function blendPosition(colour: Rgb, a: Rgb, b: Rgb): number | null {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [colour[0] - a[0], colour[1] - a[1], colour[2] - a[2]];
  const length2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
  const t = (ac[0] * ab[0] + ac[1] * ab[1] + ac[2] * ab[2]) / length2;
  if (t <= 0.1 || t >= 0.9) return null;
  return Math.hypot(ac[0] - t * ab[0], ac[1] - t * ab[1], ac[2] - t * ab[2]) < 24 ? t : null;
}

// The picture as a few flat colours for Potrace, one index per pixel —
// smoothed and doubled as for ImageTracer (see flattenColours), then with
// the leftovers of anti-aliasing folded away. A blend of two commoner
// colours (brown fading into cream) goes to whichever of the two it's
// nearer; a colour nearly the same as a commoner one, or barely used, goes
// to its nearest kept colour. Otherwise each of those traces as a thin
// ring around every edge — and a blend matched by colour alone can land
// on an unrelated one (a brown–cream blend is nearer red than either).
// A transparent pixel in solidColourRegions' `pixels`, in place of a
// colour index.
const TRANSPARENT = 255;

async function solidColourRegions(png: Buffer) {
  const { width = 1024, height = 1024 } = await sharp(png).metadata();
  const smoothed = await sharp(png)
    .flatten({ background: "#ffffff" })
    .median(3)
    .resize(width * 2, height * 2, { kernel: "lanczos3" })
    .png()
    .toBuffer();
  const quantised = await sharp(smoothed).blur(1).png({ palette: true, colours: 8, dither: 0 }).toBuffer();
  const { data, info } = await sharp(quantised).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  // The transparent background (see removeWhiteBackground) isn't a colour:
  // it's marked TRANSPARENT and left out of the counting.
  const transparent = await transparentPixels(png, info.width, info.height);

  const colours: Rgb[] = [];
  const counts: number[] = [];
  const indexByKey = new Map<number, number>();
  const pixels = new Uint8Array(pixelCount);
  for (let p = 0; p < pixelCount; p++) {
    if (transparent[p]) {
      pixels[p] = TRANSPARENT;
      continue;
    }
    const key = (data[p * 3] << 16) | (data[p * 3 + 1] << 8) | data[p * 3 + 2];
    let index = indexByKey.get(key);
    if (index === undefined) {
      index = colours.length;
      indexByKey.set(key, index);
      colours.push([data[p * 3], data[p * 3 + 1], data[p * 3 + 2]]);
      counts.push(0);
    }
    counts[index]++;
    pixels[p] = index;
  }

  const kept: number[] = [];
  const blendInto = new Map<number, number>();
  // With the background gone, white is kept as a colour from the start —
  // otherwise the white inside the drawing (a calendar's squares, a page)
  // is too rare next to the cream of a character, and merges into it.
  if (transparent.includes(1)) {
    colours.push([255, 255, 255]);
    counts.push(0);
    kept.push(colours.length - 1);
  }
  for (const index of colours.map((_, i) => i).sort((a, b) => counts[b] - counts[a])) {
    if (kept.includes(index)) continue;
    const colour = colours[index];
    for (let i = 0; i < kept.length && !blendInto.has(index); i++) {
      for (let j = i + 1; j < kept.length; j++) {
        const t = blendPosition(colour, colours[kept[i]], colours[kept[j]]);
        if (t !== null) {
          blendInto.set(index, t < 0.5 ? kept[i] : kept[j]);
          break;
        }
      }
    }
    const rare = counts[index] < pixelCount * 0.0005;
    const nearKept = kept.some((k) => distance(colours[k], colour) < 40);
    if (!rare && !nearKept && !blendInto.has(index)) kept.push(index);
  }

  const mergedInto = colours.map(
    (colour, index) =>
      blendInto.get(index) ??
      kept.reduce((best, k) => (distance(colours[k], colour) < distance(colours[best], colour) ? k : best)),
  );
  const keptCounts = new Map(kept.map((k) => [k, 0]));
  for (let p = 0; p < pixelCount; p++) {
    if (pixels[p] === TRANSPARENT) continue;
    pixels[p] = mergedInto[pixels[p]];
    keptCounts.set(pixels[p], keptCounts.get(pixels[p])! + 1);
  }

  return {
    width,
    height,
    scaledWidth: info.width,
    scaledHeight: info.height,
    pixels,
    hasTransparency: transparent.includes(1),
    colours: kept
      .filter((k) => keptCounts.get(k)! > 0)
      .map((k) => ({ index: k, rgb: colours[k], count: keptCounts.get(k)! })),
  };
}

// Grows (or, with `grow` false, shrinks) the set pixels of a 0/1 mask by
// `radius` in every direction — a square, done as a row pass then a column
// pass.
function morph(mask: Uint8Array, width: number, height: number, radius: number, grow: boolean) {
  const want = grow ? 1 : 0;
  const rows = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 1 - want;
      for (let d = -radius; d <= radius; d++) {
        const xx = x + d;
        if ((xx >= 0 && xx < width ? mask[y * width + xx] : 0) === want) {
          value = want;
          break;
        }
      }
      rows[y * width + x] = value;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 1 - want;
      for (let d = -radius; d <= radius; d++) {
        const yy = y + d;
        if ((yy >= 0 && yy < height ? rows[yy * width + x] : 0) === want) {
          value = want;
          break;
        }
      }
      out[y * width + x] = value;
    }
  }
  return out;
}

// Closes the holes in a fill that the colours drawn after it will cover
// anyway — an eye, a line, a nose sitting inside the face — so the fill
// stays one simple shape instead of tracing round each of them. A hole is
// kept when it reaches the edge of the picture or a real share of it
// (over 15%) is a colour drawn underneath, which would otherwise be hidden.
function closeCoveredHoles(on: Uint8Array, layerOf: Uint8Array, layer: number, width: number, height: number) {
  const seen = new Uint8Array(on.length);
  const stack = new Int32Array(on.length);
  for (let start = 0; start < on.length; start++) {
    if (on[start] || seen[start]) continue;
    const members: number[] = [];
    let touchesEdge = false;
    let underneath = 0;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    while (top) {
      const p = stack[--top];
      members.push(p);
      const x = p % width;
      const y = (p / width) | 0;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;
      if (layerOf[p] < layer) underneath++;
      for (const q of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1]) {
        if (q >= 0 && !on[q] && !seen[q]) {
          seen[q] = 1;
          stack[top++] = q;
        }
      }
    }
    if (!touchesEdge && underneath <= members.length * 0.15) for (const p of members) on[p] = 1;
  }
}

function potraceMask(mask: Uint8Array, width: number, height: number, fill: string): Promise<string> {
  // Potrace traces the black: set pixels black, the rest white.
  const image = Buffer.alloc(mask.length);
  for (let p = 0; p < mask.length; p++) image[p] = mask[p] ? 0 : 255;
  return sharp(image, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer()
    .then(
      (png) =>
        new Promise((resolve, reject) => {
          const tracer = new Potrace({
            turdSize: 40,
            alphaMax: 1.334,
            optCurve: true,
            optTolerance: 2,
            threshold: 128,
            blackOnWhite: true,
          });
          tracer.loadImage(png, (error) =>
            error ? reject(error) : resolve(tracer.getPathTag(fill, { x: 0.5, y: 0.5 })),
          );
        }),
    );
}

const compactNumber = (value: number) => {
  const text = String(Math.round(value * 10) / 10);
  return text.replace(/^(-?)0\./, "$1.");
};

// Potrace's path data (absolute M/L/C, three decimals) rewritten compactly:
// relative commands, one decimal place — a tenth of a pixel — and no
// spaces that aren't needed. Each point is rounded before working out the
// next offset, so the rounding never drifts. Done here instead of by the
// SVG optimiser, which drops shapes nested in holes from Potrace's
// even-odd paths (a hand drawn over a hole in the body).
function compactPotracePath(d: string) {
  const tokens = d.match(/[MLC]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const round = (value: string) => Math.round(Number(value) * 10) / 10;
  let out = "";
  let command = "";
  let x = 0;
  let y = 0;
  const write = (letter: string, values: number[]) => {
    let text = letter === command && letter !== "M" ? "" : letter;
    for (const value of values) {
      const number = compactNumber(value);
      text += text && !/[a-zA-Z]$/.test(text) && !number.startsWith("-") ? ` ${number}` : number;
    }
    if (!text.match(/^[a-zA-Z]/) && out && !text.startsWith("-")) out += " ";
    out += text;
    command = letter;
  };
  for (let i = 0; i < tokens.length; ) {
    const letter = tokens[i++];
    if (letter === "M") {
      x = round(tokens[i++]);
      y = round(tokens[i++]);
      write("M", [x, y]);
    } else if (letter === "L") {
      const nx = round(tokens[i++]);
      const ny = round(tokens[i++]);
      write("l", [nx - x, ny - y]);
      x = nx;
      y = ny;
    } else if (letter === "C") {
      const points = Array.from({ length: 6 }, () => round(tokens[i++]));
      write("c", [points[0] - x, points[1] - y, points[2] - x, points[3] - y, points[4] - x, points[5] - y]);
      x = points[4];
      y = points[5];
    }
  }
  return out;
}

// Potrace, one colour at a time: it fits the fewest, longest curves it can,
// so a circle comes out as a clean circle instead of following every bump
// in the pixels. The darkest colour — the outlines — is traced exactly and
// drawn last, on top. Every other colour is a fill underneath, largest
// first, each one covering itself and the fills drawn after it (but not
// the outlines, which would make every fill trace them all again): slivers
// under ~2px are trimmed off, holes the later colours will cover are
// closed, and it's grown a few pixels under the neighbouring outlines so
// no cracks show at its edges.
export function traceWithPotrace(png: Buffer, { log = noLog, signal }: TraceOptions = {}): Promise<SvgTrace> {
  return timed(
    async () => {
      log("Smoothing, doubling to 2048px and reducing to flat colours…");
      const { width, height, scaledWidth, scaledHeight, pixels, colours, hasTransparency } =
        await solidColourRegions(png);
      const darkest = colours.reduce((a, b) => (luminance(b.rgb) < luminance(a.rgb) ? b : a));
      const fills = colours.filter((colour) => colour !== darkest).sort((a, b) => b.count - a.count);
      // Layer 0 is the background, never traced: the transparent area when
      // there is one (so every colour, white included, is drawn on top of
      // nothing), or else the commonest colour, drawn as a plain rectangle.
      const layers: ({ index: number; rgb: Rgb } | null)[] = hasTransparency
        ? [null, ...fills, darkest]
        : [...fills, darkest];
      const outlineLayer = layers.length - 1;
      const layerByColour = new Map(layers.flatMap((colour, layer) => (colour ? [[colour.index, layer] as const] : [])));
      const layerOf = new Uint8Array(pixels.length);
      for (let p = 0; p < pixels.length; p++) {
        layerOf[p] = pixels[p] === TRANSPARENT ? 0 : layerByColour.get(pixels[p])!;
      }
      log(
        `${colours.length} colours kept: background ${layers[0] ? hex(layers[0].rgb) : "transparent"}, fills ${
          layers
            .slice(1, -1)
            .map((colour) => hex(colour!.rgb))
            .join(", ") || "none"
        }, outlines ${hex(darkest.rgb)}`,
      );

      const paths: string[] = [];
      for (let layer = 1; layer < layers.length; layer++) {
        signal?.throwIfAborted();
        const on = new Uint8Array(pixels.length);
        if (layer === outlineLayer) {
          for (let p = 0; p < on.length; p++) on[p] = layerOf[p] === outlineLayer ? 1 : 0;
        } else {
          for (let p = 0; p < on.length; p++) on[p] = layerOf[p] >= layer && layerOf[p] !== outlineLayer ? 1 : 0;
          on.set(morph(morph(on, scaledWidth, scaledHeight, 2, false), scaledWidth, scaledHeight, 2, true));
          closeCoveredHoles(on, layerOf, layer, scaledWidth, scaledHeight);
          const grown = morph(on, scaledWidth, scaledHeight, 4, true);
          for (let p = 0; p < on.length; p++) if (grown[p] && layerOf[p] === outlineLayer) on[p] = 1;
        }
        const fill = hex(layers[layer]!.rgb);
        const tag = await potraceMask(on, scaledWidth, scaledHeight, fill);
        const d = tag.match(/ d="([^"]+)"/)?.[1];
        const compact = d ? compactPotracePath(d) : "";
        if (compact) paths.push(`<path fill="${fill}" fill-rule="evenodd" d="${compact}"/>`);
        log(
          `Layer ${layer}/${layers.length - 1} ${fill}${layer === outlineLayer ? " (outlines)" : ""}: ` +
            `${compact.match(/M/g)?.length ?? 0} shapes, ${Math.round(compact.length / 102.4) / 10} KB`,
        );
      }

      return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        ...(layers[0] ? [`<rect width="100%" height="100%" fill="${hex(layers[0].rgb)}"/>`] : []),
        ...paths,
        "</svg>",
      ].join("");
    },
    { optimise: false },
  );
}

const MAC_INKSCAPE = "/Applications/Inkscape.app/Contents/MacOS/inkscape";

// Inkscape's command-line binary: INKSCAPE_PATH when set, else the Mac
// app's, else `inkscape` on the PATH. Not on Vercel — this option only
// works where Inkscape is installed (a local dev server).
function inkscapeBinary() {
  if (process.env.INKSCAPE_PATH) return process.env.INKSCAPE_PATH;
  return existsSync(MAC_INKSCAPE) ? MAC_INKSCAPE : "inkscape";
}

// Inkscape's Trace Bitmap ("Multiple scans" with colours, the same as the
// dialog): Potrace underneath, with Inkscape's own colour scanning. Run
// through the command line on a throwaway SVG with the picture embedded,
// which is then cut back out of the result. Embedded as a TIFF, not the
// PNG: the Mac app's command line only has GdkPixbuf's TIFF, GIF and SVG
// loaders, listed by paths relative to the bundle's Contents folder — so
// it's run from there too. Anything it can't load, it traces as a red
// "broken image" icon instead.
// Arguments: 8 colour scans, smoothed, stacked, background removed (so the
// SVG has a transparent background — though, stacked, white inside the
// drawing goes with it), speckles under 8px dropped, corners smoothed
// (1.2), curves optimised (tolerance 1).
export function traceWithInkscape(png: Buffer, { log = noLog, signal }: TraceOptions = {}): Promise<SvgTrace> {
  return timed(
    async () => {
      const { width = 1024, height = 1024 } = await sharp(png).metadata();
      const tiff = await sharp(png).flatten({ background: "#ffffff" }).tiff().toBuffer();
      const binary = inkscapeBinary();
      const bundleContents = binary.includes(".app/Contents/MacOS/") ? dirname(dirname(binary)) : undefined;
      const dir = await mkdtemp(join(tmpdir(), "inkscape-trace-"));
      try {
        const input = join(dir, "input.svg");
        const output = join(dir, "output.svg");
        await writeFile(
          input,
          `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image id="source" width="${width}" height="${height}" xlink:href="data:image/tiff;base64,${tiff.toString("base64")}"/></svg>`,
        );
        log(`Running ${binary}${bundleContents ? ` from ${bundleContents}` : ""} on a ${Math.round(tiff.length / 1024)} KB TIFF…`);
        try {
          await promisify(execFile)(
            binary,
            [
              input,
              `--actions=select-by-id:source;object-trace:8,true,true,true,8,1.2,1.0;export-filename:${output};export-plain-svg;export-do`,
            ],
            { timeout: 120_000, cwd: bundleContents, signal },
          );
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            throw new Error("Inkscape isn't installed here — set INKSCAPE_PATH to its command-line binary.");
          }
          throw error;
        }
        log("Trace Bitmap finished — removing the embedded picture and Inkscape's ids");
        const svg = (await readFile(output, "utf8")).replace(/<image\b[\s\S]*?\/>/, "");
        if (!/<path\b/.test(svg)) throw new Error("Inkscape didn't trace anything.");
        // Inkscape's ids and indentation, which nothing needs.
        return svg.replace(/\s+id="[^"]*"/g, "").replace(/>\s+</g, "><").replace(/\n\s*/g, " ");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
    { optimise: false },
  );
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
// outlines as strokes — so it's clean and editable where the tracers
// follow pixel edges. Slower, and less faithful to the exact picture.
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
