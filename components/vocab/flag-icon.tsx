import Image from "next/image";
import { cn } from "@/lib/utils";

// The flag used wherever a word can be flagged — Donguri's gold acorn flag
// (public/images/flagpole.webp) in place of a plain icon. In full colour
// when `on`; faded to grey when not, so flagged and unflagged still read
// apart at a glance. Size it with `className` (a height; the width follows).
export function FlagIcon({ on, className }: { on: boolean; className?: string }) {
  return (
    <Image
      src="/images/flagpole.webp"
      alt=""
      aria-hidden
      width={120}
      height={202}
      className={cn("w-auto shrink-0 transition", on ? "" : "opacity-45 grayscale", className)}
    />
  );
}
