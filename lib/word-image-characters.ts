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
    id: "dad-donguri",
    name: "Dad Donguri",
    src: "/images/dad-donguri.png",
    description:
      "Dad Donguri, a tall, long cream-coloured creature with an orange striped acorn-cap hat, two dot eyes, a round pink nose on a pale cream snout, stubby little arms and short stubby feet",
  },
  {
    id: "child-donguri",
    name: "Child Donguri",
    src: "/images/child-donguri.png",
    description:
      "Child Donguri, a small, round, egg-shaped peach-coloured creature with an orange striped acorn-cap hat, two dot eyes, a black button nose on a pale yellow snout, tiny stubby arms, little feet and a small pointed tail",
  },
  {
    id: "charles",
    name: "Charles Duck",
    src: "/images/charles.png",
    description:
      "Charles Duck, a mallard duck with a green head, a rust-orange knitted beanie hat, small square glasses, a pink cheek, a long yellow-orange bill, a white neck ring, a brown chest, a cream belly and wings, brown tail feathers and orange webbed feet",
  },
  {
    id: "bonkus",
    name: "Bonkus",
    src: "/images/bonkus.png",
    description:
      "Bonkus the rhino, a big, muscular grey rhino wrestler with two cream horns, pink inner ears, a determined frown, a red wrestling singlet, a gold championship belt with a crown on it, red knee pads and red wrestling boots",
  },
  {
    id: "rabbit",
    name: "Hazel",
    src: "/images/rabbit-reading.webp",
    description: "Hazel the rabbit, a round cream-coloured rabbit with long ears and a red button nose",
  },
] as const;

export type WordImageCharacterId = (typeof WORD_IMAGE_CHARACTERS)[number]["id"];

// The characters a request asked for, in the cast's order — anything that
// isn't one of them dropped.
export function parseCharacterIds(value: unknown): WordImageCharacterId[] {
  if (!Array.isArray(value)) return [];
  return WORD_IMAGE_CHARACTERS.filter((character) => value.includes(character.id)).map((character) => character.id);
}

// With no characters in the picture, this drawing goes along instead, as a
// reference for the style alone — line weight, colours, the cute look — so
// the word on its own still matches the rest of the deck's pictures.
export const STYLE_REFERENCE_SRC = "/vocab-images/cheese.webp";

// How many reference images a drawing sends: one per character, or the
// style reference when there are none.
export function referenceImageCount(characterIds: readonly string[]) {
  return characterIds.length || 1;
}
