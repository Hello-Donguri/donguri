import Link from "next/link";

// `wordmarkClassName` lets a caller hide the "Hello Donguri" text at some
// breakpoints (e.g. `sr-only md:not-sr-only`) while keeping the link's
// accessible name.
export function Logo({
  className = "",
  wordmarkClassName = "",
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-nunito font-bold tracking-tight ${className}`}
    >
      {/* Light mode sits on the sage header: cream chip, ink wordmark (the
          red would be too faint on sage). Dark mode keeps the red. */}
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-washi-soft text-lg text-washi ring-1 ring-header-border dark:bg-shu dark:ring-0">
        <img src="/images/mascot.png" alt="Duck" className="h-8 w-8" />
      </span>
      <span className={`text-xl text-sumi dark:text-shu ${wordmarkClassName}`}>Hello Donguri</span>
    </Link>
  );
}
