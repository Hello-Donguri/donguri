"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const PIECES = ["🌰", "💛", "✨", "🌰", "💛", "✨", "🌰", "💛"];

// A little celebration when someone's followed: acorns, hearts and
// sparkles pop out of the button all round and fade. `burst` is a fresh
// number per follow (null for none); put it inside a `relative` parent.
// Nothing at all for reduced motion.
export function FollowBurst({ burst }: { burst: number | null }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;

  return (
    <AnimatePresence>
      {burst !== null && (
        <span key={burst} aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {PIECES.map((piece, index) => {
            const angle = (index / PIECES.length) * Math.PI * 2;
            return (
              <motion.span
                key={index}
                className="absolute text-sm"
                initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
                animate={{
                  x: Math.cos(angle) * 34,
                  y: Math.sin(angle) * 26 - 6,
                  scale: 1,
                  opacity: 0,
                  rotate: index % 2 ? 25 : -25,
                }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                {piece}
              </motion.span>
            );
          })}
        </span>
      )}
    </AnimatePresence>
  );
}
