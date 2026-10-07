"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

// Whether the visitor has asked for reduced motion — false on the server
// and for the first (hydrating) render in the browser, then the real
// answer. Framer Motion's own useReducedMotion reads the setting straight
// away in the browser, so a component that renders differently for it
// doesn't match the server's HTML and fails hydration; this waits a beat
// instead, and keeps up if the setting changes.
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
