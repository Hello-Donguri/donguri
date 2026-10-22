"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImageIcon, Loader2, Pause, Play, Upload, X } from "lucide-react";
import { removeWordMedia, uploadWordMedia, type WordMediaKind } from "@/lib/actions/word-media";
import { useTranslations } from "@/components/i18n/locale-provider";
import { toast } from "@/components/ui/toast";
import { ImageLightbox } from "@/components/ui/image-lightbox";
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
  sharedImageWith = [],
}: {
  wordId: string;
  term: string;
  // Words in other decks using this same picture file — replacing it then
  // asks whether to replace it there too (see SharedImageDialog).
  sharedImageWith?: SharedImageUse[];
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
          <Slot
            key={slot.kind}
            wordId={wordId}
            term={term}
            onError={setError}
            sharedWith={slot.kind === "image" ? sharedImageWith : []}
            {...slot}
          />
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
  sharedWith,
}: {
  wordId: string;
  sharedWith: SharedImageUse[];
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

  // A picked replacement for a shared picture, waiting on the dialog.
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const upload = (file: File, applyToShared = false) => {
    onError(null);
    const formData = new FormData();
    formData.set("wordId", wordId);
    formData.set("kind", kind);
    formData.set("file", file);
    if (applyToShared) formData.set("applyToShared", "1");
    startTransition(async () => {
      const result = await uploadWordMedia(formData);
      if (result.error) onError(`${label}: ${result.error}`);
      else if ((result.updated ?? 1) > 1) {
        toast(t("admin_word_media.upload_complete_all", "Upload complete — {{count}} words updated", { count: result.updated ?? 1 }));
      } else toast(t("admin_word_media.upload_complete", "Upload complete"));
    });
  };

  // Replacing a picture other decks use too asks first.
  const picked = (file: File) => {
    if (url && sharedWith.length > 0) setPendingFile(file);
    else upload(file);
  };

  const remove = () => {
    if (!confirm(t("admin_word_media.confirm_remove", "Remove the {{label}} for \"{{term}}\"?", { label: name, term }))) {
      return;
    }
    onError(null);
    startTransition(async () => {
      await removeWordMedia(wordId, kind);
      toast(t("admin_word_media.removed", "Removed"));
    });
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
      )}
    >
      {kind === "image" ? (
        url ? (
          <ImageLightbox src={url} alt={term} className="flex">
            {/* eslint-disable-next-line @next/next/no-img-element -- a bunny.net image. */}
            <img src={url} alt="" className="h-5 w-5 rounded object-cover" />
          </ImageLightbox>
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
          if (file) picked(file);
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
        {/* Spins while the file uploads; the card refreshes with it after. */}
        {pending ? <Loader2 aria-hidden className="h-3 w-3 animate-spin" /> : <Upload aria-hidden className="h-3 w-3" />}
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
      {pendingFile && (
        <SharedImageDialog
          term={term}
          uses={sharedWith}
          onChoose={(applyToShared) => {
            upload(pendingFile, applyToShared);
            setPendingFile(null);
          }}
          onCancel={() => setPendingFile(null)}
        />
      )}
    </div>
  );
}

export type SharedImageUse = { course: string; deck: string; term: string };

// Asks whether a new picture should replace the old one only here, or in
// every deck that uses the same file (copies of this deck in other courses).
function SharedImageDialog({
  term,
  uses,
  onChoose,
  onCancel,
}: {
  term: string;
  uses: SharedImageUse[];
  onChoose: (applyToShared: boolean) => void;
  onCancel: () => void;
}) {
  const t = useTranslations();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-card-border bg-washi p-6 text-left text-sm font-normal text-sumi shadow-2xl backdrop:bg-sumi/40"
    >
      <h2 className="font-nunito text-lg font-extrabold">
        {t("admin_word_media.shared_title", "This image is used in other decks too")}
      </h2>
      <p className="mt-2 text-sumi-soft">
        {t(
          "admin_word_media.shared_body",
          "The picture for \"{{term}}\" is also used by {{count}} other word(s):",
          { term, count: uses.length },
        )}
      </p>
      <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-card-border bg-washi-soft p-3">
        {uses.map((use, index) => (
          <li key={index} className="text-sumi">
            <span className="font-semibold">{use.term}</span>{" "}
            <span className="text-sumi-soft">
              — {use.course} · {use.deck}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
        <button
          type="button"
          onClick={() => onChoose(true)}
          className="h-10 rounded-full bg-ai px-5 font-semibold text-washi transition hover:bg-ai-dark"
        >
          {t("admin_word_media.shared_all", "Update all {{count}} decks", {
            count: new Set(uses.map((use) => `${use.course}/${use.deck}`)).size + 1,
          })}
        </button>
        <button
          type="button"
          onClick={() => onChoose(false)}
          className="h-10 rounded-full border border-ghost-border px-5 font-semibold text-ghost-text transition hover:bg-ghost-hover"
        >
          {t("admin_word_media.shared_this", "Just this deck")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-full px-5 font-semibold text-sumi-soft transition hover:text-sumi sm:mr-auto"
        >
          {t("common.cancel", "Cancel")}
        </button>
      </div>
    </dialog>
  );
}
