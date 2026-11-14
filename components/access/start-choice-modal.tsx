"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Compass, Layers, Rocket, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "@/components/i18n/locale-provider";
import { openFindDeck } from "@/components/vocab/find-deck-modal";
import { TOUR_CLOSED_EVENT, TOUR_EVENT } from "@/components/tour/app-tour";
import { quickStart } from "@/lib/actions/courses";
import { cn } from "@/lib/utils";

// Over the course page for someone who learnt the starter words as a guest
// and has just signed up (see getStarterStatus): how would they like to
// carry on? Quick start makes the first deck theirs and starts learning,
// Choose a deck opens the deck picker, and Take a tour plays the welcome
// tour, coming back here afterwards. Shown on every visit until they've
// picked any decks of their own; closing it just puts it away until then.
export function StartChoiceModal({
  courseSlug,
  firstDeckTitle,
}: {
  courseSlug: string;
  firstDeckTitle: string | null;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(true);
  const [toured, setToured] = useState(false);
  const [starting, setStarting] = useState(false);

  // Back once the tour's over, minus the tour.
  useEffect(() => {
    const onTourClosed = () => {
      setToured(true);
      setOpen(true);
    };
    window.addEventListener(TOUR_CLOSED_EVENT, onTourClosed);
    return () => window.removeEventListener(TOUR_CLOSED_EVENT, onTourClosed);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const chooseDeck = () => {
    setOpen(false);
    openFindDeck();
  };

  const takeTour = () => {
    setOpen(false);
    window.dispatchEvent(new Event(TOUR_EVENT));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-choice-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-sumi/60 p-4 backdrop-blur-[3px]"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative flex w-full max-w-md flex-col items-center rounded-3xl bg-raised px-6 pt-9 pb-7 text-center shadow-2xl sm:px-8"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("common.close", "Close")}
              className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sumi-soft transition hover:bg-sumi/5 hover:text-sumi"
            >
              <X className="h-5 w-5" />
            </button>

            <Image src="/images/mascot.png" alt="" width={1224} height={1285} className="profile-bob h-24 w-auto" />

            <h2 id="start-choice-title" className="mt-4 font-nunito text-2xl font-extrabold text-sumi text-balance">
              {t("start_choice.title", "You're all signed up!")}
            </h2>
            <p className="mt-2 text-sm text-sumi-soft text-pretty">
              {t("start_choice.body", "Great work on your first three words. How would you like to carry on?")}
            </p>

            <div className="mt-6 flex w-full flex-col gap-2.5">
              <form
                action={quickStart.bind(null, courseSlug)}
                onSubmit={() => setStarting(true)}
              >
                <ChoiceButton
                  type="submit"
                  disabled={starting}
                  primary
                  icon={Rocket}
                  title={t("start_choice.quick_start", "Quick start")}
                  subtitle={
                    firstDeckTitle
                      ? t("start_choice.quick_start_subtitle", "Start learning {{deck}}", { deck: firstDeckTitle })
                      : t("start_choice.quick_start_subtitle_plain", "Start learning straight away")
                  }
                />
              </form>
              <ChoiceButton
                onClick={chooseDeck}
                icon={Layers}
                title={t("start_choice.choose_deck", "Choose a deck")}
                subtitle={t("start_choice.choose_deck_subtitle", "Pick the topics you want to learn")}
              />
              {!toured && (
                <ChoiceButton
                  onClick={takeTour}
                  icon={Compass}
                  title={t("start_choice.take_tour", "Take a tour")}
                  subtitle={t("start_choice.take_tour_subtitle", "See everything Donguri can do")}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChoiceButton({
  icon: Icon,
  title,
  subtitle,
  primary = false,
  ...props
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  primary?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition disabled:cursor-wait disabled:opacity-60",
        primary
          ? "border-transparent bg-ai text-washi hover:bg-ai-dark"
          : "border-card-border bg-washi-soft text-sumi hover:bg-sumi/5",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          primary ? "bg-washi/20" : "bg-ai-soft text-ai-dark",
        )}
      >
        <Icon aria-hidden className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-nunito font-extrabold leading-tight">{title}</span>
        <span className={cn("block text-xs", primary ? "text-washi/85" : "text-sumi-soft")}>{subtitle}</span>
      </span>
      <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
