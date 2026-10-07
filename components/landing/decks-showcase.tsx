"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { DonguriAvatar } from "@/components/icons/DonguriAvatar";
import type { AccessoryId } from "@/lib/levels";
import { cn } from "@/lib/utils";

export type DeckLevelKey = "beginner" | "intermediate" | "advanced" | "expert";

export type DecksLabels = {
  eyebrow: string;
  heading: string;
  body: string;
  levels: Record<DeckLevelKey, { name: string; cefr: string }>;
  vocabulary: string;
  grammar: string;
  mixed: string;
  wordsLabel: string;
  descriptions: Record<string, string>;
};

type MockDeck = {
  id: string;
  title: string;
  kind: "vocabulary" | "grammar" | "mixed";
  tag: string;
  words: number;
  // A picture, as most decks have — or, like a deck without one, its first
  // letter on a coloured tile.
  cover?: string;
  tile?: string;
  // A deck's own background colour, as admins can set (see DeckCard).
  bg?: { colour: string; light: boolean };
};

// What a learner might find at each level. Styled after the real deck
// cards in the deck finder (DeckCard in components/vocab/find-deck-modal.tsx).
const DECKS: Record<DeckLevelKey, MockDeck[]> = {
  beginner: [
    {
      id: "greetings",
      title: "Greetings",
      kind: "vocabulary",
      tag: "CEFR A1",
      words: 12,
      cover: "/vocab-images/hello.webp",
    },
    {
      id: "food",
      title: "Food & Drink",
      kind: "vocabulary",
      tag: "CEFR A1",
      words: 24,
      cover: "/vocab-images/noodles.webp",
    },
    {
      id: "be-verb",
      title: "I am, you are",
      kind: "grammar",
      tag: "CEFR A1",
      words: 6,
      tile: "bg-matcha-soft text-matcha-dark",
    },
  ],
  intermediate: [
    {
      id: "travel",
      title: "Travel in London",
      kind: "mixed",
      tag: "CEFR B1",
      words: 32,
      cover: "/images/london.webp",
    },
    {
      id: "sport",
      title: "Sports & Hobbies",
      kind: "vocabulary",
      tag: "CEFR B1",
      words: 28,
      cover: "/vocab-images/football.webp",
    },
    {
      id: "past",
      title: "Talking about the past",
      kind: "grammar",
      tag: "CEFR B1",
      words: 10,
      tile: "bg-matcha-soft text-matcha-dark",
      bg: { colour: "#c7cca3", light: true },
    },
  ],
  advanced: [
    {
      id: "opinions",
      title: "Opinions & debate",
      kind: "mixed",
      tag: "CEFR B2",
      words: 36,
      tile: "bg-sakura-soft text-sakura-dark",
    },
    {
      id: "health",
      title: "Health & wellbeing",
      kind: "vocabulary",
      tag: "CEFR B2",
      words: 30,
      cover: "/vocab-images/vegetable.webp",
    },
    {
      id: "conditionals",
      title: "If I had known…",
      kind: "grammar",
      tag: "CEFR B2",
      words: 8,
      tile: "bg-matcha-soft text-matcha-dark",
      bg: { colour: "#274537", light: false },
    },
  ],
  expert: [
    {
      id: "business",
      title: "Business meetings",
      kind: "mixed",
      tag: "CEFR C1",
      words: 40,
      tile: "bg-ai-soft text-ai-dark",
      bg: { colour: "#1a54c4", light: false },
    },
    {
      id: "idioms",
      title: "Idioms & phrasal verbs",
      kind: "vocabulary",
      tag: "CEFR C1",
      words: 45,
      tile: "bg-kin/30 text-sumi",
    },
    {
      id: "nuance",
      title: "Saying it with nuance",
      kind: "grammar",
      tag: "CEFR C1",
      words: 12,
      tile: "bg-matcha-soft text-matcha-dark",
    },
  ],
};

const LEVELS: DeckLevelKey[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
];

