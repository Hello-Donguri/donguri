// Builds lib/world-map.json — every country's outline as an SVG path, for
// the learner's world map (components/world/world-map.tsx). Run once, and
// again only to change the projection or detail:
//
//   node scripts/build-world-map.mjs
//
// The outlines come from Natural Earth (via world-atlas), drawn with the
// Natural Earth projection — accurate shapes that still look friendly.
// Antarctica is left out. Each country is keyed by its ISO 3166-1 numeric
// code, or its name for the few without one (e.g. Kosovo); that key is what
// the admin picks a country by (world_countries.map_key). Each also has
// a pin position, for the learner's map to mark countries set up there.

import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import { presimplify, quantile, simplify } from "topojson-simplify";
import { geoNaturalEarth1, geoPath } from "d3-geo";

const require = createRequire(import.meta.url);
const WIDTH = 1000;
const HEIGHT = 500;

// The detailed (1:50m) outlines, so small places like Hong Kong and
// Singapore are there, simplified to keep the file small. Tiny islands
// that share a code with their country (Ashmore and Cartier Is. with
// Australia) are dropped so every key is unique.
const detailed = presimplify(
  JSON.parse(await readFile(require.resolve("world-atlas/countries-50m.json"), "utf8")),
);
const topology = simplify(detailed, quantile(detailed, 0.12));
const countries = feature(topology, topology.objects.countries).features.filter(
  (country) => !["Antarctica", "Ashmore and Cartier Is."].includes(country.properties.name),
);

const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], { type: "FeatureCollection", features: countries });
const path = geoPath(projection).digits(1);

function largestPiece(country) {
  const { geometry } = country;
  if (geometry.type !== "MultiPolygon") return path.centroid(country);
  const pieces = geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }));
  const largest = pieces.reduce((best, piece) => (path.area(piece) > path.area(best) ? piece : best));
  return path.centroid(largest);
}

const output = {
  width: WIDTH,
  height: HEIGHT,
  countries: countries
    .map((country) => ({
      key: country.id ?? country.properties.name,
      name: country.properties.name,
      d: path(country),
      // Where its pin goes — the centre of its largest piece, so a
      // country with far-flung islands (France, the US) gets it on the
      // mainland.
      pin: largestPiece(country).map((value) => Math.round(value * 10) / 10),
    }))
    .filter((country) => country.d)
    .sort((a, b) => a.name.localeCompare(b.name)),
};

await writeFile(new URL("../lib/world-map.json", import.meta.url), JSON.stringify(output));
console.log(`Wrote ${output.countries.length} countries.`);
