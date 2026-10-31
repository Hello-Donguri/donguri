// How a generated word picture shows the word (see generateWordPicture) —
// picked on the deck page, since no one framing suits every word: a
// character can hold an apple, but not a hospital. Each has its prompt
// wording with a character in the picture and without one.
export const WORD_IMAGE_SCENES = [
  {
    id: "auto",
    name: "Best fit",
    withCharacter:
      "Show the meaning in whichever way makes it clearest at a glance: holding or using a small object, doing an action, standing at or in front of a place or building, showing a feeling, or in a simple scene. Never shrink a large thing (a building, a vehicle, a room) so it can be held.",
    withoutCharacter:
      "Show the meaning in whichever way makes it clearest at a glance: the object itself, the place or building, or a simple scene.",
  },
  {
    id: "holding",
    name: "Holding it",
    withCharacter: "The character is holding, showing or using the thing the word names, so it's obvious at a glance.",
    withoutCharacter: "The thing the word names on its own, large and centred.",
  },
  {
    id: "place",
    name: "At the place",
    withCharacter:
      "The character is standing at or in front of the place or building the word names, shown at its real size with the character small beside it — e.g. a hospital building with its sign symbol, a school, a park.",
    withoutCharacter:
      "The place or building the word names, as a simple, recognisable front view — e.g. a hospital with a red cross, a school with a bell.",
  },
  {
    id: "action",
    name: "Doing the action",
    withCharacter: "The character is doing the action the word names, in a clear pose with any props it needs.",
    withoutCharacter: "The action the word names, shown with the simplest props or figure that makes it clear.",
  },
  {
    id: "feeling",
    name: "Feeling or describing",
    withCharacter:
      "The character shows the feeling, state or quality the word describes, through expression, pose and a simple prop or contrast if it helps — e.g. tired, hot, big.",
    withoutCharacter:
      "The quality the word describes, shown with a simple object or contrast that makes it obvious — e.g. hot with a steaming cup, big next to small.",
  },
  {
    id: "scene",
    name: "Small scene",
    withCharacter:
      "A small, simple scene with the character in it that shows the meaning, such as a time of day, the weather or an event, with only the few elements needed.",
    withoutCharacter:
      "A small, simple scene that shows the meaning, such as a time of day, the weather or an event, with only the few elements needed.",
  },
] as const;

export type WordImageSceneId = (typeof WORD_IMAGE_SCENES)[number]["id"];

// "Custom…" in the scene list: the admin describes the scene themselves
// instead, in up to 30 words, e.g. "running late for the bus". The
// character limit only stops one enormous "word".
export const CUSTOM_SCENE_ID = "custom";
export const CUSTOM_SCENE_MAX_WORDS = 30;
export const CUSTOM_SCENE_MAX_CHARS = 240;

// A custom scene trimmed to the limits — the same on the page and the
// server, which checks it again. Empty when there's nothing usable.
export function cleanCustomScene(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\r\n"]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, CUSTOM_SCENE_MAX_WORDS)
    .join(" ")
    .slice(0, CUSTOM_SCENE_MAX_CHARS);
}
