"use client";

import { Compass } from "lucide-react";
import { TOUR_EVENT } from "@/components/tour/app-tour";

// Takes the course page's welcome tour again (see AppTour).
export function TourButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(TOUR_EVENT))}
      className="group mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-sumi-soft transition hover:text-sumi"
    >
      <Compass aria-hidden className="h-4 w-4 transition-transform group-hover:rotate-45" />
      {label}
    </button>
  );
}
