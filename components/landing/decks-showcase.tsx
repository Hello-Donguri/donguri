"use client";

import { useRef, useState, useSyncExternalStore } from "react";
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

// How tall the section is, in screens.
const SCREENS = 3;

// Where in the pinned scroll (0-1) each level takes over. Neither end
// lingers: Beginner is already on screen while the section scrolls into
// view, so it hands over almost as soon as the section pins, and Expert
// only stays long enough for its cards to deal in before the page carries
// on. Intermediate and Advanced share the middle.
const LEVEL_STARTS = [0, 0.04, 0.42, 0.82];

// Each level's colour: its step on the staircase, and the big disc behind
// the cards. Written out in full so Tailwind finds them.
const LEVEL_COLOUR: Record<DeckLevelKey, { soft: string; solid: string; disc: string }> = {
  beginner: { soft: "bg-matcha-soft text-matcha-dark", solid: "bg-matcha text-washi", disc: "bg-matcha-soft" },
  intermediate: { soft: "bg-ai-soft text-ai-dark", solid: "bg-ai text-washi", disc: "bg-ai-soft" },
  advanced: { soft: "bg-sakura-soft text-sakura-dark", solid: "bg-sakura text-washi", disc: "bg-sakura-soft" },
  expert: { soft: "bg-kin/25 text-acorn", solid: "bg-kin text-ink-on-light", disc: "bg-kin/25" },
};

// Where each level's label sits around the hand of cards, clockwise from
// the top left — so moving up a level goes round the corners.
const CORNER = [
  "top-0 left-0 sm:top-2 sm:left-2",
  "top-0 right-0 sm:top-2 sm:right-2",
  "right-0 bottom-0 sm:right-2 sm:bottom-2",
  "bottom-0 left-0 sm:bottom-2 sm:left-2",
];

// Where each card sits in the fanned hand: spread out, tipped outwards,
// the middle one on top.
const FAN = [
  { rotate: -9, y: 22, z: 1 },
  { rotate: 0, y: 0, z: 3 },
  { rotate: 9, y: 22, z: 2 },
];

// The little burst from a level's label as it's reached.
const SPARKS = [
  { x: -46, y: -30, className: "bg-kin" },
  { x: 44, y: -34, className: "bg-sakura" },
  { x: -30, y: -58, className: "bg-ai" },
  { x: 32, y: -60, className: "bg-matcha" },
  { x: 0, y: -72, className: "bg-kin" },
];

