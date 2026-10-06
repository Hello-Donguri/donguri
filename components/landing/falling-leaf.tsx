"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

// How far across its area a leaf may start, in percent of the width —
// kept in from the right edge so the leaf and its swing stay in view.
const MIN_LEFT = 4;
const MAX_LEFT = 82;

const randomLeft = () => MIN_LEFT + Math.random() * (MAX_LEFT - MIN_LEFT);

// Each leaf's own character, so they never fall in step: when it first
// appears, how long a fall takes, the pause before its next one, its size,
// and how wide it swings (a negative swing sets off the other way).
const LEAVES = [
  { delayMs: 600, fallSeconds: 12, pauseMs: 3000, className: "w-10 sm:w-12", swing: 1 },
  { delayMs: 4500, fallSeconds: 14, pauseMs: 2000, className: "w-8 sm:w-9", swing: -0.8 },
  { delayMs: 8500, fallSeconds: 10, pauseMs: 4000, className: "w-9 sm:w-11", swing: 1.2 },
];

type LeafProps = (typeof LEAVES)[number];

// One leaf, falling again and again: each fall starts somewhere new along
// the top, zigzags side to side, tipping into each swing, and has faded
// away completely well before the bottom. The start position is picked in
// the browser after load, so the server and client renders agree.
function Leaf({ delayMs, fallSeconds, pauseMs, className, swing }: LeafProps) {
  // Each fall is its own run: a fresh key restarts the animation, at a new
  // random `left`.
  const [fall, setFall] = useState<{ id: number; left: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(() => setFall({ id: 0, left: randomLeft() }), delayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [delayMs]);

  if (!fall) return null;

  const nextFall = () => {
    timer.current = setTimeout(
      () => setFall((current) => ({ id: (current?.id ?? 0) + 1, left: randomLeft() })),
      pauseMs,
    );
  };

  const once = { duration: fallSeconds };

  return (
    <motion.div
      key={fall.id}
      className={`absolute ${className}`}
      style={{ left: `${fall.left}%` }}
      initial={{ top: "-12%", x: 0, rotate: -20, opacity: 0 }}
      animate={{
        top: ["-12%", "85%"],
        x: [0, 70, -10, 80, 0, 60, 10].map((offset) => offset * swing),
        rotate: [-20, 25, -20, 25, -15, 20, -10].map((angle) => angle * Math.sign(swing)),
        // Gone by 80% of the way down, so it never reaches the bottom.
        opacity: [0, 1, 1, 1, 0.5, 0, 0],
      }}
      transition={{
        top: { ...once, ease: "linear" },
        x: { ...once, ease: "easeInOut" },
        rotate: { ...once, ease: "easeInOut" },
        opacity: { ...once, ease: "linear", times: [0, 0.06, 0.3, 0.55, 0.7, 0.8, 1] },
      }}
      onAnimationComplete={nextFall}
    >
      <Image src="/images/leaf.webp" alt="" width={335} height={303} className="h-auto w-full" />
    </motion.div>
  );
}

// A few leaves drifting down through the hero at once, as if from a tree
// above the page (see Leaf). Fills its (positioned) parent — and reaches up
// over the hero's top padding (pt-12 / sm:pt-14), so they come out from
// right under the header — sits behind the content, and never takes clicks.
// Nothing at all for visitors who've asked for reduced motion.
export function FallingLeaf() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-12 bottom-0 overflow-hidden sm:-top-14"
    >
      {LEAVES.map((leaf, index) => (
        <Leaf key={index} {...leaf} />
      ))}
    </div>
  );
}
