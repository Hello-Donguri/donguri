"use client";

import { useId, useRef, useState, useTransition } from "react";
import { TriangleAlert, Undo2 } from "lucide-react";
import { devClearReviewQueue } from "@/lib/actions/dev";
import { useDevMode } from "@/components/dashboard/dev-mode-context";
import { Button } from "@/components/ui/button";

// Dev mode only: sends every word in this course's review queue back to
// unlearnt (see devClearReviewQueue), after the same warning dialog as
// ResetProgressButton. XP is kept.
export function ClearReviewQueueButton({ courseSlug, className }: { courseSlug: string; className?: string }) {
  const { enabled } = useDevMode();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  if (!enabled) return null;

  function handleClear() {
    if (pending) return;
    setError(false);
    startTransition(async () => {
      try {
        await devClearReviewQueue(courseSlug);
        dialogRef.current?.close();
      } catch {
        setError(true);
      }
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setError(false);
          dialogRef.current?.showModal();
        }}
        className={`border-dashed border-kin bg-washi hover:bg-washi-soft ${className ?? ""}`}
      >
        <Undo2 className="h-4 w-4" aria-hidden="true" />
        Remove words from queue
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={pending}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-shu/20 bg-washi p-6 text-sumi shadow-2xl backdrop:bg-sumi/40 backdrop:backdrop-blur-[2px] sm:p-8"
      >
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-shu/10 text-shu">
          <TriangleAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 id={titleId} className="text-xl font-bold">
          Remove all words from the queue?
        </h2>
        <div id={descriptionId} className="mt-3 space-y-4 text-sm leading-relaxed text-sumi-soft">
          <p>
            Every word you&apos;ve learnt in this course goes back to unlearnt, and its review history is
            deleted. Your XP stays.
          </p>
          <p className="rounded-xl border border-shu/20 bg-shu/5 px-4 py-3 font-semibold text-shu">
            This action cannot be undone.
          </p>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-shu">
            Couldn&apos;t remove the words. Please try again.
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" autoFocus disabled={pending} onClick={() => dialogRef.current?.close()}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={handleClear} className="bg-shu text-white hover:bg-shu-dark">
            {pending ? "Removing…" : "Remove words"}
          </Button>
        </div>
      </dialog>
    </>
  );
}
