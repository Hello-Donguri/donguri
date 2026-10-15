// What drifts down the home and auth pages (see FallingLeaf): leaves most
// of the year, and something seasonal on the dates below. To add a season,
// put its pictures in public/images and add an entry — the first whose
// dates include today wins, and a range may wrap past New Year (e.g. Dec 30
// to Jan 2). Dates are inclusive, in the visitor's own time zone.

export type FallingImage = { src: string; width: number; height: number };

type MonthDay = { month: number; day: number };

type Season = { name: string; from: MonthDay; to: MonthDay; images: FallingImage[] };

const LEAVES: FallingImage[] = [
  { src: "/images/leaf.webp", width: 335, height: 303 },
  { src: "/images/leaf2.webp", width: 480, height: 544 },
];

const SEASONS: Season[] = [
  {
    name: "Halloween",
    from: { month: 10, day: 28 },
    to: { month: 10, day: 31 },
    images: [
      { src: "/images/bat.webp", width: 256, height: 119 },
      { src: "/images/pumpkin.webp", width: 256, height: 223 },
      { src: "/images/ghost.webp", width: 256, height: 249 },
    ],
  },
  {
    name: "Christmas",
    from: { month: 12, day: 1 },
    to: { month: 12, day: 29 },
    images: [
      { src: "/images/present.webp", width: 256, height: 254 },
      { src: "/images/xmastree.webp", width: 256, height: 380 },
      { src: "/images/snowman.webp", width: 246, height: 342 },
    ],
  },
];

// Month and day as one comparable number: Oct 28 → 1028.
const ordinal = ({ month, day }: MonthDay) => month * 100 + day;

function inSeason(today: MonthDay, { from, to }: Season): boolean {
  const now = ordinal(today);
  return ordinal(from) <= ordinal(to)
    ? now >= ordinal(from) && now <= ordinal(to)
    : now >= ordinal(from) || now <= ordinal(to);
}

// The pictures for `date` (today by default).
export function fallingImagesFor(date = new Date()): FallingImage[] {
  const today = { month: date.getMonth() + 1, day: date.getDate() };
  return SEASONS.find((season) => inSeason(today, season))?.images ?? LEAVES;
}
