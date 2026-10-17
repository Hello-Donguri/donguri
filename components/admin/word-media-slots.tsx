"use client";

import { useRef, useState, useTransition } from "react";
import { ImageIcon, Pause, Play, Upload, X } from "lucide-react";
import { removeWordMedia, uploadWordMedia, type WordMediaKind } from "@/lib/actions/word-media";
import { useTranslations } from "@/components/i18n/locale-provider";
import type { WordAudio } from "@/lib/definitions";
import { cn } from "@/lib/utils";

const ACCEPT: Record<WordMediaKind, string> = {
  image: "image/webp,image/png,image/jpeg,image/svg+xml",
  audioFemale: "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm,.mp3,.m4a,.wav,.ogg,.webm",
  audioMale: "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm,.mp3,.m4a,.wav,.ogg,.webm",
};

// A word card's picture and pronunciation recordings on the admin deck
// page, set without opening the word: each slot uploads as soon as a file
// is picked (see uploadWordMedia), plays what's there, and can clear it.
export function WordMediaSlots({
  wordId,
  term,
  imageUrl,
  audio,
}: {
  wordId: string;
  term: string;
  // The uploaded picture, or null when there isn't one (the learner card
  // may still find one by naming convention — see wordImagePath).
  imageUrl: string | null;
  audio: WordAudio | null;
}) {
  const t = useTranslations();
  return (
    <div className="grid grid-cols-3 gap-2">
      <Slot
        wordId={wordId}
        kind="image"
        label={t("admin_word_media.image", "Image")}
        term={term}
        url={imageUrl}
      />
      <Slot
        wordId={wordId}
        kind="audioFemale"
        label={t("admin_word_media.female", "♀ Female")}
        term={term}
        url={audio?.female ?? null}
      />
      <Slot
        wordId={wordId}
        kind="audioMale"
        label={t("admin_word_media.male", "♂ Male")}
        term={term}
        url={audio?.male ?? null}
      />
    </div>
  );
}

function Slot({
  wordId,
  kind,
  label,
  term,
  url,
}: {
  wordId: string;
  kind: WordMediaKind;
  label: string;
  term: string;
  url: string | null;
}) {
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pending, startTransition] = useTransition();

  const upload = (file: File) => {
    setError(null);
    const formData = new FormData();
    formData.set("wordId", wordId);
    formData.set("kind", kind);
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadWordMedia(formData);
      if (result.error) setError(result.error);
    });
  };

  const remove = () => {
    if (!confirm(t("admin_word_media.confirm_remove", "Remove the {{label}} for \"{{term}}\"?", { label: label.toLowerCase(), term }))) {
      return;
    }
    setError(null);
    startTransition(() => removeWordMedia(wordId, kind));
  };

  const togglePlay = () => {
    const player = audioRef.current;
    if (!player) return;
    if (playing) {
      player.pause();
      player.currentTime = 0;
    } else {
      void player.play();
    }
  };

  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col items-center gap-1.5 rounded-xl border p-2 text-center",
        url ? "border-ai/30 bg-ai-soft/40" : "border-dashed border-sumi/20 bg-washi",
        pending && "opacity-60",
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-sumi-soft">{label}</span>

      {kind === "image" ? (
        url ? (
          // eslint-disable-next-line @next/next/no-img-element -- a bunny.net image.
          <img src={url} alt="" className="h-10 w-10 rounded-md object-cover" />
        ) : (
          <ImageIcon aria-hidden className="h-10 w-5 text-sumi-soft/50" />
        )
      ) : url ? (
        <>
          <audio
            ref={audioRef}
            src={url}
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
          <button
            type="button"
            onClick={togglePlay}
            aria-label={t("admin_word_media.play", "Play the {{label}} recording", { label: label.toLowerCase() })}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-ai text-washi transition hover:bg-ai-dark"
          >
            {playing ? <Pause aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="h-4 w-4" />}
          </button>
        </>
      ) : (
        <span className="flex h-10 items-center text-xs text-sumi-soft">{t("admin_word_media.none", "None")}</span>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) upload(file);
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-ai-dark transition hover:bg-ai/10 disabled:cursor-wait"
      >
        <Upload aria-hidden className="h-3 w-3" />
        {pending
          ? t("admin_word_media.uploading", "Uploading…")
          : url
            ? t("admin_word_media.replace", "Replace")
            : t("admin_word_media.upload", "Upload")}
      </button>

      {url && !pending && (
        <button
          type="button"
          onClick={remove}
          aria-label={t("admin_word_media.remove", "Remove the {{label}}", { label: label.toLowerCase() })}
          className="absolute top-1 right-1 rounded-full p-0.5 text-sumi-soft transition hover:bg-shu/10 hover:text-shu"
        >
          <X aria-hidden className="h-3 w-3" />
        </button>
      )}

      {error && <p className="text-[11px] leading-tight text-shu">{error}</p>}
    </div>
  );
}
