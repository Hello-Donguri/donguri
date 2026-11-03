// How ready a deck is to go live, as a ring with the percentage in it —
// on the admin course page's deck cards and the deck page's media summary,
// so the two always agree.

export type DeckMediaCounts = {
  // Words, and how many have an SVG picture and each voice's recording.
  total: number;
  svgImages: number;
  femaleVoice: number;
  maleVoice: number;
  // Example sentences, and how many have each voice's recording.
  sentences: number;
  sentenceFemaleVoice: number;
  sentenceMaleVoice: number;
};

// The share of the deck's media slots that are filled: three per word (an
// SVG picture, a female and a male recording) and two per example sentence
// (its female and male recordings).
export function deckReadiness(media: DeckMediaCounts): number {
  const slots = media.total * 3 + media.sentences * 2;
  if (slots === 0) return 0;
  const filled =
    media.svgImages + media.femaleVoice + media.maleVoice + media.sentenceFemaleVoice + media.sentenceMaleVoice;
  return Math.round((filled / slots) * 100);
}

export function ReadinessRing({
  percent,
  label,
  size = "sm",
}: {
  percent: number;
  // What it means, for screen readers and as a tooltip ("62% ready").
  label: string;
  size?: "sm" | "lg";
}) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const stroke = percent === 100 ? "stroke-matcha" : percent === 0 ? "stroke-shu" : "stroke-kin";

  return (
    <div role="img" aria-label={label} title={label} className={`relative shrink-0 ${size === "lg" ? "h-20 w-20" : "h-11 w-11"}`}>
      <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="4" className="stroke-sumi/10" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          className={`${stroke} transition-[stroke-dashoffset]`}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-bold tabular-nums text-sumi ${size === "lg" ? "text-lg" : "text-[10px]"}`}
      >
        {percent}%
      </span>
    </div>
  );
}
