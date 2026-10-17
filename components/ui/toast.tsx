"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, CircleAlert } from "lucide-react";

// A small app-wide toast: call toast("Upload complete") from any client
// code, and the <Toaster /> in the dashboard layout shows it for a few
// seconds, bottom centre (the corner is the review reminder's). No context
// to thread through — it's a window event.

type Tone = "success" | "error";
type Toast = { id: number; message: string; tone: Tone };

const EVENT = "donguri:toast";
const VISIBLE_MS = 3000;
let nextId = 1;

export function toast(message: string, tone: Tone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Toast>(EVENT, { detail: { id: nextId++, message, tone } }));
}

export function Toaster() {
  const reduceMotion = useReducedMotion();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const show = (event: Event) => {
      const added = (event as CustomEvent<Toast>).detail;
      setToasts((current) => [...current, added]);
      setTimeout(() => setToasts((current) => current.filter((item) => item.id !== added.id)), VISIBLE_MS);
    };
    window.addEventListener(EVENT, show);
    return () => window.removeEventListener(EVENT, show);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:bottom-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 rounded-full border border-card-border bg-raised px-4 py-2.5 text-sm font-semibold text-sumi shadow-lg"
          >
            {item.tone === "success" ? (
              <CheckCircle2 aria-hidden className="h-4 w-4 text-matcha" />
            ) : (
              <CircleAlert aria-hidden className="h-4 w-4 text-shu" />
            )}
            {item.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
