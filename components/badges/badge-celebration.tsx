"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { claimBadges, markBadgesSeen } from "@/lib/actions/badges";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ui/share-button";
import { PageTitle, PageSubtitle } from "@/components/ui/page-heading";
import { useTranslations } from "@/components/i18n/locale-provider";
import { badgeGoal } from "@/lib/badge-metrics";
import type { BadgeView } from "@/lib/badges";

type NewBadge = BadgeView & { awardId: string };

const CONFETTI_COLORS = ["#3b6444", "#e0a92e", "#3d7dc4", "#b5548f", "#7d5733"];

type ConfettiPiece = { id: number; x: number; y: number; rotate: number; delay: number; color: string };

function randomConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    x: (Math.random() - 0.5) * 420,
    y: 160 + Math.random() * 160,
    rotate: Math.random() * 540,
    delay: Math.random() * 0.25,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  }));
}

// Lives on the dashboard and each course page — where every learn, review
// and daily-challenge session ends up. On arrival it asks the server to
// award anything newly reached (see claimBadges), then celebrates each new
// badge in turn, the same way a level-up is celebrated: a burst of
// confetti, the badge spinning in on a ray of light, and a way to share it.
// Each one is marked seen as it's dismissed, so it's only ever shown once.
export function BadgeCelebration() {
  const [queue, setQueue] = useState<NewBadge[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    claimBadges()
      .then((badges) => {
        if (!active || badges.length === 0) return;
        setQueue(badges);
        setTotal(badges.length);
      })
      .catch((error) => console.error("Couldn't check for new badges:", error));
    return () => {
      active = false;
    };
  }, []);

  const current = queue[0];

  function handleContinue() {
    if (!current) return;
    markBadgesSeen([current.awardId]).catch((error) =>
      console.error("Couldn't mark badge as seen:", error),
    );
    setQueue((existing) => existing.slice(1));
  }

  return (
    <AnimatePresence mode="wait">
      {current && (
        <BadgeModal
          key={current.awardId}
          badge={current}
          position={total - queue.length + 1}
          total={total}
          isLast={queue.length === 1}
          onContinue={handleContinue}
        />
      )}
    </AnimatePresence>
  );
}

function BadgeModal({
  badge,
  position,
  total,
  isLast,
  onContinue,
}: {
  badge: NewBadge;
  position: number;
  total: number;
  isLast: boolean;
  onContinue: () => void;
}) {
  const t = useTranslations();
  const reduceMotion = useReducedMotion();
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  // Randomness stays out of render, so the burst is made just after mount
  // (same as the level-up modal).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time random burst generated after mount, since render itself must stay pure.
    setConfetti(reduceMotion ? [] : randomConfetti(28));
  }, [reduceMotion]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onContinue();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onContinue]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t("badges.unlocked", "Badge unlocked!")}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-sumi/60 p-4"
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-washi-soft p-8 text-center shadow-xl"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-24 flex justify-center">
          {confetti.map((piece) => (
            <motion.span
              key={piece.id}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
              animate={{ x: piece.x, y: piece.y, opacity: 0, rotate: piece.rotate, scale: 1 }}
              transition={{ duration: 1.6, delay: 0.35 + piece.delay, ease: "easeOut" }}
              className="absolute h-2.5 w-2 rounded-sm"
              style={{ backgroundColor: piece.color }}
            />
          ))}
        </div>

        {total > 1 && (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sumi-soft">
            {t("badges.progress", "Badge {{current}} of {{total}}", { current: position, total })}
          </p>
        )}

        <div className="relative mx-auto mt-2 flex h-44 w-44 items-center justify-center">
          {/* A slow burst of light behind the badge. */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 rounded-full opacity-60"
            style={{
              background:
                "repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--kin) 55%, transparent) 0deg 12deg, transparent 12deg 24deg)",
              maskImage: "radial-gradient(circle, black 30%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(circle, black 30%, transparent 70%)",
            }}
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 24, ease: "linear", repeat: Infinity }}
          />
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { scale: 0, rotate: -200 }}
            animate={reduceMotion ? { opacity: 1 } : { scale: [0, 1.15, 1], rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative h-32 w-32"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- an admin-uploaded bunny.net image. */}
            <img src={badge.imageUrl} alt={badge.name} className="h-full w-full object-contain drop-shadow-lg" />
            {/* A single shine sweeping across once it lands. */}
            {!reduceMotion && (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
              >
                <motion.span
                  className="absolute inset-y-0 w-1/3 -skew-x-12 bg-white/50 blur-sm"
                  initial={{ x: "-150%" }}
                  animate={{ x: "350%" }}
                  transition={{ duration: 0.9, delay: 1, ease: "easeInOut" }}
                />
              </motion.span>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <PageTitle className="mt-4">
            {t("badges.unlocked", "Badge unlocked!")}
          </PageTitle>
          <p className="mt-2 font-nunito text-2xl font-extrabold text-matcha-dark">{badge.name}</p>
          <PageSubtitle className="mt-1">{badgeGoal(badge.metric, badge.threshold, t, badge.timescale)}</PageSubtitle>
        </motion.div>

        <div className="mt-7 flex flex-col gap-3">
          <ShareButton
            title={t("badges.share_title", "Donguri")}
            text={t("badges.share_text", "I just earned the {{name}} badge in Donguri!", {
              name: badge.name,
            })}
          />
          <Button
            size="lg"
            fullWidth
            onClick={onContinue}
            autoFocus
            className="shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          >
            {isLast ? t("common.continue", "Continue") : t("badges.next", "Next badge")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
