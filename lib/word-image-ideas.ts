import "server-only";

import OpenAI from "openai";
import { WORD_IMAGE_CHARACTERS, parseCharacterIds, type WordImageCharacterId } from "@/lib/word-image-characters";
import { CUSTOM_SCENE_MAX_WORDS, cleanCustomScene } from "@/lib/word-image-scenes";
import { SVG_MODELS, svgCost } from "@/lib/word-image-models";
import { wordAndCharacters } from "@/lib/word-image-generate";

export const WORD_IMAGE_IDEA_COUNT = 10;

// The model that comes up with the ideas — a short text reply, so a
// mid-priced one; priced from the SVG list, which it's on.
const IDEAS_MODEL = SVG_MODELS.find((model) => model.id === "gpt-6.1-terra") ?? SVG_MODELS[0];
const IDEAS_TIMEOUT_MS = 60_000;

// `scene` is what goes into the prompt (always English); `sceneJa` is the
// same idea in Japanese, only to read.
export type WordImageIdea = { scene: string; sceneJa: string; characterIds: WordImageCharacterId[] };

// Ten picture ideas for a word on the admin deck page, each a custom scene
// (within the custom scene's word limit) and the characters it stars —
// which replace whichever were ticked when one is picked. Most use the
// cast, a few have no one in them; with `noCharacters`, none do. `usd` is
// what the call cost, for the window's spend.
export async function suggestWordImageIdeas(
  wordId: string,
  { noCharacters }: { noCharacters: boolean },
): Promise<{ ideas: WordImageIdea[]; usd: number }> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY isn't set.");
  const { word } = await wordAndCharacters(wordId, []);

  const cast = WORD_IMAGE_CHARACTERS.map((character) => `- ${character.id}: ${character.description}`).join("\n");
  const prompt = [
    `You're helping illustrate flashcards for a language-learning app. Each card has one small, simple, cute cartoon picture that has to make the English word "${word.english}" obvious at a glance.`,
    word.meaning,
    `Suggest ${WORD_IMAGE_IDEA_COUNT} different ideas for the picture. Make them varied — an object, an action, a place, a feeling, a little scene — and keep each one simple enough to draw as a flat icon-like illustration with a few elements. Each idea is a short description of what's in the picture, at most ${CUSTOM_SCENE_MAX_WORDS} words, with no text, letters or signs with writing in it.`,
    noCharacters
      ? "None of the ideas has a character in it: show the thing, place or situation on its own. Give every idea an empty characters list."
      : `These are the characters that can star in a picture:\n${cast}\nMost ideas should use one or two of them, chosen to suit the idea — vary who appears across the ideas — and name them in the description. Use them in about these proportions: Donguri, Hazel and Charles Duck most often; Dad Donguri and Child Donguri less often; Bonkus only now and then, where a big strong wrestler really suits the idea. Spread them through the list rather than front-loading one character. One or two of the ideas should have no character at all, with an empty characters list.`,
    'Also give each idea in natural Japanese, as "japanese" — the same picture described, keeping the character names as they are (in katakana).',
    'Reply with JSON only: {"ideas": [{"scene": "…", "japanese": "…", "characters": ["character id", …]}, …]}.',
  ].join("\n\n");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create(
    {
      model: IDEAS_MODEL.id,
      response_format: { type: "json_object" },
      reasoning_effort: "low",
      messages: [{ role: "user", content: prompt }],
    },
    { signal: AbortSignal.timeout(IDEAS_TIMEOUT_MS), maxRetries: 0 },
  );

  const { usage } = response;
  const usd = usage
    ? svgCost(IDEAS_MODEL, {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        cached_tokens: usage.prompt_tokens_details?.cached_tokens,
      })
    : 0;

  let parsed: { ideas?: unknown };
  try {
    parsed = JSON.parse(response.choices[0]?.message.content ?? "") as { ideas?: unknown };
  } catch {
    throw new Error("The ideas came back in a form that couldn't be read. Try again.");
  }
  if (!Array.isArray(parsed.ideas)) throw new Error("No ideas came back. Try again.");

  // Each one trimmed to the custom scene's limits, with only real
  // characters (none at all when asked for none), nothing twice.
  const seen = new Set<string>();
  const ideas = parsed.ideas.flatMap((entry): WordImageIdea[] => {
    if (typeof entry !== "object" || entry === null) return [];
    const { scene: rawScene, japanese, characters } = entry as Record<string, unknown>;
    const scene = cleanCustomScene(rawScene);
    if (!scene || seen.has(scene.toLowerCase())) return [];
    seen.add(scene.toLowerCase());
    const sceneJa = typeof japanese === "string" ? japanese.replace(/[\r\n]+/g, " ").trim().slice(0, 200) : "";
    return [{ scene, sceneJa, characterIds: noCharacters ? [] : parseCharacterIds(characters) }];
  });
  if (ideas.length === 0) throw new Error("No ideas came back. Try again.");
  return { ideas: ideas.slice(0, WORD_IMAGE_IDEA_COUNT), usd };
}