const subscribeWide = (onChange: () => void) => {
  const media = window.matchMedia("(min-width: 640px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

// Decks, from a first hello to business meetings. The section is pinned
// while you scroll through it, and the level steps up as you go. The four
// levels sit at the corners of the hand of cards, and the current one pops
// out — bigger, in its full colour, with a burst — as that level's decks
// are dealt in (the last level's flying away first) over a disc in its
// colour. Donguri, by the heading, dresses up a little more each level.
// The corner labels are buttons too: they scroll to their level. With reduced motion asked for, it's an ordinary section and the
// steps just switch.
export function DecksShowcase({ labels }: { labels: DecksLabels }) {
  const reduceMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [level, setLevel] = useState<DeckLevelKey>("beginner");
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  // Wider screens spread the hand further.
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia("(min-width: 640px)").matches,
    () => true,
  );

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (reduceMotion) return;
    const index = LEVEL_STARTS.findLastIndex((start) => value >= start);
    const next = LEVELS[Math.max(0, index)];
    if (next !== level) setLevel(next);
  });

  // A label scrolls to the middle of its level's stretch (Beginner, to the
  // very start), so the scroll and the labels never disagree.
  const pick = (key: DeckLevelKey) => {
    const section = ref.current;
    if (reduceMotion || !section) {
      setLevel(key);
      return;
    }
    const stretch = section.offsetHeight - window.innerHeight;
    const index = LEVELS.indexOf(key);
    const from = LEVEL_STARTS[index];
    const to = LEVEL_STARTS[index + 1] ?? 1;
    window.scrollTo({
      top: section.offsetTop + (index === 0 ? 0 : (from + to) / 2) * stretch,
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
            "overflow-hidden px-6",
            reduceMotion ? "py-20 sm:py-24" : "sticky top-0 flex h-svh items-center",
          )}
        >
          <div className="mx-auto grid w-full max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
            <div className="text-center lg:text-left">
              <p className="font-nunito text-sm font-extrabold uppercase tracking-[0.16em] text-acorn">
                {labels.eyebrow}
              </p>
              <h2 className="mt-3 font-nunito text-4xl font-black tracking-tight text-sumi text-balance sm:text-5xl">
                {labels.heading}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-lg text-sumi-soft text-pretty max-sm:hidden max-lg:[@media(max-height:820px)]:hidden lg:mx-0">
                {labels.body}
              </p>

              {/* Donguri, dressing up a little more at every level. */}
              <div className="relative mx-auto mt-6 h-24 w-24 sm:h-32 sm:w-32 lg:mx-0">
                <span aria-hidden className="absolute inset-x-3 bottom-0 h-4 rounded-full bg-sumi/10" />
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={level}
                    initial={{ y: -50, scale: 0.6, rotate: -15, opacity: 0 }}
                    animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ y: 20, scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 13 }}
                    className="relative"
                  >
                    <DonguriAvatar equippedAccessory={OUTFIT[level]} className="h-auto w-full" />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* The hand of cards, over a disc in the level's colour. */}
            <div className="relative flex h-[22rem] items-center justify-center sm:h-[28rem]">
              {/* The four levels, one at each corner — the current one pops. */}
              <div role="tablist" aria-label={labels.eyebrow} className="contents">
                {LEVELS.map((key, index) => {
                  const active = key === level;
                  return (
                    <motion.button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => pick(key)}
                      animate={{ scale: active ? 1.12 : 0.88, rotate: active ? (index % 2 ? 4 : -4) : 0 }}
                      whileHover={{ scale: active ? 1.16 : 0.96 }}
                      transition={{ type: "spring", stiffness: 420, damping: 12 }}
                      className={cn(
                        "absolute z-20 flex cursor-pointer flex-col items-center rounded-2xl px-3.5 py-2 transition-colors duration-300 sm:px-4 sm:py-2.5",
                        CORNER[index],
                        active ? cn(LEVEL_COLOUR[key].solid, "shadow-lg") : cn(LEVEL_COLOUR[key].soft, "opacity-70 shadow-sm"),
                      )}
                    >
                      <span className="font-nunito text-sm leading-tight font-black sm:text-base">
                        {labels.levels[key].name}
                      </span>
                      <span className="text-[10px] font-bold opacity-80 sm:text-[11px]">{labels.levels[key].cefr}</span>
                      {active &&
                        SPARKS.map((spark, sparkIndex) => (
                          <motion.span
                            key={`${key}-${sparkIndex}`}
                            aria-hidden
                            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
                            animate={{ x: spark.x, y: spark.y * (index >= 2 ? -1 : 1), opacity: 0, scale: 1 }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className={cn("pointer-events-none absolute top-1/2 left-1/2 h-2.5 w-2.5 rounded-full", spark.className)}
                          />
                        ))}
                    </motion.button>
                  );
                })}
              </div>

              <span
                aria-hidden
                className={cn(
                  "absolute top-1/2 left-1/2 aspect-square w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-500 sm:w-[30rem]",
                  LEVEL_COLOUR[level].disc,
                )}
              />
              <AnimatePresence initial={false}>
                {DECKS[level].map((deck, index) => {
                  const fan = FAN[index];
                  const spread = wide ? 62 : 30;
                  return (
                    <motion.div
                      key={deck.id}
                      // Dealt in from the deck (down and to the right),
                      // thrown away up and to the left.
                      initial={{ x: "70%", y: 160, rotate: 40, scale: 0.6, opacity: 0 }}
                      animate={{
                        x: `${(index - 1) * spread}%`,
                        y: fan.y,
                        rotate: fan.rotate,
                        scale: 1,
                        opacity: 1,
                      }}
                      exit={{ x: "-90%", y: -220, rotate: -35, scale: 0.7, opacity: 0, transition: { duration: 0.35 } }}
                      transition={{ type: "spring", stiffness: 170, damping: 17, delay: 0.1 + index * 0.12 }}
                      whileHover={{ y: fan.y - 18, rotate: 0, scale: 1.04, zIndex: 10 }}
                      style={{ zIndex: fan.z }}
                      className="absolute w-60 sm:w-72"
                    >
                      <MockDeckCard deck={deck} labels={labels} />
                    </motion.div>
                  );
                })}
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
