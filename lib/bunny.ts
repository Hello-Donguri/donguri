import "server-only";

// Server-only wrapper around bunny.net's Storage API (plain PUT-over-HTTP,
// no SDK needed). Never call from client code — BUNNY_STORAGE_API_KEY must
// stay server-side.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/webp":
      return "webp";
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/svg+xml":
      return "svg";
    // Pronunciation recordings (see buildWordAudioKey).
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/mp4":
    case "audio/x-m4a":
    case "audio/aac":
      return "m4a";
    case "audio/wav":
    case "audio/x-wav":
    case "audio/wave":
      return "wav";
    case "audio/ogg":
      return "ogg";
    case "audio/webm":
      return "webm";
    default:
      throw new Error(`Unsupported file type: ${mime}`);
  }
}

function buildImageKey(prefix: string, mime: string): string {
  return `${prefix}/${crypto.randomUUID()}.${extensionForMime(mime)}`;
}

export function buildWordImageKey(mime: string): string {
  return buildImageKey("words", mime);
}

export function buildDeckCoverImageKey(mime: string): string {
  return buildImageKey("decks", mime);
}

// A word's female or male pronunciation recording (see
// Word.audioFemaleKey). Uploaded with uploadImage, which is a plain PUT
// that works for any file.
export function buildWordAudioKey(mime: string): string {
  return buildImageKey("audio", mime);
}

export function buildBadgeImageKey(mime: string): string {
  return buildImageKey("badges", mime);
}

// Country slides, items and the room background (see lib/world.ts).
export function buildWorldImageKey(mime: string): string {
  return buildImageKey("world", mime);
}

export async function uploadImage(file: File, key: string): Promise<void> {
  const endpoint =
    process.env.BUNNY_STORAGE_ENDPOINT || "https://storage.bunnycdn.com";
  const zone = requireEnv("BUNNY_STORAGE_ZONE");
  const apiKey = requireEnv("BUNNY_STORAGE_API_KEY");
  const buffer = Buffer.from(await file.arrayBuffer());

  const res = await fetch(`${endpoint}/${zone}/${key}`, {
    method: "PUT",
    headers: {
      AccessKey: apiKey,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: buffer,
  });

  if (!res.ok) {
    throw new Error(`Bunny upload failed (${res.status}): ${await res.text()}`);
  }
}

export function imageUrl(imageKey: string): string {
  return `https://${requireEnv("BUNNY_PULL_ZONE_HOST")}/${imageKey}`;
}
