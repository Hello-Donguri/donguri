"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  Flame,
  Layers,
  MessageCircle,
  PartyPopper,
  Sparkles,
  Sprout,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { DonguriAvatar } from "@/components/icons/DonguriAvatar";
import { useTranslations } from "@/components/i18n/locale-provider";
import { markTourSeen } from "@/lib/actions/profile";
import type { AccessoryId } from "@/lib/levels";
import { cn } from "@/lib/utils";

// Dispatched on window by TourButton to take the tour again.
export const TOUR_EVENT = "donguri:start-tour";

// Space around the spotlit element, and between it and the card.
const PAD = 8;
const GAP = 14;
const EDGE = 16;
const CARD_WIDTH = 360;

type Step = {
  id: string;
  // The element's `data-tour` value; none for the welcome and the finale,
  // which sit in the middle of the screen.
  target?: string;
  icon: LucideIcon;
  // The step's chip colours — the home page's palette, per section.
  chip: string;
  titleKey: string;
  title: string;
  bodyKey: string;
  body: string;
};

// In the order a learner would use them — learning first (new words, then
// where they come from, reviews and the daily challenge), then what keeps
// them coming back (streak, XP) and where to see progress. The page scrolls
// to each in turn. Steps whose element isn't on the page (or is hidden at
// this screen size) are skipped when the tour starts.
const STEPS: Step[] = [
  {
    id: "welcome",
    icon: Sparkles,
    chip: "bg-kin/25 text-acorn",
    titleKey: "tour.welcome_title",
    title: "Welcome to Donguri, {{name}}!",
    bodyKey: "tour.welcome_body",
    body: "I'm Donguri! Let me show you around — it only takes a minute.",
  },
  {
    id: "learn",
    target: "learn",
    icon: BookOpen,
    chip: "bg-ai-soft text-ai-dark",
    titleKey: "tour.learn_title",
    title: "Learn new words",
    bodyKey: "tour.learn_body",
    body: "Start here: learn three new words or grammar points at a time, with pictures and sound.",
  },
  {
    id: "decks",
    target: "decks",
    icon: Layers,
    chip: "bg-ai-soft text-ai-dark",
    titleKey: "tour.decks_title",
    title: "Choose your decks",
    bodyKey: "tour.decks_body",
    body: "New words come from your active decks. Browse decks to pick the topics you want to learn next.",
  },
  {
    id: "review",
    target: "review",
    icon: Clock,
    chip: "bg-shu/15 text-shu-dark",
    titleKey: "tour.review_title",
    title: "Review",
    bodyKey: "tour.review_body",
    body: "Words come back just before you'd forget them. Each review helps them grow, from a seed to a Master Oak.",
  },
  {
    id: "challenge",
    target: "challenge",
    icon: MessageCircle,
    chip: "bg-matcha-soft text-matcha-dark",
    titleKey: "tour.challenge_title",
    title: "Daily challenge",
    bodyKey: "tour.challenge_body",
    body: "Use what you've learnt in a quick chat with Charles Duck.",
  },
  {
    id: "streak",
    target: "streak",
    icon: Flame,
    chip: "bg-kin/25 text-acorn",
    titleKey: "tour.streak_title",
    title: "Keep your streak",
    bodyKey: "tour.streak_body",
    body: "Learn or review every day to grow your streak. Miss a day and it starts again!",
  },
  {
    id: "xp",
    target: "xp",
    icon: Sparkles,
    chip: "bg-sakura-soft text-sakura-dark",
    titleKey: "tour.xp_title",
    title: "Earn XP",
    bodyKey: "tour.xp_body",
    body: "Every correct answer earns XP. Level up to unlock new outfits for me!",
  },
  {
    id: "words",
    target: "words",
    icon: Sprout,
    chip: "bg-matcha-soft text-matcha-dark",
    titleKey: "tour.words_title",
    title: "Your word garden",
    bodyKey: "tour.words_body",
    body: "Every word you've learnt lives here, along with any lessons you've flagged to come back to.",
  },
  {
    id: "activity",
    target: "activity",
    icon: BarChart3,
    chip: "bg-ai-soft text-ai-dark",
    titleKey: "tour.activity_title",
    title: "Your progress",
    bodyKey: "tour.activity_body",
    body: "See what you've done this week, day by day, and the badges you've earned.",
  },
  {
    id: "leaderboard",
    target: "leaderboard",
    icon: Trophy,
    chip: "bg-kin/25 text-acorn",
    titleKey: "tour.leaderboard_title",
    title: "Leaderboards",
    bodyKey: "tour.leaderboard_body",
    body: "See how you rank against other learners, and your friends, this week.",
  },
  {
    id: "finish",
    icon: PartyPopper,
    chip: "bg-sakura-soft text-sakura-dark",
    titleKey: "tour.finish_title",
    title: "You're all set!",
    bodyKey: "tour.finish_body",
    body: "Here's where you're starting from. Let's grow together!",
  },
];

