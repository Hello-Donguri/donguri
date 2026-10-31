import "server-only";

import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { removeWhiteBackground } from "@/lib/transparent-background";
import {
  WORD_IMAGE_CHARACTERS,
  type WordImageCharacterId,
} from "@/lib/word-image-characters";
import {
  WORD_IMAGE_SCENES,
  type WordImageSceneId,
} from "@/lib/word-image-scenes";
import type {
  LogLevel,
  SvgOptionKey,
  SvgResult,
  WordImageEvent,
} from "@/lib/generated-word-image";
import {
  traceWithChatGpt,
  traceWithImageTracer,
  traceWithInkscape,
  traceWithPotrace,
  traceWithVtracer,
  traceWithVtracerClean,
  type TraceLog,
  type TraceOptions,
} from "@/lib/svg-trace";
import {
  formatCost,
  imageCost,
  imageEstimateKey,
  svgCost,
  svgEstimateKey,
  type ImageModel,
  type ImageQuality,
  type SvgModel,
} from "@/lib/word-image-models";

// What makes a picture trace cleanly into an SVG with vTracer: few flat
// colours with hard edges, bold closed outlines, big simple shapes and a
// plain background — anything soft (gradients, shading, texture, blur)
// turns into hundreds of tiny paths.
const VECTOR_STYLE = [
  "Style: flat vector illustration, made to be auto-traced into an SVG with vTracer.",
  "Solid flat colour fills only: no gradients, shading, highlights, soft shadows, textures, grain, noise or blur.",
  "A small palette of no more than 8 distinct colours; every area is one solid colour.",
  "Thick dark-brown outlines around every shape, and every shape is closed.",
  "Every outline in the picture is exactly the same thickness — characters, objects, small details and background elements alike — with no thinner detail lines and no thicker outer edges.",
  "Big, simple shapes with minimal fine detail: no tiny specks, hatching, sketchy or thin lines.",
  "Plain pure white (#FFFFFF) background with nothing else in it and no ground shadow.",
  "Subject centred with generous white space around it.",
  "No text, letters or numbers anywhere in the image.",
].join(" ");

// The references show what the characters look like, but each is drawn in
// one pose (the rabbit reading, Donguri waving) that the model otherwise
// copies into every picture — so it's told to take only their look from
// them and pose them afresh for the word.
const POSE = [
  "The reference images are only for what the characters look like, not their pose: don't copy the pose, angle or props from them.",
  "Give each character a new, natural pose that acts out this word — e.g. walking, pointing, reaching, sitting, jumping, looking up, arms out, mid-step — turned to face the action rather than standing straight on, with an expression that fits.",
  "Their arms, legs and ears can move and bend as the pose needs, while their body shape and features stay the same.",
].join(" ");

// How the characters are built, whatever they're doing — for drawing and
// for editing alike.
const ARMS =
  "No character has fingers, thumbs or hands: every arm is a short, stubby, rounded nub, just as in the reference images. Anything a character holds is pressed between its stubby arms or balanced on the end of one — never gripped with fingers.";

// The size the tracers work at: their settings (speckle sizes, curve
// lengths) were tuned on 1024px pictures, so a smaller one is scaled up
// to this first.
const TRACE_SIZE = 1024;

const kb = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const seconds = (ms: number) =>
  ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

type Emit = (event: WordImageEvent) => void;

// A log for one stream: each line stamped with the time since `start` and
// where it came from.
function streamLogger(emit: Emit, start: number) {
  return (source: string) =>
    (message: string, level: LogLevel = "info") =>
      emit({ type: "log", at: Date.now() - start, level, source, message });
}

// The word in English only — the prompts never get the other language, so
// the model can't paint it in or be pulled off course by it. That's the
// term in a course teaching English (en-for-ja), and the translation in one
// for English speakers (yue-for-en, fr-for-en); a course with neither side
// in English falls back to the translation.
async function wordAndCharacters(
  wordId: string,
  characterIds: WordImageCharacterId[],
) {
  const word = await prisma.word.findUnique({
    where: { id: wordId },
    select: {
      term: true,
      translation: true,
      languageDeck: {
        select: { course: { select: { targetLanguage: true } } },
      },
    },
  });
  if (!word) throw new Error("Word not found.");
  const { targetLanguage } = word.languageDeck.course;
  const english = targetLanguage === "en" ? word.term : word.translation;
  const characters = WORD_IMAGE_CHARACTERS.filter((character) =>
    characterIds.includes(character.id),
  );
  return { word: { english }, characters };
}