// Donguri dresses up as you go up a level.
const OUTFIT: Record<DeckLevelKey, AccessoryId | null> = {
  beginner: null,
  intermediate: "mohawk",
  advanced: "viking",
  expert: "pirate",
};

const BADGE: Record<MockDeck["kind"], string> = {
  vocabulary: "bg-ai-soft text-ai-dark",
  grammar: "bg-matcha-soft text-matcha-dark",
  mixed: "bg-sakura-soft text-sakura-dark",
};

// How tall the section is, in screens — a little over one screen of
// scrolling per level.
const SCREENS = 4;

// Decks, from a first hello to business meetings. The section is pinned
// while you scroll through it, and the level steps up as you go — beginner,
// intermediate, advanced, expert — with the cards and Donguri's outfit
// changing to match. The tabs still work: they scroll to their level. With
// reduced motion asked for, it's an ordinary section and the tabs just
// switch.
export function DecksShowcase({ labels }: { labels: DecksLabels }) {
  const reduceMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [level, setLevel] = useState<DeckLevelKey>("beginner");
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (reduceMotion) return;
    const next =
      LEVELS[Math.min(LEVELS.length - 1, Math.floor(value * LEVELS.length))];
    if (next !== level) setLevel(next);
  });

  // A tab scrolls to the middle of its level's stretch, so the scroll and
  // the picker never disagree.
  const pick = (key: DeckLevelKey) => {
    const section = ref.current;
    if (reduceMotion || !section) {
      setLevel(key);
      return;
    }
    const stretch = section.offsetHeight - window.innerHeight;
    const index = LEVELS.indexOf(key);
    window.scrollTo({
      top: section.offsetTop + ((index + 0.5) / LEVELS.length) * stretch,
      behavior: "smooth",
    });
  };

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="decks"
        ref={ref}
        className="relative bg-washi"
        style={{ height: reduceMotion ? undefined : `${SCREENS * 100}svh` }}
      >
        <div
          className={cn(
            "px-6",
            reduceMotion
              ? "py-20 sm:py-24"
              : "sticky top-0 flex h-svh items-center overflow-hidden",
          )}
        >
          <div className="mx-auto w-full max-w-6xl">
            <div className="grid items-center gap-3 sm:gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="text-center md:text-left">
                <p className="font-nunito text-sm font-extrabold uppercase tracking-[0.16em] text-acorn">
                  {labels.eyebrow}
                </p>
                <h2 className="mt-3 font-nunito text-4xl font-black tracking-tight text-sumi text-balance sm:text-5xl">
                  {labels.heading}
                </h2>
                <p className="mt-3 max-w-xl text-lg text-sumi-soft text-pretty max-sm:hidden max-md:[@media(max-height:760px)]:hidden md:max-w-lg">
                  {labels.body}
                </p>
              </div>

              {/* Donguri, changing outfit with the level. */}
              <div className="relative mx-auto flex h-20 w-20 items-end justify-center sm:h-36 sm:w-36 md:mx-0 md:h-44 md:w-44">
                <span
                  aria-hidden
                  className="absolute inset-x-3 bottom-0 h-5 rounded-full bg-sumi/10"
                />
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={level}
                    initial={{ y: -60, scale: 0.6, rotate: -15, opacity: 0 }}
                    animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ y: 20, scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 14 }}
                    className="relative w-full"
                  >
                    <DonguriAvatar
                      equippedAccessory={OUTFIT[level]}
                      className="h-auto w-full"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* The level picker, a sliding pill like the leaderboard tabs. */}
            <div
              role="tablist"
              aria-label={labels.eyebrow}
              className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-1 rounded-3xl bg-neutral-soft p-1.5 sm:mt-10 sm:grid-cols-4 sm:rounded-full"
            >
              {LEVELS.map((key, index) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={level === key}
                  onClick={() => pick(key)}
                  className={cn(
                    "relative cursor-pointer rounded-full px-4 py-2.5 text-center transition-colors",
                    level === key
                      ? "text-sumi"
                      : "text-sumi-soft hover:text-sumi",
                  )}
                >
                  {level === key && (
                    <motion.span
                      layoutId="deck-level-pill"
                      className="absolute inset-0 rounded-full bg-raised shadow-sm"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative flex items-center justify-center gap-2">
                    <span className="flex gap-0.5" aria-hidden>
                      {LEVELS.map((_, bar) => (
                        <span
                          key={bar}
                          className={cn(
                            "w-1 rounded-full",
                            ["h-1.5", "h-2.5", "h-3.5", "h-4.5"][bar],
                            bar <= index ? "bg-ai" : "bg-sumi/15",
                          )}
                        />
                      ))}
                    </span>
                    <span className="font-nunito text-sm font-extrabold">
                      {labels.levels[key].name}
                    </span>
                    <span className="hidden text-[11px] font-semibold text-sumi-soft lg:inline">
                      {labels.levels[key].cefr}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {/* How far through the levels the scroll is. */}
            {!reduceMotion && (
              <div
                aria-hidden
                className="mx-auto mt-3 h-1 max-w-3xl overflow-hidden rounded-full bg-sumi/10"
              >
                <motion.div
                  style={{ scaleX: scrollYProgress }}
                  className="h-full origin-left rounded-full bg-ai"
                />
              </div>
            )}

            {/* Two cards on a phone (one on a short one), so the pinned screen
              still fits. */}
            <div className="mt-6 grid gap-4 max-sm:[&>*:nth-child(3)]:hidden max-sm:[@media(max-height:740px)]:[&>*:nth-child(2)]:hidden sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {DECKS[level].map((deck, index) => (
                  <motion.div
                    key={deck.id}
                    layout
                    initial={{
                      opacity: 0,
                      y: 40,
                      rotate: index % 2 ? 4 : -4,
                      scale: 0.9,
                    }}
                    animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.9 }}
                    transition={{
                      type: "spring",
                      stiffness: 220,
                      damping: 20,
                      delay: index * 0.07,
                    }}
                  >
                    <MockDeckCard deck={deck} labels={labels} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}

function MockDeckCard({
  deck,
  labels,
}: {
  deck: MockDeck;
  labels: DecksLabels;
}) {
  const textClass = deck.bg
    ? deck.bg.light
      ? "text-ink-on-light"
      : "text-ink-on-dark"
    : "text-sumi";
  const mutedClass = deck.bg ? `${textClass} opacity-80` : "text-sumi-soft";
  const trackClass = deck.bg
    ? deck.bg.light
      ? "border-sumi/15 bg-sumi/10"
      : "border-white/20 bg-white/20"
    : "border-sumi/15 bg-washi";

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-4 rounded-2xl border p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md",
        deck.bg ? "border-transparent" : "border-card-border bg-washi",
      )}
      style={deck.bg ? { backgroundColor: deck.bg.colour } : undefined}
    >
      <div className="flex items-start gap-3.5">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-neutral-soft shadow-sm">
          {deck.cover ? (
            <Image
              src={deck.cover}
              alt=""
              width={160}
              height={160}
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className={cn(
                "flex h-full w-full items-center justify-center font-nunito text-2xl font-bold",
                deck.tile,
              )}
            >
              {deck.title.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]",
                BADGE[deck.kind],
              )}
            >
              {labels[deck.kind]}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em]",
                textClass,
                trackClass,
              )}
            >
              {deck.tag}
            </span>
          </div>
          <h3
            className={cn(
              "mt-1.5 font-nunito text-lg font-bold leading-snug",
              textClass,
            )}
          >
            {deck.title}
          </h3>
          <p
            className={cn("mt-1 line-clamp-2 text-sm leading-snug", mutedClass)}
          >
            {labels.descriptions[deck.id]}
          </p>
        </div>
      </div>

      <div className="mt-auto">
        <p className={cn("text-xs font-semibold", mutedClass)}>
          {labels.wordsLabel.replace("{{count}}", String(deck.words))}
        </p>
        <div
          className={cn(
            "mt-2 h-2 w-full overflow-hidden rounded-full border",
            trackClass,
          )}
        />
      </div>
    </div>
  );
}
