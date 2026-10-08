"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Jyutping } from "@/components/vocab/jyutping";
import { useTranslations } from "@/components/i18n/locale-provider";
import type { ChallengeItem, ChallengeTarget } from "@/lib/daily-challenge";
import { cn } from "@/lib/utils";

// When each part of the intro lands, in seconds — Charles first, then the
// targets one by one, then the button, so the eye follows them in order.
const CHARLES_AT = 0.1;
const FIRST_CARD_AT = 0.45;
const CARD_STAGGER = 0.35;

// Shown over the daily challenge before the chat starts, so the learner
// knows exactly what to use before Charles's first message: each target as
// a big card that springs in, words in blue and grammar in green (the app's
// colours for each). Charles's opener keeps loading behind it. Reopened
// from the chat's target strip.
export function ChallengeIntroModal({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: ChallengeTarget;
  onClose: () => void;
}) {
  const t = useTranslations();
  // document.body only exists after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag for the portal target.
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const items = [
    target.vocab && { kind: "vocab" as const, item: target.vocab },
    target.grammar && { kind: "grammar" as const, item: target.grammar },
  ].filter((entry): entry is { kind: "vocab" | "grammar"; item: ChallengeItem } => Boolean(entry));
  const buttonAt = FIRST_CARD_AT + items.length * CARD_STAGGER + 0.1;

  if (!mounted) return null;

  return createPortal(
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="challenge-intro-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex overflow-y-auto bg-sumi/70 p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              onClick={(event) => event.stopPropagation()}
              className="relative m-auto w-full max-w-md overflow-hidden rounded-3xl bg-washi-soft text-center shadow-2xl"
            >
              <div className="relative flex flex-col items-center bg-matcha px-6 pt-8 pb-14">
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="text-xs font-bold uppercase tracking-[0.16em] text-washi/90"
                >
                  {t("challenge_intro.eyebrow", "Today's challenge")}
                </motion.p>
                <motion.h2
                  id="challenge-intro-title"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.1 }}
                  className="mt-2 font-nunito text-2xl font-black text-washi text-balance"
                >
                  {items.length > 1
                    ? t("challenge_intro.title_both", "Use these in your chat!")
                    : t("challenge_intro.title_one", "Use this in your chat!")}
                </motion.h2>
              </div>

              {/* Charles peeks over the edge of the header, with a little
                  wobble as he lands. */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: [-20, 10, -4, 0] }}
                transition={{
                  scale: { type: "spring", stiffness: 320, damping: 14, delay: CHARLES_AT },
                  rotate: { duration: 0.7, delay: CHARLES_AT },
                }}
                className="relative z-10 mx-auto -mt-11 h-20 w-20"
              >
                <Image
                  src="/images/charles.webp"
                  alt="Charles Duck"
                  width={160}
                  height={160}
                  className="h-20 w-20 rounded-full bg-washi-soft object-cover ring-4 ring-washi-soft shadow-lg"
                />
              </motion.div>

              <div className="px-6 pt-4 pb-7">
                <ul className="flex flex-col items-stretch gap-3">
                  {items.map(({ kind, item }, index) => (
                    <TargetCard
                      key={item.term}
                      kind={kind}
                      item={item}
                      showRomanization={target.targetLanguage === "yue"}
                      delay={FIRST_CARD_AT + index * CARD_STAGGER}
                      tilt={index % 2 === 0 ? -2 : 2}
                      joiner={index > 0}
                    />
                  ))}
                </ul>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: buttonAt }}
                  className="mt-5 text-sm text-sumi-soft text-pretty"
                >
                  {items.length > 1
                    ? t(
                        "challenge_intro.how_both",
                        "Chat with Charles Duck and use both in your replies — together or one at a time.",
                      )
                    : t(
                        "challenge_intro.how_one",
                        "Chat with Charles Duck and use it naturally in one of your replies.",
                      )}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 15, delay: buttonAt + 0.1 }}
                  className="mt-5"
                >
                  <Button size="lg" fullWidth autoFocus onClick={onClose}>
                    {t("challenge_intro.start", "Let's chat!")}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>,
    document.body,
  );
}

function TargetCard({
  kind,
  item,
  showRomanization,
  delay,
  tilt,
  joiner,
}: {
  kind: "vocab" | "grammar";
  item: ChallengeItem;
  showRomanization: boolean;
  delay: number;
  tilt: number;
  // A "+" above the second card, so two read as "this and this".
  joiner: boolean;
}) {
  const t = useTranslations();
  const isWord = kind === "vocab";

  return (
    <li className="flex flex-col items-center gap-3">
      {joiner && (
        <motion.span
          aria-hidden
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 14, delay: delay - 0.1 }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-kin font-nunito text-lg font-black text-ink-on-light shadow-sm"
        >
          +
        </motion.span>
      )}
      <motion.div
        initial={{ scale: 0.3, opacity: 0, rotate: tilt * 6, y: 20 }}
        animate={{ scale: 1, opacity: 1, rotate: tilt, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 15, delay }}
        className={cn(
          "relative w-full rounded-2xl border-2 px-5 pt-5 pb-4 shadow-md",
          isWord ? "border-ai/40 bg-ai-soft" : "border-matcha/40 bg-matcha-soft",
        )}
      >
        <span
          className={cn(
            "absolute -top-3 left-4 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-washi shadow-sm",
            isWord ? "bg-ai" : "bg-matcha",
          )}
        >
          {isWord ? t("challenge_intro.kind_word", "Word") : t("challenge_intro.kind_grammar", "Grammar")}
        </span>
        <p
          className={cn(
            "font-nunito text-3xl font-black leading-tight break-words",
            isWord ? "text-ai-dark" : "text-matcha-dark",
          )}
        >
          {item.term}
        </p>
        {showRomanization && item.romanization && (
          <p className="mt-1 text-sm">
            <Jyutping text={item.romanization} />
          </p>
        )}
        <p className="mt-1 font-semibold text-sumi">{item.translation}</p>
        {item.explanation && (
          <p className="mt-1 text-xs leading-relaxed text-sumi-soft text-pretty">{item.explanation}</p>
        )}
      </motion.div>
    </li>
  );
}