// "Donguri", "Donguri and Charles Duck", "Donguri, Charles Duck and the Rabbit".
function listOf(names: string[]) {
  return names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function subjectLabel(term: string, characters: { name: string }[]) {
  return characters.length
    ? `${listOf(characters.map((character) => character.name))} illustrating "${term}"`
    : `"${term}"`;
}

// The character's artwork as a PNG on white, at the picture's size — the
// image API takes PNG, WebP or JPEG (not SVG), a flat white background
// matches the one asked for in the prompt, and a smaller reference is
// fewer input tokens. Fetched from the site's own /public rather than read
// off disk, since /public isn't bundled into serverless functions.
async function characterReference(
  origin: string,
  src: string,
  side: number,
  log: TraceLog,
  signal: AbortSignal,
) {
  const response = await fetch(`${origin}${src}`, { signal });
  if (!response.ok)
    throw new Error(`Couldn't load the character image (${response.status}).`);
  const original = Buffer.from(await response.arrayBuffer());
  const { width, height, format } = await sharp(original).metadata();

  const png = await sharp(original)
    .resize(side, side, { fit: "inside" })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
  log(
    `Reference ${src}: ${width}×${height} ${format}, ${kb(original.length)} → ${kb(png.length)} PNG on white (max ${side}px)`,
  );

  return toFile(png, "character.png", { type: "image/png" });
}

// Step one on the deck page: draws a picture for a word from its term and
// translation — starring whichever characters are in `characterIds`, framed
// the way `sceneId` says (see WORD_IMAGE_SCENES), or by `customScene`, the
// admin's own description, when that's given — and sends it back to be looked at (and redrawn, if it's not right)
// before any SVGs are made from it (see traceWordPicture). Progress goes
// through `emit` as it happens (see the streaming route that calls this).
// `signal` is the admin pressing Stop or closing the window.
export async function generateWordPicture(
  {
    wordId,
    characterIds,
    sceneId,
    customScene,
    imageModel,
    quality,
    origin,
    signal,
  }: {
    wordId: string;
    characterIds: WordImageCharacterId[];
    sceneId: WordImageSceneId;
    customScene: string;
    imageModel: ImageModel;
    quality: ImageQuality;
    origin: string;
    signal: AbortSignal;
  },
  emit: Emit,
) {
  const start = Date.now();
  const logger = streamLogger(emit, start);
  const log = logger("Setup");

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY isn't set.");

  const { word, characters } = await wordAndCharacters(wordId, characterIds);
  log(`Word: "${word.english}" (English only goes into the prompt)`);
  log(
    characters.length
      ? `Characters: ${listOf(characters.map((character) => character.name))}`
      : "No characters — drawing the word on its own",
  );
  const preset =
    WORD_IMAGE_SCENES.find((candidate) => candidate.id === sceneId) ??
    WORD_IMAGE_SCENES[0];
  const custom = `Show this scene: "${customScene}", in a way that makes the word's meaning obvious at a glance.`;
  const scene = customScene
    ? {
        name: `Custom — "${customScene}"`,
        withCharacter: custom,
        withoutCharacter: custom,
      }
    : preset;
  log(`Scene: ${scene.name}`);

  const subject = characters.length
    ? [
        `Draw ${listOf(characters.map((character) => character.description))}${characters.length > 1 ? ", together" : ""}, illustrating the English word "${word.english}" for a language-learning flashcard.`,
        characters.length > 1
          ? `${scene.withCharacter.replaceAll("The character is", "The characters are").replaceAll("the character", "the characters")} Every one of them is in the picture.`
          : scene.withCharacter,
        characters.length > 1
          ? `The reference images are, in order: ${listOf(characters.map((character) => character.name))}. Keep each character's look exactly as in its reference: the same shape, proportions, colours, face and outline style.`
          : "Keep the character's look exactly as in the reference image: the same shape, proportions, colours, face and outline style.",
        POSE,
        ARMS,
      ].join(" ")
    : [
        `A simple, friendly illustration of the English word "${word.english}" for a language-learning flashcard.`,
        scene.withoutCharacter,
      ].join(" ");
  const imageLog = logger("Image");
  const references = await Promise.all(
    characters.map((character) =>
      characterReference(
        origin,
        character.src,
        imageModel.side,
        imageLog,
        signal,
      ),
    ),
  );
  await drawImage({
    prompt: `${subject} ${VECTOR_STYLE}`,
    images: references,
    what: references.length
      ? `draw from ${references.length} reference${references.length > 1 ? "s" : ""} (images.edit)`
      : "draw (images.generate)",
    imageModel,
    quality,
    log: imageLog,
    signal,
    emit,
  });
}

// Changes the picture already drawn for a word, as the admin describes in
// `instruction` ("make the hospital bigger", "add a red cross"), instead of
// drawing a new one: the picture goes back to the image model as the image
// to edit, followed by the references of the characters in it, so they
// stay on-model. Reported through `emit` like generateWordPicture.
export async function editWordPicture(
  {
    wordId,
    characterIds,
    png: picture,
    instruction,
    imageModel,
    quality,
    origin,
    signal,
  }: {
    wordId: string;
    characterIds: WordImageCharacterId[];
    png: Buffer;
    instruction: string;
    imageModel: ImageModel;
    quality: ImageQuality;
    origin: string;
    signal: AbortSignal;
  },
  emit: Emit,
) {
  const start = Date.now();
  const logger = streamLogger(emit, start);
  const log = logger("Setup");

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY isn't set.");
  const { format } = await sharp(picture).metadata();
  if (format !== "png") throw new Error("That isn't a PNG.");

  const { word, characters } = await wordAndCharacters(wordId, characterIds);
  log(`Word: "${word.english}"`);
  log(`Edit: "${instruction}"`);

  const imageLog = logger("Image");
  const references = await Promise.all(
    characters.map((character) =>
      characterReference(
        origin,
        character.src,
        imageModel.side,
        imageLog,
        signal,
      ),
    ),
  );
  const prompt = [
    `The first image is a flashcard illustration of the English word "${word.english}". Edit it: ${instruction}.`,
    "Change only what that asks for. Keep everything else as it is: the composition, the characters, their poses and colours, the other objects and the background.",
    characters.length
      ? `The other images are references for the characters (in order: ${listOf(characters.map((character) => character.name))}) — use them only to keep each character's look exactly right. ${ARMS}`
      : "",
    VECTOR_STYLE,
  ]
    .filter(Boolean)
    .join(" ");

  await drawImage({
    prompt,
    // Back on white, as it was drawn: a transparent background can read as
    // black to the model.
    images: [
      await toFile(
        await sharp(picture)
          .flatten({ background: "#ffffff" })
          .png()
          .toBuffer(),
        "picture.png",
        {
          type: "image/png",
        },
      ),
      ...references,
    ],
    what: `edit the picture${references.length ? ` with ${references.length} character reference${references.length > 1 ? "s" : ""}` : ""} (images.edit)`,
    imageModel,
    quality,
    log: imageLog,
    signal,
    emit,
  });
}

// Asks the image model for the picture — editing from `images` when there
// are any (the picture to change and/or character references), drawing
// from scratch otherwise — with the model and quality chosen on the page,
// at the smallest size the model takes (see IMAGE_MODELS), and sends it
// back through `emit`, with what it cost.
async function drawImage({
  prompt,
  images,
  what,
  imageModel,
  quality,
  log,
  signal,
  emit,
}: {
  prompt: string;
  images: Awaited<ReturnType<typeof toFile>>[];
  what: string;
  imageModel: ImageModel;
  quality: ImageQuality;
  log: (message: string, level?: LogLevel) => void;
  signal: AbortSignal;
  emit: Emit;
}) {
  const model = imageModel.id;
  const size = `${imageModel.side}x${imageModel.side}` as const;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // PNG out, not WebP: lossless, so there are no compression artefacts
  // for the tracers to trace as extra shapes.
  const options = {
    model,
    prompt,
    size,
    quality,
    output_format: "png",
    n: 1,
  } as const;
  log(
    `Asking ${imageModel.name} to ${what} — ${size}, ${quality} quality, PNG. Prompt is ${prompt.length} characters. This usually takes 15–60s…`,
    "start",
  );
  const imageStart = Date.now();
  const response = images.length
    ? await openai.images.edit({ ...options, image: images }, { signal })
    : await openai.images.generate(options, { signal });

  const b64 = response?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image came back.");
  const drawn = Buffer.from(b64, "base64");
  const { width, height } = await sharp(drawn).metadata();
  const { usage } = response;
  log(
    `Picture received in ${seconds(Date.now() - imageStart)}: ${width}×${height}, ${kb(drawn.length)} PNG` +
      (usage
        ? ` (${usage.input_tokens} tokens in, ${usage.output_tokens} out)`
        : ""),
  );
  if (usage) {
    const usd = imageCost(imageModel, usage);
    log(`Cost: ${formatCost(usd)} ($${usd.toFixed(3)})`);
    emit({
      type: "cost",
      usd,
      estimateKey: imageEstimateKey(imageModel, quality, images.length),
    });
  }

  const { png, cleared } = await removeWhiteBackground(drawn);
  log(
    `White background made transparent: ${Math.round(cleared * 100)}% of the picture — ${kb(png.length)} PNG`,
    "done",
  );
  emit({
    type: "png",
    dataUrl: `data:image/png;base64,${png.toString("base64")}`,
    bytes: png.length,
  });
}

// Step two: turns the picture the admin approved into an SVG every way in
// SVG_OPTIONS, all at once, each reported through `emit` the moment it's
// ready. Nothing is saved here; the deck page chooses one (see
// chooseGeneratedWordImage). `signal` is Stop: everything still running is
// cancelled — ChatGPT, Inkscape, and the tracers at their next chance —
// and nothing new starts.
export async function traceWordPicture(
  {
    wordId,
    characterIds,
    png: picture,
    svgModel,
    signal,
  }: {
    wordId: string;
    characterIds: WordImageCharacterId[];
    png: Buffer;
    svgModel: SvgModel | null;
    signal: AbortSignal;
  },
  emit: Emit,
) {
  const start = Date.now();
  const logger = streamLogger(emit, start);
  const log = logger("Setup");

  const { word, characters } = await wordAndCharacters(wordId, characterIds);
  const { width = 0, height = 0, format } = await sharp(picture).metadata();
  if (format !== "png") throw new Error("That isn't a PNG.");

  let png = picture;
  if (Math.max(width, height) < TRACE_SIZE) {
    png = await sharp(picture)
      .resize(TRACE_SIZE, TRACE_SIZE, { fit: "inside", kernel: "lanczos3" })
      .png()
      .toBuffer();
    log(
      `Picture is ${width}×${height} — scaled up to ${TRACE_SIZE}px for the tracers (their settings are tuned for that size)`,
    );
  } else {
    log(`Picture is ${width}×${height}`);
  }

  const run = async (
    key: SvgOptionKey,
    source: string,
    trace: (options: TraceOptions) => Promise<SvgResult>,
  ) => {
    if (signal.aborted) return;
    const traceLog = logger(source);
    traceLog("Started", "start");
    const traced = await trace({ log: (message) => traceLog(message), signal });
    const result: SvgResult =
      signal.aborted && !traced.ok ? { ok: false, error: "Stopped." } : traced;
    if (result.ok) {
      traceLog(
        `Done in ${seconds(result.ms)}: ${result.paths} paths, ${kb(result.bytes)}`,
        "done",
      );
    } else {
      traceLog(`Failed: ${result.error}`, "error");
    }
    emit({ type: "svg", key, result });
  };

  const subject = subjectLabel(word.english, characters);
  await Promise.all([
    run("vtracer", "vTracer", (options) => traceWithVtracer(png, options)),
    run("vtracerClean", "vTracer (clean)", (options) =>
      traceWithVtracerClean(png, options),
    ),
    run("potrace", "Potrace", (options) => traceWithPotrace(png, options)),
    run("inkscape", "Inkscape", (options) => traceWithInkscape(png, options)),
    run("imagetracer", "ImageTracer", (options) =>
      traceWithImageTracer(png, options),
    ),
    svgModel
      ? run("chatgpt", "ChatGPT", (options) =>
          traceWithChatGpt(png, subject, {
            ...options,
            model: svgModel.id,
            onUsage: (usage) => {
              const usd = svgCost(svgModel, usage);
              logger("ChatGPT")(
                `Cost: ${formatCost(usd)} ($${usd.toFixed(3)})`,
              );
              emit({
                type: "cost",
                usd,
                estimateKey: svgEstimateKey(svgModel),
              });
            },
          }),
        )
      : emit({
          type: "svg",
          key: "chatgpt",
          result: { ok: false, error: "Turned off." },
        }),
  ]);

  logger("Done")(`All SVGs finished in ${seconds(Date.now() - start)}`, "done");
}
