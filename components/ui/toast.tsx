"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, CircleAlert, RotateCcw, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "@/components/i18n/locale-provider";

// The app's toasts — one card style for all of them, the one the "words
// ready to review" alert introduced: an icon tile, a title, an optional
// line and link, and a close button, bottom-right. Call toast() from any
// client code; the single <Toaster /> in the dashboard layout shows them,
// stacked, each for a few seconds. No context to thread through — it's a
// window event.

type Tone = "success" | "error" | "review";

export type ToastOptions = {
  title: string;
  body?: string;
  tone?: Tone;
  action?: { label: string; href: string };
  durationMs?: number;
  // A toast with the same key replaces the one already showing.
  key?: string;
};

type ShownToast = ToastOptions & { id: number };

const EVENT = "donguri:toast";
const DEFAULT_DURATION_MS = 4000;
let nextId = 1;

const TONES: Record<Tone, { Icon: LucideIcon; tile: string; link: string }> = {
  success: { Icon: CheckCircle2, tile: "bg-matcha-soft text-matcha-dark", link: "text-matcha-dark hover:text-matcha" },
  error: { Icon: CircleAlert, tile: "bg-shu/10 text-shu", link: "text-shu-dark hover:text-shu" },
  review: { Icon: RotateCcw, tile: "bg-sakura-soft text-sakura", link: "text-sakura-dark hover:text-sakura" },
};

// toast("Upload complete"), or toast({ title, body, tone, action, … }).
export function toast(options: string | ToastOptions) {
  if (typeof window === "undefined") return;
  const detail: ShownToast = { ...(typeof options === "string" ? { title: options } : options), id: nextId++ };
  window.dispatchEvent(new CustomEvent<ShownToast>(EVENT, { detail }));
}

export function Toaster() {
  const t = useTranslations();
  const reduceMotion = useReducedMotion();
  const [toasts, setToasts] = useState<ShownToast[]>([]);

  const dismiss = (id: number) => setToasts((current) => current.filter((item) => item.id !== id));

  useEffect(() => {
    const show = (event: Event) => {
      const added = (event as CustomEvent<ShownToast>).detail;
      setToasts((current) => [...current.filter((item) => !added.key || item.key !== added.key), added]);
      setTimeout(
        () => setToasts((current) => current.filter((item) => item.id !== added.id)),
        added.durationMs ?? DEFAULT_DURATION_MS,
      );
    };
    window.addEventListener(EVENT, show);
    return () => window.removeEventListener(EVENT, show);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => {
          const { Icon, tile, link } = TONES[item.tone ?? "success"];
          return (
            <motion.div
              key={item.id}
              layout
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-card-border bg-washi p-4 shadow-xl"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tile}`}>
                <Icon aria-hidden className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 self-center">
                <p className="font-semibold text-sumi">{item.title}</p>
                {item.body && <p className="mt-0.5 truncate text-sm text-sumi-soft">{item.body}</p>}
                {item.action && (
                  <Link
                    href={item.action.href}
                    onClick={() => dismiss(item.id)}
                    className={`mt-2 inline-flex text-sm font-semibold transition ${link}`}
                  >
                    {item.action.label}
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label={t("common.close", "Close")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sumi-soft transition hover:bg-sumi/5 hover:text-sumi"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
