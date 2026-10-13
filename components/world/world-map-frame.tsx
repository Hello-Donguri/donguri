"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslations } from "@/components/i18n/locale-provider";
import type { WorldMapCountry } from "@/lib/world";
import { cn } from "@/lib/utils";

export type MapPin = WorldMapCountry & { x: number; y: number };

// The world map's interactive layer around the server-drawn outlines (see
// WorldMap): a pin on each country that's set up, a label on hover, and a
// click — on the country or its pin — opens its tour. Under the map, the
// same countries as buttons, for keyboards, screen readers and fingers too
// big for Hong Kong. On a phone the map keeps a readable size and scrolls
// sideways inside its frame.
export function WorldMapFrame({
  pins,
  hrefBase,
  width,
  height,
  children,
}: {
  pins: MapPin[];
  hrefBase: string;
  width: number;
  height: number;
  children: ReactNode;
}) {
  const t = useTranslations();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState<MapPin | null>(null);
  const byKey = new Map(pins.map((pin) => [pin.mapKey, pin]));

  const pinAt = (target: EventTarget) =>
    target instanceof Element
      ? byKey.get(target.closest<SVGElement>("[data-key]")?.dataset.key ?? "") ?? null
      : null;
  const open = (pin: MapPin) => router.push(`${hrefBase}/${pin.id}`);
  const progress = (pin: MapPin) =>
    t("world.items_progress", "{{owned}} of {{total}} items", { owned: pin.ownedCount, total: pin.itemCount });

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-x-auto rounded-4xl border-4 border-raised bg-ai-soft shadow-lg">
        <div className="relative min-w-[40rem]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="block h-auto w-full"
            role="img"
            aria-label={t("world.map_label", "World map")}
            onPointerMove={(event) => setHovered(pinAt(event.target))}
            onPointerLeave={() => setHovered(null)}
            onClick={(event) => {
              const pin = pinAt(event.target);
              if (pin) open(pin);
            }}
          >
            {children}
            {pins.map((pin, index) => {
              const complete = pin.itemCount > 0 && pin.ownedCount === pin.itemCount;
              return (
                <motion.g
                  key={pin.id}
                  data-key={pin.mapKey}
                  className="cursor-pointer"
                  initial={reduceMotion ? false : { y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.2 + index * 0.05 }}
                >
                  {/* Drawn with its tip at 0,0, so it grows from the tip on hover. */}
                  <g transform={`translate(${pin.x} ${pin.y}) scale(${hovered?.id === pin.id ? 1.25 : 1})`}>
                    <path
                      d="M0 0C-5-7-9-11-9-17a9 9 0 1 1 18 0c0 6-4 10-9 17z"
                      className={cn("stroke-raised stroke-2", complete ? "fill-matcha" : "fill-shu")}
                    />
                    <circle cy={-17} r={3.5} className="fill-raised" />
                  </g>
                </motion.g>
              );
            })}
          </svg>

          {hovered && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-2xl bg-raised px-3 py-2 text-center shadow-lg"
              style={{ left: `${(hovered.x / width) * 100}%`, top: `calc(${(hovered.y / height) * 100}% - 2.25rem)` }}
            >
              <p className="font-nunito font-black text-sumi">{hovered.name}</p>
              <p className="text-xs text-sumi-soft">{progress(hovered)}</p>
            </div>
          )}
        </div>
      </div>

      {pins.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-card-border p-6 text-center text-sumi-soft">
          {t("world.no_countries", "No countries to visit yet — check back soon!")}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {[...pins]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((pin) => {
              const complete = pin.itemCount > 0 && pin.ownedCount === pin.itemCount;
              return (
                <li key={pin.id}>
                  <Link
                    href={`${hrefBase}/${pin.id}`}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5",
                      complete
                        ? "border-matcha bg-matcha-soft text-matcha-dark"
                        : "border-kin bg-kin/20 text-sumi hover:bg-kin/40",
                    )}
                  >
                    {complete && <Check aria-hidden className="h-4 w-4" strokeWidth={3} />}
                    {pin.name}
                    <span className="text-xs font-bold tabular-nums text-sumi-soft">
                      {pin.ownedCount}/{pin.itemCount}
                    </span>
                  </Link>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
