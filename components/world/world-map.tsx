import worldMap from "@/lib/world-map.json";
import { cn } from "@/lib/utils";
import type { WorldMapCountry } from "@/lib/world";
import { WorldMapFrame, type MapPin } from "@/components/world/world-map-frame";

// The learner's world map: every country's real outline (lib/world-map.json,
// built by scripts/build-world-map.mjs), drawn flat and chunky with a hard
// offset shadow so it reads as a cartoon. Countries an admin has set up are
// golden — green once every item there is picked — each with a pin, so
// small ones like Hong Kong are easy to hit. Rendered on the server, so the
// outlines never ship as JavaScript; WorldMapFrame adds the clicks.
export function WorldMap({ countries, hrefBase }: { countries: WorldMapCountry[]; hrefBase: string }) {
  const byKey = new Map(countries.map((country) => [country.mapKey, country]));
  const pins: MapPin[] = worldMap.countries.flatMap((shape) => {
    const country = byKey.get(shape.key);
    if (!country) return [];
    return [{ ...country, x: shape.pin[0], y: shape.pin[1] }];
  });

  return (
    <WorldMapFrame pins={pins} hrefBase={hrefBase} width={worldMap.width} height={worldMap.height}>
      <g className="drop-shadow-[2px_3px_0_var(--color-ai-dark)]">
        {worldMap.countries.map((shape) => {
          const country = byKey.get(shape.key);
          const complete = country && country.itemCount > 0 && country.ownedCount === country.itemCount;
          return (
            <path
              key={shape.key}
              d={shape.d}
              data-key={country ? shape.key : undefined}
              className={cn(
                "stroke-[0.8] transition-colors [stroke-linejoin:round]",
                !country && "fill-washi stroke-ai-soft",
                country && !complete && "cursor-pointer fill-kin stroke-acorn hover:fill-acorn-soft",
                complete && "cursor-pointer fill-matcha-soft stroke-matcha-dark hover:fill-matcha",
              )}
            />
          );
        })}
      </g>
    </WorldMapFrame>
  );
}