export type TourStat = {
  key: "words" | "xp" | "level" | "streak";
  label: string;
  value: number;
};

const STAT_STYLE: Record<TourStat["key"], { icon: LucideIcon; tile: string; iconClass: string }> = {
  words: { icon: BookOpen, tile: "border-ai/20 bg-ai-soft/60", iconClass: "text-ai-dark" },
  xp: { icon: Sparkles, tile: "border-sakura/20 bg-sakura-soft/60", iconClass: "text-sakura-dark" },
  level: { icon: Trophy, tile: "border-kin/30 bg-kin/15", iconClass: "text-acorn" },
  streak: { icon: Flame, tile: "border-shu/20 bg-shu/10", iconClass: "text-shu-dark" },
};

// The visible one of an element that may be rendered twice (the header's
// stats exist in a compact and a full version, one hidden by CSS).
function findTarget(name: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  for (const element of candidates) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return element;
  }
  return null;
}

type Box = { top: number; left: number; width: number; height: number };

// The spotlit area: the element plus padding, kept within the window so a
// section taller than the screen doesn't push the spotlight off it.
function spotlightBox(rect: DOMRect): Box {
  const top = Math.max(rect.top - PAD, EDGE / 2);
  const left = Math.max(rect.left - PAD, EDGE / 2);
  const bottom = Math.min(rect.bottom + PAD, window.innerHeight - EDGE / 2);
  const right = Math.min(rect.right + PAD, window.innerWidth - EDGE / 2);
  return { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
}

// Below the spotlight if it fits, else above, else over its lower part;
// centred on it across, kept inside the window.
function cardPosition(box: Box | null, cardHeight: number): { top: number; left: number; width: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_WIDTH, vw - EDGE * 2);
  if (!box) return { top: Math.max((vh - cardHeight) / 2, EDGE), left: (vw - width) / 2, width };

  const left = Math.min(Math.max(box.left + box.width / 2 - width / 2, EDGE), vw - width - EDGE);
  const below = box.top + box.height + GAP;
  const above = box.top - GAP - cardHeight;
  const top =
    below + cardHeight <= vh - EDGE ? below : above >= EDGE ? above : Math.max(vh - cardHeight - EDGE, EDGE);
  return { top, left, width };
}

