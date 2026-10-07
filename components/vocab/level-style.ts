import { Bean, Crown, Sprout, TreeDeciduous } from "lucide-react";
import type { StageLevel } from "@/lib/srs";

// Each review level's look: acorn brown for a seed, greens as it grows,
// gold once it's a Master Oak. `pill` is the small badge on a word card;
// `tile`, `chip`, `badge` and `number` style the learnt-words garden,
// where the badge grows with the level. Its own module, not a client one,
// so both the word list (client) and the breakdown (server) can use it.
// Written out in full so Tailwind finds the classes.
export const LEVEL_STYLE: Record<
  StageLevel,
  {
    pill: string;
    icon: typeof Bean;
    tile: string;
    chip: string;
    badge: string;
    iconSize: string;
    number: string;
  }
> = {
  seed: {
    pill: "bg-acorn-soft text-acorn",
    icon: Bean,
    tile: "border-acorn/25 bg-acorn-soft/60",
    chip: "bg-acorn text-washi",
    badge: "h-10 w-10 -rotate-6",
    iconSize: "h-4 w-4",
    number: "text-acorn",
  },
  sapling: {
    pill: "bg-matcha-soft text-matcha-dark",
    icon: Sprout,
    tile: "border-matcha/25 bg-matcha-soft/50",
    chip: "bg-matcha-soft text-matcha-dark ring-2 ring-matcha/40",
    badge: "h-11 w-11 rotate-3",
    iconSize: "h-5 w-5",
    number: "text-matcha-dark",
  },
  oak: {
    pill: "bg-matcha text-washi",
    icon: TreeDeciduous,
    tile: "border-matcha/40 bg-matcha-soft",
    chip: "bg-matcha text-washi",
    badge: "h-12 w-12 -rotate-3",
    iconSize: "h-6 w-6",
    number: "text-matcha-dark",
  },
  master: {
    pill: "bg-kin text-ink-on-light",
    icon: Crown,
    tile: "border-kin/50 bg-kin/15",
    chip: "bg-kin text-ink-on-light",
    badge: "h-14 w-14 rotate-6",
    iconSize: "h-7 w-7",
    number: "text-sumi",
  },
};
