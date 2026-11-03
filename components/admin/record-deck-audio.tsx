"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDashed,
  CloudUpload,
  Loader2,
  MessageSquareText,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Type,
  X,
} from "lucide-react";
import type { RecordingItem, RecordingVoice } from "@/lib/definitions";
import { MICROPHONE_CONSTRAINTS, captureWorkletUrl, processRecording } from "@/lib/recording-audio";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

// How much from just before Space went down is kept, so the first sound
// isn't clipped (the silence is trimmed off again afterwards).
const PRE_ROLL_SECONDS = 0.35;
// How long recording carries on after Space comes up — people tend to let
// go as the last sound is still ending.
const TAIL_MS = 250;
// Shorter than this (Space tapped, not held) isn't a take.
const MIN_TAKE_SECONDS = 0.3;

const AUTO_NEXT_STORAGE_KEY = "record-deck-audio-auto-next";

type Take = {
  id: number;
  url: string;
  blob: Blob;
  seconds: number;
  status: "queued" | "uploading" | "saved" | "failed";
  error?: string;
};

type Job = { key: string; item: RecordingItem; take: Take };

const itemKey = (item: RecordingItem) => `${item.target}:${item.id}`;

function concat(chunks: Float32Array[]) {
  const out = new Float32Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

let nextTakeId = 1;

// The time, read in event handlers (never during render).
function timestamp() {
  return Date.now();
}

// On the admin deck page: a window for recording the deck's words and
// example sentences in one voice (`voice` — there's one button for each),
// one at a time, as quickly as possible. Hold Space to record, let go to
// finish; the take is cleaned up in the browser (see processRecording),
// can be played back (P) or redone (Space again), and Enter or → moves on.
// Each take uploads in the background as soon as it's made (see
// app/api/admin/recordings), so there's no waiting between them; closing
// the window stops recording but lets the uploads finish.
export function RecordDeckAudio({
  items,
  voice,
  deckTitle,
}: {
  items: RecordingItem[];
  voice: RecordingVoice;
  deckTitle: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const playerRef = useRef<HTMLAudioElement>(null);

  // What this session goes through: fixed when the window opens (or the
  // filter changes), so recorded items don't vanish from under the
  // recorder.
  const [missingOnly, setMissingOnly] = useState(true);
  const [list, setList] = useState<RecordingItem[]>([]);
  const [index, setIndex] = useState(0);
  const [takes, setTakes] = useState<Record<string, Take>>({});
  const [autoNext, setAutoNext] = useState(false);

  const [mic, setMic] = useState<"off" | "starting" | "ready" | "denied">("off");
  const [recording, setRecording] = useState(false);
  const [recordStartedAt, setRecordStartedAt] = useState<number | null>(null);
  const [level, setLevel] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  // The microphone pipeline.
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const recordingRef = useRef(false);
  const chunksRef = useRef<Float32Array[]>([]);
  const preRollRef = useRef<Float32Array[]>([]);
  const stopTimerRef = useRef<number | null>(null);

  // The background uploads, one at a time, in order — so a redone take
  // always lands after the one it replaces.
  const queueRef = useRef<Job[]>([]);
  const uploadingRef = useRef(false);
  const [pending, setPending] = useState(0);

  const missing = items.filter((item) => !item.audio[voice]);
  const current = list[index] ?? null;
  const currentKey = current ? itemKey(current) : null;
  const take = currentKey ? takes[currentKey] : undefined;
  const existing = current?.audio[voice] ?? null;

  const isDone = (item: RecordingItem) =>
    takes[itemKey(item)]?.status === "saved" || (!takes[itemKey(item)] && Boolean(item.audio[voice]));
  const doneCount = list.filter(isDone).length;
  const failedCount = Object.values(takes).filter((entry) => entry.status === "failed").length;

  const choose = (onlyMissing: boolean) => {
    setMissingOnly(onlyMissing);
    setList(onlyMissing ? items.filter((item) => !item.audio[voice] && !takes[itemKey(item)]) : items);
    setIndex(0);
  };

  // --- Uploads -----------------------------------------------------------

  const updateTake = (key: string, id: number, change: Partial<Take>) =>
    setTakes((all) => (all[key]?.id === id ? { ...all, [key]: { ...all[key], ...change } } : all));

  const pump = useCallback(async () => {
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    while (queueRef.current.length) {
      const job = queueRef.current.shift()!;
      setPending(queueRef.current.length + 1);
      updateTake(job.key, job.take.id, { status: "uploading" });
      const form = new FormData();
      form.set("target", job.item.target);
      form.set("id", job.item.id);
      form.set("voice", voice);
      form.set("file", new File([job.take.blob], "recording.mp3", { type: "audio/mpeg" }));
      try {
        const response = await fetch("/api/admin/recordings", { method: "POST", body: form });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Upload failed (${response.status}).`);
        }
        updateTake(job.key, job.take.id, { status: "saved", error: undefined });
      } catch (error) {
        updateTake(job.key, job.take.id, {
          status: "failed",
          error: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    }
    uploadingRef.current = false;
    setPending(0);
    // The deck page's counts and players catch up once everything's in.
    router.refresh();
  }, [router, voice]);

  const enqueue = (item: RecordingItem, newTake: Take) => {
    const key = itemKey(item);
    // A take still waiting is replaced by a newer one of the same thing.
    queueRef.current = queueRef.current.filter((job) => job.key !== key);
    queueRef.current.push({ key, item, take: newTake });
    setPending(queueRef.current.length + (uploadingRef.current ? 1 : 0));
    void pump();
  };

  const retry = (item: RecordingItem) => {
    const failed = takes[itemKey(item)];
    if (!failed) return;
    setTakes((all) => ({ ...all, [itemKey(item)]: { ...failed, status: "queued", error: undefined } }));
    enqueue(item, failed);
  };

  // Leaving the page with uploads still going would lose them.
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  // --- Microphone ---------------------------------------------------------

  const stopMicrophone = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void contextRef.current?.close();
    contextRef.current = null;
    recordingRef.current = false;
    setRecording(false);
    setMic("off");
  };

  const startMicrophone = async () => {
    setMic("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: MICROPHONE_CONSTRAINTS });
      const context = new AudioContext();
      const url = captureWorkletUrl();
      await context.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const source = context.createMediaStreamSource(stream);
      const capture = new AudioWorkletNode(context, "capture");
      // Processing only runs while the node is pulled by the graph; a
      // silent gain keeps it pulled without playing the microphone back.
      const silent = context.createGain();
      silent.gain.value = 0;
      source.connect(capture).connect(silent).connect(context.destination);

      const preRollChunks = Math.ceil((PRE_ROLL_SECONDS * context.sampleRate) / 2048);
      capture.port.onmessage = (event: MessageEvent<Float32Array>) => {
        const chunk = event.data;
        if (recordingRef.current) {
          chunksRef.current.push(chunk);
          let sum = 0;
          for (const sample of chunk) sum += sample * sample;
          setLevel(Math.min(1, Math.sqrt(sum / chunk.length) * 6));
        } else {
          preRollRef.current.push(chunk);
          if (preRollRef.current.length > preRollChunks) preRollRef.current.shift();
        }
      };

      streamRef.current = stream;
      contextRef.current = context;
      setMic("ready");
    } catch {
      setMic("denied");
    }
  };

  // Stop listening when the page goes.
  useEffect(() => () => stopMicrophone(), []);

  // --- Recording ----------------------------------------------------------

  const startRecording = () => {
    if (!current || mic !== "ready" || recordingRef.current || processing) return;
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    playerRef.current?.pause();
    chunksRef.current = [...preRollRef.current];
    recordingRef.current = true;
    setRecording(true);
    setRecordStartedAt(timestamp());
    setNotice(null);
  };

  const finishRecording = () => {
    if (!recordingRef.current || !current) return;
    stopTimerRef.current = window.setTimeout(() => {
      recordingRef.current = false;
      setRecording(false);
      setLevel(0);
      const sampleRate = contextRef.current?.sampleRate ?? 48000;
      const raw = concat(chunksRef.current);
      chunksRef.current = [];
      if (raw.length / sampleRate < PRE_ROLL_SECONDS + MIN_TAKE_SECONDS) {
        setNotice(t("record_audio.too_short", "Too short — hold Space while you speak."));
        return;
      }
      setProcessing(true);
      // Let the "Cleaning up" state paint before the (brief) work.
      window.setTimeout(() => {
        const result = processRecording(raw, sampleRate);
        setProcessing(false);
        if (!result) {
          setNotice(t("record_audio.no_voice", "Didn't hear anything — check the microphone and try again."));
          return;
        }
        const item = current;
        const key = itemKey(item);
        const newTake: Take = {
          id: nextTakeId++,
          url: URL.createObjectURL(result.mp3),
          blob: result.mp3,
          seconds: result.seconds,
          status: "queued",
        };
        setTakes((all) => {
          if (all[key]) URL.revokeObjectURL(all[key].url);
          return { ...all, [key]: newTake };
        });
        enqueue(item, newTake);
        if (autoNext) setIndex((position) => Math.min(position + 1, list.length));
      }, 30);
    }, TAIL_MS);
  };

  const play = (url: string | null) => {
    const player = playerRef.current;
    if (!player || !url) return;
    player.src = url;
    player.currentTime = 0;
    void player.play();
  };

  const go = (step: number) => {
    if (recordingRef.current) return;
    playerRef.current?.pause();
    setNotice(null);
    setIndex((position) => Math.max(0, Math.min(list.length, position + step)));
  };

  // The keyboard, while the window's open: Space held to record, Enter or
  // → for the next, ← for the previous, P to play. Space and Enter never
  // reach a focused button, which would otherwise click it.
  useEffect(() => {
    if (mic === "off") return;
    const typing = (target: EventTarget | null) =>
      target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && target.getAttribute("type") !== "checkbox";
    const down = (event: KeyboardEvent) => {
      if (typing(event.target)) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (!event.repeat) startRecording();
      } else if (event.key === "Enter" || event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      } else if (event.key === "p" || event.key === "P") {
        event.preventDefault();
        play(take?.url ?? existing);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code !== "Space" || typing(event.target)) return;
      event.preventDefault();
      finishRecording();
    };
    document.addEventListener("keydown", down, true);
    document.addEventListener("keyup", up, true);
    return () => {
      document.removeEventListener("keydown", down, true);
      document.removeEventListener("keyup", up, true);
    };
  });

  // The recording timer.
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setNow(timestamp()), 100);
    return () => window.clearInterval(timer);
  }, [recording]);

  // --- Opening and closing -----------------------------------------------

  const open = () => {
    try {
      setAutoNext(localStorage.getItem(AUTO_NEXT_STORAGE_KEY) === "on");
    } catch {}
    const onlyMissing = missing.length > 0;
    setMissingOnly(onlyMissing);
    setList(onlyMissing ? items.filter((item) => !item.audio[voice]) : items);
    setIndex(0);
    setNotice(null);
    dialogRef.current?.showModal();
    void startMicrophone();
  };

  // Stops recording at once (whatever's mid-take is dropped); uploads
  // carry on in the background.
  const close = () => {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    chunksRef.current = [];
    stopMicrophone();
    playerRef.current?.pause();
    dialogRef.current?.close();
  };

  const toggleAutoNext = (on: boolean) => {
    setAutoNext(on);
    try {
      localStorage.setItem(AUTO_NEXT_STORAGE_KEY, on ? "on" : "off");
    } catch {}
  };

  const voiceName =
    voice === "female" ? t("record_audio.female", "Female voice") : t("record_audio.male", "Male voice");
  const elapsed = recording && recordStartedAt ? Math.max(0, (now - recordStartedAt) / 1000) : 0;

  const statusIcon = (item: RecordingItem) => {
    const entry = takes[itemKey(item)];
    if (entry?.status === "uploading" || entry?.status === "queued")
      return <CloudUpload aria-hidden className="h-3.5 w-3.5 shrink-0 text-ai" />;
    if (entry?.status === "failed") return <AlertTriangle aria-hidden className="h-3.5 w-3.5 shrink-0 text-shu" />;
    if (isDone(item)) return <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-matcha-dark" strokeWidth={3} />;
    return <CircleDashed aria-hidden className="h-3.5 w-3.5 shrink-0 text-sumi-soft/50" />;
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={open} disabled={items.length === 0}>
        {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Mic aria-hidden className="h-4 w-4" />}
        {pending
          ? t("record_audio.button_uploading", "{{voice}} — uploading {{count}}…", { voice: voiceName, count: pending })
          : t("record_audio.button", "Record {{voice}} ({{count}} missing)", {
              voice: voiceName.toLowerCase(),
              count: missing.length,
            })}
      </Button>

      <dialog
        ref={dialogRef}
        aria-label={t("record_audio.title", "Record — {{voice}}", { voice: voiceName })}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-3xl border border-card-border bg-washi p-0 text-left text-sm text-sumi shadow-2xl backdrop:bg-sumi/50"
      >
        <audio ref={playerRef} className="hidden" />

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="mr-auto">
              <h2 className="font-nunito text-lg font-extrabold">
                {t("record_audio.title", "Record — {{voice}}", { voice: voiceName })}
              </h2>
              <p className="text-xs text-sumi-soft">{deckTitle}</p>
            </div>
            <span className="rounded-full bg-matcha/15 px-3 py-1 text-xs font-bold text-matcha-dark tabular-nums">
              {t("record_audio.progress", "{{done}} of {{total}} recorded", { done: doneCount, total: list.length })}
            </span>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tabular-nums",
                failedCount ? "bg-shu/10 text-shu-dark" : pending ? "bg-ai-soft text-ai-dark" : "bg-washi-soft text-sumi-soft",
              )}
            >
              {pending ? (
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
              ) : failedCount ? (
                <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
              ) : (
                <CloudUpload aria-hidden className="h-3.5 w-3.5" />
              )}
              {failedCount
                ? t("record_audio.failed_count", "{{count}} failed to upload", { count: failedCount })
                : pending
                  ? t("record_audio.uploading", "Uploading {{count}}…", { count: pending })
                  : t("record_audio.all_uploaded", "Everything's uploaded")}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label={t("common.close", "Close")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sumi-soft transition hover:bg-ghost-hover hover:text-sumi"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex rounded-full border border-sumi/15 p-0.5">
              {[true, false].map((onlyMissing) => (
                <button
                  key={String(onlyMissing)}
                  type="button"
                  onClick={() => choose(onlyMissing)}
                  disabled={recording}
                  aria-pressed={missingOnly === onlyMissing}
                  className={cn(
                    "rounded-full px-3 py-1 font-semibold transition",
                    missingOnly === onlyMissing ? "bg-sumi text-washi" : "text-sumi-soft hover:text-sumi",
                  )}
                >
                  {onlyMissing
                    ? t("record_audio.filter_missing", "Missing ({{count}})", { count: missing.length })
                    : t("record_audio.filter_all", "Everything ({{count}})", { count: items.length })}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 font-semibold text-sumi-soft">
              <input
                type="checkbox"
                checked={autoNext}
                onChange={(event) => toggleAutoNext(event.target.checked)}
                className="h-3.5 w-3.5 accent-ai"
              />
              {t("record_audio.auto_next", "Go to the next one after each take")}
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
            {/* Everything in this session, to jump around. */}
            <ol className="flex max-h-[60dvh] flex-col gap-0.5 overflow-y-auto rounded-2xl border border-card-border bg-washi-soft p-1.5">
              {list.map((item, position) => (
                <li key={itemKey(item)}>
                  <button
                    type="button"
                    onClick={() => !recording && setIndex(position)}
                    aria-current={position === index ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition",
                      position === index ? "bg-ai-soft font-semibold text-ai-dark" : "text-sumi hover:bg-ghost-hover",
                    )}
                  >
                    {item.target === "word" ? (
                      <Type aria-hidden className="h-3.5 w-3.5 shrink-0 text-sumi-soft" />
                    ) : (
                      <MessageSquareText aria-hidden className="h-3.5 w-3.5 shrink-0 text-sumi-soft" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{item.text}</span>
                    {statusIcon(item)}
                  </button>
                </li>
              ))}
              {list.length === 0 && (
                <li className="p-3 text-center text-xs text-sumi-soft">
                  {t("record_audio.nothing_missing", "Nothing's missing — switch to Everything to redo any.")}
                </li>
              )}
            </ol>

            <div className="flex min-w-0 flex-col gap-3">
              {mic === "denied" ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-shu/30 bg-shu/5 p-8 text-center">
                  <MicOff aria-hidden className="h-8 w-8 text-shu" />
                  <p className="font-semibold text-sumi">
                    {t("record_audio.mic_denied", "The microphone isn't available.")}
                  </p>
                  <p className="text-xs text-sumi-soft">
                    {t("record_audio.mic_denied_help", "Allow microphone access for this site in the browser, then try again.")}
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={() => void startMicrophone()}>
                    {t("record_audio.try_again", "Try again")}
                  </Button>
                </div>
              ) : current ? (
                <>
                  {/* What to say. */}
                  <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-card-border bg-washi-soft px-6 py-8 text-center">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-sumi-soft uppercase">
                      {current.target === "word"
                        ? t("record_audio.word", "Word")
                        : t("record_audio.sentence", "Example sentence")}
                      <span className="tabular-nums">
                        · {index + 1}/{list.length}
                      </span>
                    </span>
                    <p
                      className={cn(
                        "font-nunito font-extrabold text-sumi",
                        current.target === "word" ? "text-5xl" : "text-2xl sm:text-3xl",
                      )}
                    >
                      {current.text}
                    </p>
                    <p className="text-sm text-sumi-soft">{current.context}</p>
                  </div>

                  {/* The recorder. Space anywhere, or hold this. */}
                  <button
                    type="button"
                    disabled={mic !== "ready" || processing}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      startRecording();
                    }}
                    onPointerUp={finishRecording}
                    onPointerLeave={() => {
                      if (recordingRef.current) finishRecording();
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 px-6 py-6 transition select-none",
                      recording
                        ? "border-shu bg-shu/10"
                        : "border-dashed border-sumi/20 bg-washi hover:border-ai/40 disabled:opacity-60",
                    )}
                  >
                    {mic === "starting" ? (
                      <>
                        <Loader2 aria-hidden className="h-8 w-8 animate-spin text-ai" />
                        <span className="font-semibold">
                          {t("record_audio.mic_starting", "Starting the microphone…")}
                        </span>
                      </>
                    ) : processing ? (
                      <>
                        <Loader2 aria-hidden className="h-8 w-8 animate-spin text-ai" />
                        <span className="font-semibold">{t("record_audio.processing", "Cleaning up the recording…")}</span>
                      </>
                    ) : recording ? (
                      <>
                        <span className="flex items-center gap-2 font-nunito text-lg font-extrabold text-shu-dark">
                          <span className="h-3 w-3 animate-pulse rounded-full bg-shu" />
                          {t("record_audio.recording", "Recording")}
                          <span className="tabular-nums">{elapsed.toFixed(1)}s</span>
                        </span>
                        <span className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-shu/15">
                          <span
                            className="block h-full rounded-full bg-shu transition-[width] duration-75"
                            style={{ width: `${Math.round(level * 100)}%` }}
                          />
                        </span>
                        <span className="text-xs text-sumi-soft">
                          {t("record_audio.release", "Let go of Space when you've finished")}
                        </span>
                      </>
                    ) : (
                      <>
                        <Mic aria-hidden className="h-8 w-8 text-ai" />
                        <span className="font-nunito text-lg font-extrabold">
                          {take || existing
                            ? t("record_audio.hold_to_redo", "Hold Space to record it again")
                            : t("record_audio.hold_to_record", "Hold Space to record")}
                        </span>
                      </>
                    )}
                  </button>

                  {notice && (
                    <p className="flex items-center gap-1.5 rounded-xl border border-kin/40 bg-kin/15 px-3 py-2 text-xs text-sumi">
                      <AlertTriangle aria-hidden className="h-3.5 w-3.5 shrink-0 text-acorn" />
                      {notice}
                    </p>
                  )}

                  {/* The take, or the recording it already has. */}
                  {(take || existing) && !recording && (
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-card-border bg-washi-soft px-3 py-2 text-xs">
                      <Button type="button" size="sm" variant="outline" onClick={() => play(take?.url ?? existing)}>
                        <Play aria-hidden className="h-3.5 w-3.5" />
                        {t("record_audio.play", "Play (P)")}
                      </Button>
                      <span className="mr-auto text-sumi-soft">
                        {take
                          ? t("record_audio.new_take", "New take · {{seconds}}s", { seconds: take.seconds.toFixed(1) })
                          : t("record_audio.existing", "Already recorded")}
                      </span>
                      {take?.status === "queued" || take?.status === "uploading" ? (
                        <span className="flex items-center gap-1 font-semibold text-ai-dark">
                          <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                          {t("record_audio.take_uploading", "Uploading")}
                        </span>
                      ) : take?.status === "saved" ? (
                        <span className="flex items-center gap-1 font-semibold text-matcha-dark">
                          <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />
                          {t("record_audio.take_saved", "Saved")}
                        </span>
                      ) : take?.status === "failed" ? (
                        <>
                          <span className="font-semibold text-shu-dark">{take.error}</span>
                          <Button type="button" size="sm" variant="outline" onClick={() => retry(current)}>
                            <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                            {t("record_audio.retry", "Retry")}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => go(-1)} disabled={index === 0 || recording}>
                      <ArrowLeft aria-hidden className="h-4 w-4" />
                      {t("record_audio.previous", "Previous")}
                    </Button>
                    <span className="hidden text-[11px] text-sumi-soft sm:block">
                      {t("record_audio.keys", "Space: record · Enter or →: next · ←: back · P: play · Esc: stop")}
                    </span>
                    <Button type="button" size="sm" onClick={() => go(1)} disabled={recording}>
                      {t("record_audio.next", "Next")}
                      <ArrowRight aria-hidden className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-matcha/40 bg-matcha/10 p-8 text-center">
                  <Check aria-hidden className="h-8 w-8 text-matcha-dark" strokeWidth={3} />
                  <p className="font-nunito text-lg font-extrabold">
                    {list.length
                      ? t("record_audio.finished", "That's the lot!")
                      : t("record_audio.nothing_to_record", "Nothing left to record.")}
                  </p>
                  <p className="text-xs text-sumi-soft">
                    {pending
                      ? t("record_audio.finished_uploading", "The last recordings are still uploading — you can close this, they'll carry on.")
                      : t("record_audio.finished_uploaded", "Everything's uploaded.")}
                  </p>
                  <div className="flex gap-2">
                    {list.length > 0 && (
                      <Button type="button" size="sm" variant="outline" onClick={() => go(-1)}>
                        <ArrowLeft aria-hidden className="h-4 w-4" />
                        {t("record_audio.previous", "Previous")}
                      </Button>
                    )}
                    <Button type="button" size="sm" onClick={close}>
                      {t("record_audio.close", "Close")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