// The course page's welcome tour: the page dims, and a spotlight glides
// from section to section — streak, XP, Learn, Review, the daily challenge,
// decks and the rest — each explained by Donguri in a card beside it,
// ending on the learner's stats. Starts by itself until it's been finished
// or dismissed once (saved on the profile — see markTourSeen); TourButton
// starts it again any time.
export function AppTour({
  autoStart,
  name,
  equippedAccessory,
  stats,
}: {
  autoStart: boolean;
  name: string;
  equippedAccessory: AccessoryId | null;
  stats: TourStat[];
}) {
  const t = useTranslations();
  const reduceMotion = useReducedMotion();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [index, setIndex] = useState(0);
  // The spotlit area, tagged with the step it was measured for, so a step
  // with nothing to spotlight never inherits the last one's.
  const [measured, setMeasured] = useState<{ stepId: string; box: Box } | null>(null);
  const [cardHeight, setCardHeight] = useState(260);
  const cardRef = useRef<HTMLDivElement>(null);
  // Only in the browser: the portal and the window sizes below.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const nextRef = useRef<HTMLButtonElement>(null);

  const open = steps !== null;
  const step = steps?.[index];
  const box = step && measured?.stepId === step.id ? measured.box : null;
  const isLast = steps !== null && index === steps.length - 1;

  const start = useCallback(() => {
    // Only the sections on the page right now.
    setSteps(STEPS.filter((candidate) => !candidate.target || findTarget(candidate.target)));
    setIndex(0);
  }, []);

  const close = useCallback(() => {
    setSteps(null);
    setMeasured(null);
    void markTourSeen();
  }, []);

  // First visit: start once the page has settled — after any celebration
  // dialog (a badge, a level-up) has been closed.
  useEffect(() => {
    if (!autoStart) return;
    let timer: ReturnType<typeof setTimeout>;
    const tryStart = () => {
      if (document.querySelector("dialog[open]")) {
        timer = setTimeout(tryStart, 1500);
      } else {
        start();
      }
    };
    timer = setTimeout(tryStart, 700);
    return () => clearTimeout(timer);
  }, [autoStart, start]);

  // Taking it again, from TourButton.
  useEffect(() => {
    window.addEventListener(TOUR_EVENT, start);
    return () => window.removeEventListener(TOUR_EVENT, start);
  }, [start]);

  // Each step: bring its section into view, then keep the spotlight on it
  // as the page scrolls (smoothly, at first) or resizes.
  useEffect(() => {
    const element = step?.target ? findTarget(step.target) : null;
    if (!step || !element) return;
    element.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    const measure = () => setMeasured({ stepId: step.id, box: spotlightBox(element.getBoundingClientRect()) });
    const frame = requestAnimationFrame(measure);
    window.addEventListener("scroll", measure, { passive: true, capture: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure, { capture: true });
      window.removeEventListener("resize", measure);
    };
  }, [step, reduceMotion]);

  // The card's height, for placing it — it changes from step to step.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new ResizeObserver(() => setCardHeight(card.offsetHeight));
    observer.observe(card);
    setCardHeight(card.offsetHeight);
    return () => observer.disconnect();
  }, [open]);

  // Keyboard: arrows to move, Escape to leave; focus on Next.
  useEffect(() => {
    if (!open || !steps) return;
    nextRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") setIndex((current) => Math.min(current + 1, steps.length - 1));
      else if (event.key === "ArrowLeft") setIndex((current) => Math.max(current - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, steps, close, index]);

  if (!mounted) return null;

  const card = open ? cardPosition(box, cardHeight) : null;
  const spring = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 170, damping: 24 };
  // With nothing to spotlight, the hole shrinks to a point mid-screen, so
  // the whole page stays dimmed.
  const hole = box ?? {
    top: window.innerHeight / 2,
    left: window.innerWidth / 2,
    width: 0,
    height: 0,
  };

  return createPortal(
    <AnimatePresence>
      {open && step && card && steps && (
        <motion.div
          key="tour"
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
        >
          {/* Catches clicks, so the page underneath can't be used mid-tour. */}
          <div className="absolute inset-0" aria-hidden />

          {/* The spotlight: a clear hole whose huge shadow dims everything
              else, gliding from section to section. */}
          <motion.div
            aria-hidden
            className="pointer-events-none fixed rounded-3xl"
            style={{ boxShadow: "0 0 0 200vmax color-mix(in oklab, var(--sumi) 62%, transparent)" }}
            initial={false}
            animate={hole}
            transition={spring}
          >
            {box && !reduceMotion && (
              <motion.span
                className="absolute inset-0 rounded-3xl ring-4 ring-kin"
                animate={{ opacity: [0.9, 0.35, 0.9] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </motion.div>

          {/* Donguri's explanation. */}
          <motion.div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            className="fixed rounded-3xl border border-card-border bg-raised p-5 pt-6 shadow-2xl"
            style={{ width: card.width }}
            initial={{ top: card.top + 20, left: card.left, scale: 0.92 }}
            animate={{ top: card.top, left: card.left, scale: 1 }}
            transition={spring}
          >
            {/* Donguri, peeking over the card's top edge. */}
            <motion.div
              key={`donguri-${step.id}`}
              className="absolute -top-12 right-5"
              initial={reduceMotion ? false : { y: 16, rotate: -12, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 14 }}
            >
              <DonguriAvatar equippedAccessory={equippedAccessory} className="h-16 w-auto drop-shadow-md" />
            </motion.div>

            <button
              type="button"
              onClick={close}
              aria-label={t("tour.skip", "Skip tour")}
              className="cursor-pointer absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full text-sumi-soft transition hover:bg-sumi/5 hover:text-sumi"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step.id}
                initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -24 }}
                transition={{ duration: 0.2 }}
                className="mt-4"
              >
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-nunito text-xs font-extrabold",
                    step.chip,
                  )}
                >
                  <step.icon aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {t("tour.step_of", "{{current}} of {{total}}", { current: index + 1, total: steps.length })}
                </span>
                <h2 id="tour-title" className="mt-2 font-nunito text-xl leading-tight font-black text-sumi">
                  {t(step.titleKey, step.title, { name })}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-sumi-soft">{t(step.bodyKey, step.body)}</p>

                {step.id === "finish" && <TourStats stats={stats} reduceMotion={!!reduceMotion} />}
              </motion.div>
            </AnimatePresence>

            <div className="mt-5 flex items-center justify-between gap-3">
              {/* Progress: a dot per step, the current one stretched. */}
              <div className="flex items-center gap-1" aria-hidden>
                {steps.map((candidate, i) => (
                  <motion.span
                    key={candidate.id}
                    className={cn("h-1.5 rounded-full", i <= index ? "bg-kin" : "bg-sumi/15")}
                    animate={{ width: i === index ? 18 : 6 }}
                    transition={spring}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {index > 0 && !isLast && (
                  <button
                    type="button"
                    onClick={() => setIndex(index - 1)}
                    aria-label={t("tour.back", "Back")}
                    className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-full border border-card-border text-sumi-soft transition hover:text-sumi"
                  >
                    <ArrowLeft aria-hidden className="h-4 w-4" />
                  </button>
                )}
                <button
                  ref={nextRef}
                  type="button"
                  onClick={() => (isLast ? close() : setIndex(index + 1))}
                  className="cursor-pointer group inline-flex items-center gap-1.5 rounded-full bg-ai px-4 py-2 font-nunito text-sm font-extrabold text-washi shadow-sm transition hover:bg-ai-dark"
                >
                  {isLast
                    ? t("tour.done", "Let's go!")
                    : index === 0
                      ? t("tour.start", "Show me around")
                      : t("tour.next", "Next")}
                  {!isLast && (
                    <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {step.id === "finish" && !reduceMotion && <Confetti />}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// The finale's stats, each tile popping in and counting up from zero.
function TourStats({ stats, reduceMotion }: { stats: TourStat[]; reduceMotion: boolean }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-2">
      {stats.map((stat, i) => {
        const style = STAT_STYLE[stat.key];
        return (
          <motion.div
            key={stat.key}
            className={cn("rounded-2xl border px-3 py-2.5", style.tile)}
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: reduceMotion ? 0 : 0.15 + i * 0.1, type: "spring", stiffness: 260, damping: 18 }}
          >
            <dt className="flex items-center gap-1 text-[11px] font-bold text-sumi-soft">
              <style.icon aria-hidden className={cn("h-3.5 w-3.5", style.iconClass)} strokeWidth={2.5} />
              {stat.label}
            </dt>
            <dd className="font-nunito text-2xl leading-tight font-black tabular-nums text-sumi">
              <CountUp value={stat.value} delay={0.2 + i * 0.1} instant={reduceMotion} />
            </dd>
          </motion.div>
        );
      })}
    </dl>
  );
}

function CountUp({ value, delay, instant }: { value: number; delay: number; instant: boolean }) {
  const [shown, setShown] = useState(instant ? value : 0);
  useEffect(() => {
    if (instant) return;
    const controls = animate(0, value, { duration: 1.1, delay, ease: "easeOut", onUpdate: setShown });
    return () => controls.stop();
  }, [value, delay, instant]);
  // Whole numbers while counting; the real value (XP can be a half) at the end.
  const done = shown === value;
  return <>{done && !Number.isInteger(value) ? value.toFixed(1) : Math.round(shown)}</>;
}

// A little burst of paper in the palette's colours, falling from the top.
const CONFETTI_COLOURS = ["bg-ai", "bg-sakura", "bg-kin", "bg-matcha", "bg-shu"];

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.6 + Math.random() * 1.2,
      rotate: (Math.random() - 0.5) * 720,
      drift: (Math.random() - 0.5) * 120,
      colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
      round: i % 3 === 0,
    })),
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          className={cn("absolute top-0 h-2.5 w-2", piece.colour, piece.round ? "rounded-full" : "rounded-[2px]")}
          style={{ left: `${piece.left}%` }}
          initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: "105vh", x: piece.drift, rotate: piece.rotate, opacity: [1, 1, 0] }}
          transition={{ duration: piece.duration, delay: piece.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
