import "server-only";

import sharp from "sharp";

// Near enough to white to count as background: light and not tinted (so
// a pale cream body isn't taken for it).
const isBackgroundWhite = (r: number, g: number, b: number) =>
  Math.min(r, g, b) >= 228 && Math.max(r, g, b) - Math.min(r, g, b) <= 24;

// How far into the drawing, in pixels, the soft edge along the background
// is made partly transparent.
const EDGE_BAND = 2;

// The generated picture with its white background made transparent. The
// image model draws on plain white (see VECTOR_STYLE in
// lib/word-image-generate.ts) — asking it for transparency directly is
// still a preview — so it's taken out here: the white reaching in from the
// picture's edges is cleared, and white inside the drawing (inside an
// eye, between a calendar's lines) is left alone. The anti-aliased pixels
// just along that cut, half outline and half white, have their white
// turned into transparency instead ("colour to alpha"), so the outlines
// don't keep a pale halo. A picture that already has transparency is
// returned as it is. `cleared` is the share of pixels made transparent.
export async function removeWhiteBackground(png: Buffer): Promise<{ png: Buffer; cleared: number }> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const count = width * height;

  let alreadyTransparent = 0;
  for (let p = 0; p < count; p++) if (data[p * 4 + 3] < 250) alreadyTransparent++;
  if (alreadyTransparent > count * 0.01) return { png, cleared: alreadyTransparent / count };

  // The background: white pixels joined to the edges of the picture.
  const background = new Uint8Array(count);
  const stack = new Int32Array(count);
  let top = 0;
  const visit = (p: number) => {
    if (background[p]) return;
    const i = p * 4;
    if (!isBackgroundWhite(data[i], data[i + 1], data[i + 2])) return;
    background[p] = 1;
    stack[top++] = p;
  };
  for (let x = 0; x < width; x++) {
    visit(x);
    visit((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    visit(y * width);
    visit(y * width + width - 1);
  }
  while (top) {
    const p = stack[--top];
    const x = p % width;
    if (x > 0) visit(p - 1);
    if (x < width - 1) visit(p + 1);
    if (p >= width) visit(p - width);
    if (p < count - width) visit(p + width);
  }

  let cleared = 0;
  for (let p = 0; p < count; p++) {
    if (background[p]) {
      data[p * 4 + 3] = 0;
      cleared++;
      continue;
    }
    // Within EDGE_BAND of the background: white out to alpha.
    const x = p % width;
    const y = (p / width) | 0;
    let nearBackground = false;
    for (let dy = -EDGE_BAND; dy <= EDGE_BAND && !nearBackground; dy++) {
      for (let dx = -EDGE_BAND; dx <= EDGE_BAND; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < width && yy >= 0 && yy < height && background[yy * width + xx]) {
          nearBackground = true;
          break;
        }
      }
    }
    if (!nearBackground) continue;
    const i = p * 4;
    const alpha = Math.max(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]) / 255;
    if (alpha <= 0.02) {
      data[i + 3] = 0;
      cleared++;
      continue;
    }
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(255 - (255 - data[i + c]) / alpha);
    data[i + 3] = Math.round(alpha * 255);
  }

  const out = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return { png: out, cleared: cleared / count };
}
