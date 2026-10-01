import { ArrowRight } from "lucide-react";

// Looks like a button but isn't one — for the call to action inside a card
// that's already a link as a whole (the course page's activity cards, the
// dashboard's course cards). Grows its arrow's gap on the card's hover.
export function FakeButton({
  children,
  className,
  labelClassName,
}: {
  children: React.ReactNode;
  className: string;
  labelClassName?: string;
}) {
  return (
    <span
      className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold shadow-sm backdrop-blur-sm transition-[gap] group-hover:gap-3 ${className}`}
    >
      <span className={labelClassName}>{children}</span>
      <ArrowRight className="h-4 w-4 shrink-0" />
    </span>
  );
}
