"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// The app's own colours, for the pieces.
const COLOURS = ["bg-kin", "bg-sakura", "bg-ai", "bg-matcha", "bg-acorn", "bg-kin"];

// A small, repeatable "random" for piece `index`, so every shower looks
// scattered without changing between renders.
function scatter(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  // Rounded, so the server's and the browser's numbers can't drift apart
  // in the last decimal places.
  return Math.round((value - Math.floor(value)) * 1000) / 1000;
}

// A one-off shower of confetti falling from the top of its (positioned)
// parent — strips and dots in the app's colours, each tumbling down on its
// own path and fading out. `pieces` sets how big a celebration it is. Never
// takes clicks; leave it out entirely for reduced motion.
export function Confetti({ pieces = 36, delay = 0 }: { pieces?: number; delay?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: pieces }, (_, index) => {
        const left = scatter(index, 1) * 100;
        const drift = (scatter(index, 2) - 0.5) * 160;
        const fall = 380 + scatter(index, 3) * 320;
        const spin = (scatter(index, 4) - 0.5) * 900;
        const round = scatter(index, 5) > 0.6;
        const duration = 1.8 + scatter(index, 6) * 1.2;
        const start = delay + scatter(index, 7) * 0.5;
        return (
          <motion.span
            key={index}
            initial={{ x: 0, y: -24, rotate: 0, opacity: 1 }}
            animate={{ x: drift, y: fall, rotate: spin, opacity: [1, 1, 0] }}
            transition={{
              duration,
              delay: start,
              ease: [0.2, 0.6, 0.4, 1],
              // A value's own transition replaces the shared one, so the
              // fade needs the duration and delay spelt out too.
              opacity: { duration, delay: start, times: [0, 0.7, 1] },
            }}
            className={cn(
              "absolute top-0",
              round ? "h-2.5 w-2.5 rounded-full" : "h-3.5 w-2 rounded-sm",
              COLOURS[index % COLOURS.length],
            )}
            style={{ left: `${left}%` }}
          />
        );
      })}
    </div>
  );
}
