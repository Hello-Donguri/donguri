// The ring around a learner's Donguri avatar, one style per level (index =
// level). Levels past the end of the list keep the last style, so adding a
// level in lib/levels.ts never breaks anything — append a style here when
// that level should look different. Full class strings, not built from
// parts, so Tailwind can see them.
const LEVEL_RINGS = [
  "ring-4 ring-washi", // Lv 0
  "ring-4 ring-matcha", // Lv 1
  "ring-4 ring-ai", // Lv 2
  "ring-[5px] ring-sakura", // Lv 3
  "ring-[5px] ring-kin", // Lv 4
  "ring-[6px] ring-shu ring-offset-4 ring-offset-kin", // Lv 5
];

export function levelRingClass(level: number): string {
  return LEVEL_RINGS[Math.min(Math.max(level, 0), LEVEL_RINGS.length - 1)];
}
