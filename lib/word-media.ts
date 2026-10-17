import "server-only";

// Checks shared by everything that uploads a word's picture or
// pronunciation recordings — the word form (saveWordAudio in
// lib/actions/admin-content.ts) and the deck page's quick uploads
// (lib/actions/word-media.ts).

export const AUDIO_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const AUDIO_TYPE_ERROR = "Use an MP3, M4A, WAV, OGG or WebM audio file.";
export const AUDIO_SIZE_ERROR = "Recording must be under 5MB.";

// The audio formats bunny.net keys are built for (see extensionForMime in
// lib/bunny.ts), by file extension — some browsers send an .m4a with no
// type at all.
const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "audio/webm",
};
const AUDIO_MIMES = new Set([
  ...Object.values(AUDIO_MIME_BY_EXTENSION),
  "audio/mp3",
  "audio/x-m4a",
  "audio/x-wav",
  "audio/wave",
]);

export function audioMime(file: File): string | null {
  if (AUDIO_MIMES.has(file.type)) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_MIME_BY_EXTENSION[extension] ?? null;
}

// The file as uploaded to bunny.net, typed even when the browser sent none.
export function typedAudio(file: File, mime: string): File {
  return file.type ? file : new File([file], file.name, { type: mime });
}

export const WORD_IMAGE_TYPES = ["image/webp", "image/png", "image/jpeg", "image/svg+xml"];
