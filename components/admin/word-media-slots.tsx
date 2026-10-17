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
  // One message for the row, from whichever slot last failed.
  const [error, setError] = useState<string | null>(null);
  const slots = [
    { kind: "image" as const, symbol: null, label: t("admin_word_media.image", "Image"), url: imageUrl },
    { kind: "audioFemale" as const, symbol: "♀", label: t("admin_word_media.female", "♀ Female"), url: audio?.female ?? null },
    { kind: "audioMale" as const, symbol: "♂", label: t("admin_word_media.male", "♂ Male"), url: audio?.male ?? null },
  ];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {slots.map((slot) => (
          <Slot key={slot.kind} wordId={wordId} term={term} onError={setError} {...slot} />
        ))}
      </div>
      {error && <p className="text-xs text-shu">{error}</p>}
    </div>
  );
}

// One compact pill: what's there (a thumbnail, or a play button for a
// recording), an upload button that sends the picked file straight away,
// and × to clear it.
function Slot({
  wordId,
  kind,
  symbol,
  label,
  term,
  url,
  onError,
}: {
  wordId: string;
  kind: WordMediaKind;
  symbol: string | null;
  label: string;
  term: string;
  url: string | null;
  onError: (error: string | null) => void;
}) {
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pending, startTransition] = useTransition();
  const name = label.toLowerCase();

  const upload = (file: File) => {
    onError(null);
    const formData = new FormData();
    formData.set("wordId", wordId);
    formData.set("kind", kind);
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadWordMedia(formData);
      if (result.error) onError(`${label}: ${result.error}`);
    });
  };

  const remove = () => {
    if (!confirm(t("admin_word_media.confirm_remove", "Remove the {{label}} for \"{{term}}\"?", { label: name, term }))) {
      return;
    }
    onError(null);
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

  const iconButton = "flex h-5 w-5 items-center justify-center rounded-full transition disabled:cursor-wait";

  return (
    <div
      title={label}
      className={cn(
        "inline-flex h-7 items-center gap-0.5 rounded-full border px-1 text-xs font-semibold",
        url ? "border-ai/30 bg-ai-soft/50 text-ai-dark" : "border-dashed border-sumi/20 text-sumi-soft",
        pending && "animate-pulse",
      )}
    >
      {kind === "image" ? (
        url ? (
          // eslint-disable-next-line @next/next/no-img-element -- a bunny.net image.
          <img src={url} alt="" className="h-5 w-5 rounded object-cover" />
        ) : (
          <ImageIcon aria-hidden className="mx-0.5 h-3.5 w-3.5" />
        )
      ) : (
        <>
          <span aria-hidden className="px-0.5">
            {symbol}
          </span>
          {url && (
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
                aria-label={t("admin_word_media.play", "Play the {{label}} recording", { label: name })}
                className={cn(iconButton, "bg-ai text-washi hover:bg-ai-dark")}
              >
                {playing ? <Pause aria-hidden className="h-2.5 w-2.5" /> : <Play aria-hidden className="h-2.5 w-2.5" />}
              </button>
            </>
          )}
        </>
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
        aria-label={
          url
            ? t("admin_word_media.replace_label", "Replace the {{label}}", { label: name })
            : t("admin_word_media.upload_label", "Upload the {{label}}", { label: name })
        }
        className={cn(iconButton, "hover:bg-ai/15")}
      >
        <Upload aria-hidden className="h-3 w-3" />
      </button>

      {url && (
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          aria-label={t("admin_word_media.remove", "Remove the {{label}}", { label: name })}
          className={cn(iconButton, "hover:bg-shu/10 hover:text-shu")}
        >
          <X aria-hidden className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
