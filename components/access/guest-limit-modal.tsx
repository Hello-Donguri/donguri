"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n/locale-provider";
import { FREE_GRAMMAR_LIMIT, FREE_VOCAB_LIMIT } from "@/lib/access";

// Once in a browser session, so closing it isn't undone by every visit back
// to the course page. Best-effort: without storage it just shows each time.
const DISMISSED_KEY = "donguri:guest-limit-modal-dismissed";

// Over the course page once a guest has used their free words (see
// lib/access.ts): asks them to sign up to get more, without taking them
// anywhere. Closable — the banner and the locked cards still lead to
// sign-up afterwards.
export function GuestLimitModal() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after mount.
    if (!dismissed) setOpen(true);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const perks = [
    t("limit.guest_perk_save", "Your progress is saved"),
    t("limit.guest_perk_allowance", "{{vocab}} words and {{grammar}} grammar points free", {
      vocab: FREE_VOCAB_LIMIT,
      grammar: FREE_GRAMMAR_LIMIT,
    }),
    t("limit.guest_perk_devices", "Pick up on your phone or computer"),
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-limit-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-sumi/60 p-4 backdrop-blur-[3px]"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(event) => event.stopPropagation()}
            className="relative flex w-full max-w-md flex-col items-center rounded-3xl bg-raised px-6 pt-9 pb-7 text-center shadow-2xl sm:px-8"
          >
            <button
              type="button"
              onClick={close}
              aria-label={t("common.close", "Close")}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-sumi-soft transition hover:bg-sumi/5 hover:text-sumi"
            >
              <X className="h-5 w-5" />
            </button>

            <Image src="/images/mascot.png" alt="" width={1224} height={1285} className="profile-bob h-24 w-auto" />

            <h2 id="guest-limit-title" className="mt-4 font-nunito text-2xl font-extrabold text-sumi text-balance">
              {t("guest_banner.nearly_out_title", "Sign up to get more words")}
            </h2>
            <p className="mt-2 text-sm text-sumi-soft text-pretty">
              {t(
                "guest_limit_modal.body",
                "You've used your free words. Create a free account to keep what you've learnt and carry on.",
              )}
            </p>

            <ul className="mt-5 flex flex-col gap-2 text-left text-sm text-sumi">
              {perks.map((perk) => (
                <li key={perk} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-matcha text-washi" aria-hidden>
                    <Check className="h-3 w-3" strokeWidth={3.5} />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <Button href="/signup" size="lg" fullWidth className="mt-7">
              {t("limit.guest_cta", "Sign up free")}
            </Button>
            <button
              type="button"
              onClick={close}
              className="mt-3 text-sm font-medium text-sumi-soft transition hover:text-sumi"
            >
              {t("guest_limit_modal.later", "Maybe later")}
            </button>
            <p className="mt-4 text-xs text-sumi-soft">
              {t("limit.have_account", "Already have an account?")}{" "}
              <Link href="/login" className="font-semibold text-ai-dark underline-offset-2 hover:underline">
                {t("nav.log_in", "Log in")}
              </Link>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
