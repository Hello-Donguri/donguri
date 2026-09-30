import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// A badge image with its name in a small tooltip above it — on hover, and
// on keyboard focus (it's focusable for that). CSS only, so it works in
// server and client components alike. The name is also the label screen
// readers get, so the image inside should have empty alt text.
export function BadgeTooltip({
  name,
  children,
  className,
}: {
  name: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      tabIndex={0}
      aria-label={name}
      className={cn(
        "group/badge relative inline-flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ai",
        className,
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg bg-sumi px-2.5 py-1 text-xs font-semibold text-washi opacity-0 shadow-md transition duration-150 group-hover/badge:translate-y-0 group-hover/badge:opacity-100 group-focus-visible/badge:translate-y-0 group-focus-visible/badge:opacity-100"
      >
        {name}
        {/* The little arrow pointing down at the badge. */}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-sumi" />
      </span>
    </span>
  );
}
