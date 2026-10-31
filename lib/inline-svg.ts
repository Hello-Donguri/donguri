import "server-only";

import { createHash } from "node:crypto";
import { cacheLife } from "next/cache";
import { imageUrl } from "@/lib/bunny";
import type { InlineSvg } from "@/lib/definitions";
import { isSafeSvgText } from "@/lib/svg";

// Word pictures that are SVGs are put straight into the page as markup
// (see WordImage) rather than loaded from bunny.net as a separate file:
// they arrive with the page instead of popping in after it. Anything that
// can't be inlined safely just stays an <img>.

// Bigger than any word picture should be (they're capped at 100KB when
// chosen — see GENERATED_IMAGE_MAX_BYTES) — anything over is left as a file.
const MAX_INLINE_BYTES = 200 * 1024;

const ESCAPE = /[.*+?^${}()|[\]\\]/g;

// Markup inlined into a page shares it with everything else there, so each
// picture's ids, classes and <style> rules get a prefix of their own:
// otherwise two pictures that both use `cls-1` or `clip-1` (as Illustrator
// exports do) restyle or clip each other, and a rule like `path { fill:
// red }` would reach the whole page. The root <svg> is set to fill the
// <svg> WordImage wraps it in, which carries the picture's viewBox and the
// page's sizing classes.
export function prepareInlineSvg(text: string, prefix: string): InlineSvg | null {
  if (text.length > MAX_INLINE_BYTES || !isSafeSvgText(text)) return null;

  let svg = text
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(metadata|title|desc)\b[\s\S]*?<\/\1>/gi, "")
    .trim();

  const root = svg.match(/<svg\b[^>]*>/i)?.[0];
  if (!root) return null;
  const attribute = (name: string) => root.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
  let viewBox = attribute("viewBox")?.trim();
  if (!viewBox) {
    const width = parseFloat(attribute("width") ?? "");
    const height = parseFloat(attribute("height") ?? "");
    if (!(width > 0 && height > 0)) return null;
    viewBox = `0 0 ${width} ${height}`;
  }

  // Ids, and everything that points at one.
  const ids = [...svg.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const id of new Set(ids)) {
    const name = id.replace(ESCAPE, "\\$&");
    svg = svg
      .replace(new RegExp(`(\\sid\\s*=\\s*["'])${name}(["'])`, "g"), `$1${prefix}-${id}$2`)
      .replace(new RegExp(`url\\(\\s*(["']?)#${name}\\1\\s*\\)`, "g"), `url(#${prefix}-${id})`)
      .replace(new RegExp(`(href\\s*=\\s*["'])#${name}(["'])`, "g"), `$1#${prefix}-${id}$2`);
  }

  // Classes.
  svg = svg.replace(
    /(\sclass\s*=\s*["'])([^"']*)(["'])/gi,
    (_, open: string, names: string, close: string) =>
      `${open}${names
        .split(/\s+/)
        .filter(Boolean)
        .map((name) => `${prefix}-${name}`)
        .join(" ")}${close}`,
  );

  // <style> rules: their class and id selectors renamed to match, and every
  // selector kept inside this picture. Values (`fill: #fff`) aren't
  // selectors, so only the text before each `{` is touched.
  svg = svg.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, open: string, css: string, close: string) => {
    const scoped = css
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/(^|[{}])([^{}@]+)\{/g, (__, before: string, selectors: string) => {
        const list = selectors
          .split(",")
          .map((selector) => selector.trim())
          .filter(Boolean)
          .map(
            (selector) =>
              `.${prefix} ${selector.replace(/([.#])(-?[_a-zA-Z][\w-]*)/g, (___, sign: string, name: string) =>
                sign === "." || ids.includes(name) ? `${sign}${prefix}-${name}` : `${sign}${name}`,
              )}`,
          );
        return `${before}${list.join(", ")}{`;
      });
    return `${open}${scoped}${close}`;
  });

  // The root fills the wrapper, and carries the prefix the <style> rules
  // are scoped to.
  const newRoot = root
    .replace(/\s(width|height|x|y)\s*=\s*["'][^"']*["']/gi, "")
    .replace(/(\sclass\s*=\s*["'])/i, `$1${prefix} `)
    .replace(/^<svg\b/i, (start) =>
      `${start} width="100%" height="100%"${/\sclass\s*=/i.test(root) ? "" : ` class="${prefix}"`}`,
    );
  svg = svg.replace(root, newRoot);

  return { viewBox, markup: svg };
}

// A picture's markup, ready to inline — fetched from bunny.net once and
// kept: a word picture's key is new on every upload (see buildImageKey), so
// the file behind a URL never changes. A failed fetch throws, so it isn't
// kept and the next request tries again.
async function inlineSvgFor(url: string): Promise<InlineSvg | null> {
  "use cache";
  cacheLife("max");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Couldn't load ${url} (${response.status}).`);
  const prefix = `s${createHash("sha1").update(url).digest("hex").slice(0, 8)}`;
  return prepareInlineSvg(await response.text(), prefix);
}

function isUploadedSvg(src: string) {
  return src.startsWith(imageUrl("")) && /\.svg$/i.test(src);
}

type WithImage = { image: string; imageSvg?: InlineSvg | null };

// Gives every word picture in `value` — anything with an `image` URL, at
// any depth (a learn batch's words, a quiz's questions) — its markup as
// `imageSvg` when it's an uploaded SVG that can be inlined. Everything
// else is left as it is, and so shown from its URL.
export async function withInlineSvgs<T>(value: T): Promise<T> {
  const pictures: WithImage[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
    } else if (node && typeof node === "object") {
      const record = node as Record<string, unknown>;
      if (typeof record.image === "string" && isUploadedSvg(record.image)) pictures.push(record as WithImage);
      Object.values(record).forEach(visit);
    }
  };
  visit(value);

  const urls = [...new Set(pictures.map((picture) => picture.image))];
  const markup = new Map(
    await Promise.all(
      urls.map(async (url) => [url, await inlineSvgFor(url).catch(() => null)] as const),
    ),
  );
  for (const picture of pictures) picture.imageSvg = markup.get(picture.image) ?? null;
  return value;
}
