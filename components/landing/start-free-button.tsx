import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startAsGuest } from "@/lib/actions/guest";
import { cn } from "@/lib/utils";

// "Start learning free" — straight into choosing a course, no sign-up (see
// startAsGuest). A form rather than a link, since it signs the visitor in
// as a guest. `note` is an optional small second line under the label
// ("No sign-up needed to start").
export function StartFreeButton({
  label,
  note,
  className,
  fullWidth,
}: {
  label: string;
  note?: string;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <form action={startAsGuest} className={cn(fullWidth && "w-full")}>
      <Button type="submit" size="lg" fullWidth={fullWidth} className={cn("h-14 px-8 text-base shadow-sm", className)}>
        {note ? (
          <span className="flex flex-col items-center leading-tight">
            <span>{label}</span>
            <span className="mt-0.5 text-xs font-medium opacity-80">{note}</span>
          </span>
        ) : (
          label
        )}
        <ArrowRight aria-hidden className="h-5 w-5" />
      </Button>
    </form>
  );
}
