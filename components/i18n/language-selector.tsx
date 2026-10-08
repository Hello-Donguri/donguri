"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Globe, X } from "lucide-react";
import { setLocale } from "@/lib/actions/locale";
import { useLocale, useTranslations } from "@/components/i18n/locale-provider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

// Each language's name in English, under its own name in the list, so
// either reader can find theirs.
const ENGLISH_NAMES: Record<Locale, string> = {
  en: "English",
  ja: "Japanese",
};

// The site language as a button showing the current one, which opens a
// modal to pick another. Portalled to <body> so a header's overflow or
// stacking can't clip it. (The dashboard's account menu keeps the inline
// LocaleSwitcher, since a modal opened from that menu would close with it.)
export function LanguageSelector({ className }: { className?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  // document.body only exists after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag for the portal target.
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const choose = (next: Locale) => {
    if (next !== locale) startTransition(() => setLocale(next));
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        aria-haspopup="dialog"
        aria-label={t("language_selector.open", "Language: {{language}}", {
          language: LOCALE_LABELS[locale],
        })}
        className={cn(
          // Just the globe on phones, where the header has no room to spare.
          "inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-sumi/15 text-sm font-medium text-sumi-soft transition hover:border-sumi/30 hover:text-sumi disabled:opacity-60 sm:w-auto sm:px-3",
          className,
        )}
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
        <ChevronDown className="hidden h-3.5 w-3.5 sm:block" aria-hidden="true" />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="language-selector-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-50 flex items-center justify-center bg-sumi/60 p-4"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.97, opacity: 0, y: 6 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  onClick={(event) => event.stopPropagation()}
                  className="relative w-full max-w-sm rounded-3xl bg-raised p-6 shadow-2xl"
                >
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t("language_selector.close", "Close")}
                    className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-sumi-soft transition hover:bg-sumi/5 hover:text-sumi"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <h2
                    id="language-selector-title"
                    className="font-nunito text-xl font-extrabold tracking-tight text-sumi"
                  >
                    {t("language_selector.title", "Choose a language")}
                  </h2>

                  <ul className="mt-5 flex flex-col gap-2">
                    {LOCALES.map((code) => {
                      const selected = code === locale;
                      return (
                        <li key={code}>
                          <button
                            type="button"
                            onClick={() => choose(code)}
                            aria-current={selected ? "true" : undefined}
                            lang={code}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                              selected
                                ? "border-ai bg-ai-soft"
                                : "border-card-border hover:border-sumi/30 hover:bg-sumi/5",
                            )}
                          >
                            <span className="flex flex-col">
                              <span className="font-semibold text-sumi">{LOCALE_LABELS[code]}</span>
                              {ENGLISH_NAMES[code] !== LOCALE_LABELS[code] && (
                                <span className="text-xs text-sumi-soft">{ENGLISH_NAMES[code]}</span>
                              )}
                            </span>
                            {selected && <Check className="h-5 w-5 text-ai-dark" aria-hidden="true" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
