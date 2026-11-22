// The cast a generated word picture can star (see generateWordImage) —
// each one's artwork is sent along as the reference image, so the model
// draws that character rather than inventing one. `weight` is how often
// each should turn up relative to the others (see pickIdea): Donguri,
// Hazel and Charles most, then Dad and Child Donguri, then Bonkus.
export const WORD_IMAGE_CHARACTERS = [
  {
    id: "donguri",
    weight: 3,
    // Whether it has a mouth — see noMouths in lib/word-image-generate.ts.
    mouth: false,
    name: "Donguri",
    src: "/images/mascot.png",
    // The snout spelled out: without it the model often draws the nose on
    // its own, straight on the face.
    description:
      "Donguri, a round, egg-shaped cream-coloured creature wearing a brown striped acorn-cap hat, with two small dot eyes, a small curved line on its tummy, stubby arms and feet and a little pointed tail. Its face has a snout: a round, paler cream circle with its own outline that sticks out from the side of the face, with a shiny dark blue button nose on the tip of the snout. Always draw the snout — the nose is never on the face by itself",
  },
  {
    id: "dad-donguri",
    weight: 2,
    mouth: false,
    name: "Dad Donguri",
    src: "/images/dad-donguri.png",
    description:
      "Dad Donguri, a tall, long cream-coloured creature with an orange striped acorn-cap hat, two dot eyes, a round pink nose on a pale cream snout, stubby little arms and short stubby feet",
  },
  {
    id: "child-donguri",
    weight: 2,
    mouth: false,
    name: "Child Donguri",
    src: "/images/child-donguri.png",
    description:
      "Child Donguri, a small, round, egg-shaped peach-coloured creature with an orange striped acorn-cap hat, two dot eyes, a black button nose on a pale yellow snout, tiny stubby arms, little feet and a small pointed tail",
  },
  {
    id: "charles",
    weight: 3,
    mouth: true,
    name: "Charles Duck",
    src: "/images/charles.png",
    description:
      "Charles Duck, a mallard duck with a green head, a rust-orange knitted beanie hat, small square glasses, a pink cheek, a long yellow-orange bill, a white neck ring, a brown chest, a cream belly and wings, brown tail feathers and orange webbed feet",
  },
  {
    id: "bonkus",
    weight: 1,
    mouth: true,
    name: "Bonkus",
    src: "/images/bonkus.png",
    description:
      "Bonkus the rhino, a big, muscular grey rhino wrestler with two cream horns, pink inner ears, a determined frown, a red wrestling singlet, a gold championship belt with a crown on it, red knee pads and red wrestling boots",
  },
  {
    id: "rabbit",
    weight: 3,
    mouth: false,
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

// Ideas with nobody in them count as this weight (as rare as Bonkus).
export const NO_CHARACTER_WEIGHT = 1;

// The idea to start a word with in auto mode: of its ten, the one whose
// cast has appeared least so far for how often each should (by `weight`),
// so a run mixes the characters in about those proportions. `used` counts
// each character (and "none") picked so far in the run. Ties go to the
// earlier idea, the model's own order.
export function pickIdea<T extends { characterIds: readonly WordImageCharacterId[] }>(
  ideas: readonly T[],
  used: Readonly<Record<string, number>>,
): T | undefined {
  const score = (idea: T) => {
    const keys = idea.characterIds.length ? idea.characterIds : ["none"];
    return Math.min(
      ...keys.map((key) => {
        const weight =
          key === "none"
            ? NO_CHARACTER_WEIGHT
            : (WORD_IMAGE_CHARACTERS.find((character) => character.id === key)?.weight ?? 1);
        return weight / (1 + (used[key] ?? 0));
      }),
    );
  };
  let best: T | undefined;
  let bestScore = -Infinity;
  for (const idea of ideas) {
    const ideaScore = score(idea);
    if (ideaScore > bestScore) {
      best = idea;
      bestScore = ideaScore;
    }
  }
  return best;
}
