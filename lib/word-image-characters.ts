// The cast a generated word picture can star (see generateWordImage) —
// each one's artwork is sent along as the reference image, so the model
// draws that character rather than inventing one.
export const WORD_IMAGE_CHARACTERS = [
  {
    id: "donguri",
    name: "Donguri",
    src: "/images/mascot.png",
    description: "Donguri, a round cream-coloured creature wearing an acorn-cap hat, with a dark blue button nose",
  },
  {
    id: "charles",
    name: "Charles Duck",
    src: "/images/charles.webp",
    description: "Charles Duck, a mallard duck with a green head, yellow beak, white neck ring and brown chest",
  },
  {
    id: "rabbit",
    name: "Rabbit",
    src: "/images/rabbit-reading.webp",
    description: "the rabbit, a round cream-coloured rabbit with long ears and a red button nose",
  },
] as const;

export type WordImageCharacterId = (typeof WORD_IMAGE_CHARACTERS)[number]["id"];

// The characters a request asked for, in the cast's order — anything that
// isn't one of them dropped.
export function parseCharacterIds(value: unknown): WordImageCharacterId[] {
  if (!Array.isArray(value)) return [];
  return WORD_IMAGE_CHARACTERS.filter((character) => value.includes(character.id)).map((character) => character.id);
}
