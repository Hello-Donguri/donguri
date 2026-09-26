"use client";

import { useState } from "react";

type WordImageProps = {
  src: string;
  alt: string;
  className?: string;
  // Shown in place of the image when it fails to load.
  fallback?: React.ReactNode;
};

// Images may not exist yet (no upload, or a stale slug-based fallback path
// that 404s) — self-hides instead of showing a broken-image icon.
export function WordImage({ src, alt, className = "", fallback = null }: WordImageProps) {
  const [hidden, setHidden] = useState(false);

  if (hidden) return fallback;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- images may not exist yet and need to fail gracefully.
    <img
      src={src}
      alt={alt}
      onError={() => setHidden(true)}
      className={className}
    />
  );
}
