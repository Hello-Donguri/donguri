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
      className={`inline-flex items-center gap-2.5 font-nunito font-black tracking-tight ${className}`}
    >
      {/* The icon fills its square edge to edge, so it's clipped to a circle
          with a thin ring to hold its shape on the sage header. */}
      <img
        src="/images/logo.svg"
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-full ring-1 ring-header-border"
      />
      {/* Light mode sits on the sage header, where the red would be too
          faint, so the wordmark is ink; dark mode keeps the red. */}
      <span className={`text-xl text-sumi dark:text-shu ${wordmarkClassName}`}>Hello Donguri</span>
    </Link>
  );
}
