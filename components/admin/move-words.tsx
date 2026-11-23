"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRightLeft, X } from "lucide-react";
import { moveWords } from "@/lib/actions/admin-content";
import { SELECT_CLASS } from "@/components/admin/word-image-settings";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useTranslations } from "@/components/i18n/locale-provider";

export type MoveTargetDeck = {
  id: string;
  title: string;
  courseTitle: string;
  sameCourse: boolean;
  isTest: boolean;
  isStarter: boolean;
};

// On the admin deck page, beside Batch images: moves the ticked words to
// another deck in the same language (see moveWords) — choose the deck,
// then confirm with the words listed, as moving takes every learner's
// progress on them along too.
export function MoveWords({
  words,
  decks,
  onMoved,
}: {
  words: { id: string; term: string }[];
  decks: MoveTargetDeck[];
  onMoved: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deckId, setDeckId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moving, startMoving] = useTransition();

  const deck = decks.find((candidate) => candidate.id === deckId) ?? null;
  const otherCourses = decks.some((candidate) => !candidate.sameCourse);
  const label = (candidate: MoveTargetDeck) =>
    [
      candidate.title,
      candidate.isStarter ? t("admin_move_words.starter", "(starter)") : null,
      candidate.isTest ? t("admin_move_words.test", "(test)") : null,
    ]
      .filter(Boolean)
      .join(" ");

  const open = () => {
    setDeckId((current) => (decks.some((candidate) => candidate.id === current) ? current : (decks[0]?.id ?? "")));
    setConfirming(false);
    setError(null);
    dialogRef.current?.showModal();
  };

  const close = () => {
    if (moving) return;
    dialogRef.current?.close();
  };

  const move = () =>
    startMoving(async () => {
      if (!deck) return;
      setError(null);
      const result = await moveWords(
        words.map((word) => word.id),
        deck.id,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      toast(
        t("admin_move_words.moved", "Moved {{count}} words to {{deck}}.", {
          count: result.moved ?? words.length,
          deck: deck.title,
        }),
      );
      dialogRef.current?.close();
      onMoved();
      router.refresh();
    });

  // The course's own decks, then any other course's with the same languages.
  const groups = otherCourses
    ? [...new Set(decks.map((candidate) => candidate.courseTitle))].map((courseTitle) => ({
        courseTitle,
        decks: decks.filter((candidate) => candidate.courseTitle === courseTitle),
      }))
    : null;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={open} disabled={words.length === 0 || decks.length === 0}>
        <ArrowRightLeft aria-hidden className="h-4 w-4" />
        {t("admin_move_words.button", "Move ({{count}})", { count: words.length })}
      </Button>

      <dialog
        ref={dialogRef}
        aria-label={t("admin_move_words.title", "Move words")}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-card-border bg-washi p-0 text-left text-sm text-sumi shadow-2xl backdrop:bg-sumi/50"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-nunito text-lg font-extrabold">
              {confirming
                ? t("admin_move_words.confirm_title", "Are you sure?")
                : t("admin_move_words.title", "Move words")}
            </h2>
            <button
              type="button"
              onClick={close}
              disabled={moving}
              aria-label={t("common.close", "Close")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sumi-soft transition hover:bg-ghost-hover hover:text-sumi"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>

          {!confirming ? (
            <>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-sumi-soft">
                {t("admin_move_words.deck", "Move {{count}} words to", { count: words.length })}
                <select value={deckId} onChange={(event) => setDeckId(event.target.value)} className={SELECT_CLASS}>
                  {groups
                    ? groups.map((group) => (
                        <optgroup key={group.courseTitle} label={group.courseTitle}>
                          {group.decks.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {label(candidate)}
                            </option>
                          ))}
                        </optgroup>
                      ))
                    : decks.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {label(candidate)}
                        </option>
                      ))}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={close}>
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button type="button" size="sm" onClick={() => setConfirming(true)} disabled={!deck}>
                  {t("admin_move_words.next", "Next")}
                </Button>
              </div>
            </>
          ) : (
            deck && (
              <>
                <p>
                  {t("admin_move_words.confirm", "You'll move the following {{count}} words to {{deck}}:", {
                    count: words.length,
                    deck: deck.sameCourse ? deck.title : `${deck.courseTitle} — ${deck.title}`,
                  })}
                </p>
                <ul className="flex max-h-60 flex-wrap gap-1.5 overflow-y-auto rounded-2xl border border-card-border bg-washi-soft p-3">
                  {words.map((word) => (
                    <li key={word.id} className="rounded-full bg-washi px-2.5 py-1 text-xs font-semibold text-sumi shadow-sm">
                      {word.term}
                    </li>
                  ))}
                </ul>
                <p className="flex items-start gap-2 rounded-xl border border-kin/40 bg-kin/10 px-3 py-2 text-xs text-sumi">
                  <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-acorn" />
                  {t(
                    "admin_move_words.note",
                    "They'll leave this deck, keeping their pictures, recordings, examples and every learner's progress, and go to the end of that deck.",
                  )}
                </p>
                {error && <p className="text-xs font-semibold text-shu-dark">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={moving}>
                    {t("admin_move_words.back", "Back")}
                  </Button>
                  <Button type="button" size="sm" onClick={move} disabled={moving}>
                    <ArrowRightLeft aria-hidden className="h-4 w-4" />
                    {moving
                      ? t("admin_move_words.moving", "Moving…")
                      : t("admin_move_words.move", "Yes, move {{count}} words", { count: words.length })}
                  </Button>
                </div>
              </>
            )
          )}
        </div>
      </dialog>
    </>
  );
}
