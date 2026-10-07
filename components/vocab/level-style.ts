import { Bean, Crown, Sprout, TreeDeciduous } from "lucide-react";
import type { StageLevel } from "@/lib/srs";

// Each review level's pill and icon: acorn brown for a seed, greens as it
// grows, gold once it's a Master Oak. Its own module, not a client one, so
// both the word list (client) and the learnt-words breakdown (server) can
// use it. Written out in full so Tailwind finds the classes.
export const LEVEL_STYLE: Record<StageLevel, { pill: string; icon: typeof Bean }> = {
  seed: { pill: "bg-acorn-soft text-acorn", icon: Bean },
  sapling: { pill: "bg-matcha-soft text-matcha-dark", icon: Sprout },
  oak: { pill: "bg-matcha text-washi", icon: TreeDeciduous },
  master: { pill: "bg-kin text-ink-on-light", icon: Crown },
};
