"use client";

import { useState } from "react";
import type { InlineSvg } from "@/lib/definitions";

type WordImageProps = {
  src: string;
  alt: string;
  className?: string;
  // Shown in place of the image when it fails to load.
  fallback?: React.ReactNode;
  // The picture's markup, when it's an SVG put straight into the page (see
  // withInlineSvgs) — shown instead of loading `src`.
  svg?: InlineSvg | null;
};

// Images may not exist yet (no upload, or a stale slug-based fallback path
// that 404s) — self-hides instead of showing a broken-image icon. Only the
// src that failed stays hidden, so a new one (e.g. just uploaded) shows.
export function WordImage({ src, alt, className = "", fallback = null, svg = null }: WordImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  // Sized by the same classes as the <img> would be: the viewBox gives it
  // its shape, and object-cover's crop becomes the SVG equivalent ("slice").
  if (svg) {
    return (
      <svg
        viewBox={svg.viewBox}
        preserveAspectRatio={/\bobject-cover\b/.test(className) ? "xMidYMid slice" : undefined}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={className}
        // Checked for scripting and given its own prefixes before it gets
        // here (see prepareInlineSvg).
        dangerouslySetInnerHTML={{ __html: svg.markup }}
      />
    );
  }

  if (failedSrc === src) return fallback;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- images may not exist yet and need to fail gracefully.
    <img
      src={src}
      alt={alt}
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}
