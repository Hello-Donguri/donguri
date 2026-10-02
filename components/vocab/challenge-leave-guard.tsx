"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, DoorOpen } from "lucide-react";
import { skipDailyChallenge } from "@/lib/actions/daily-challenge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n/locale-provider";

// Whether a daily challenge attempt is under way — set by the chat, read by
// the page's "Back to course" link, which sits outside it.
const LeaveGuardContext = createContext<{
  active: boolean;
  setActive: (active: boolean) => void;
}>({ active: false, setActive: () => {} });

export function ChallengeLeaveGuardProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  return <LeaveGuardContext.Provider value={{ active, setActive }}>{children}</LeaveGuardContext.Provider>;
}

// Marks an attempt as under way for as long as `active` is true (and the
// chat is on screen).
export function useChallengeInProgress(active: boolean) {
  const { setActive } = useContext(LeaveGuardContext);
  useEffect(() => {
    setActive(active);
    return () => setActive(false);
  }, [active, setActive]);
}

// The daily challenge page's "Back to course". Mid-attempt, leaving counts
// as giving up on it — the same as "Too hard? Skip": it asks first, then
// uses up the attempt (no XP) before going back. Otherwise (between
// attempts, or the day's done) it's a plain link.
export function ChallengeBackLink({ courseSlug }: { courseSlug: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { active } = useContext(LeaveGuardContext);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [pending, startLeaving] = useTransition();
  const href = `/dashboard/courses/${courseSlug}`;

  const linkClass =
    "group inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-sumi-soft transition hover:text-sumi";
  const label = (
    <>
      <ArrowLeft aria-hidden className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      {t("daily_challenge.back_to_course", "Back to course")}
    </>
  );

  if (!active) {
    return (
      <Link href={href} prefetch className={linkClass}>
        {label}
      </Link>
    );
  }

  const leave = () => {
    startLeaving(async () => {
      // Even if recording it fails, they asked to leave — so they do.
      await skipDailyChallenge(courseSlug).catch(() => null);
      router.push(href);
    });
  };

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className={linkClass}>
        {label}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={pending}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !pending) event.currentTarget.close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-matcha/25 bg-washi p-6 text-sumi shadow-2xl backdrop:bg-sumi/40 backdrop:backdrop-blur-[2px] sm:p-8"
      >
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-matcha-soft text-matcha-dark">
          <DoorOpen className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 id={titleId} className="text-xl font-bold">
          {t("daily_challenge.leave_title", "Leave this challenge?")}
        </h2>
        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-sumi-soft">
          {t(
            "daily_challenge.leave_description",
            "Going back uses up one of today's attempts and earns no XP, the same as skipping it.",
          )}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" autoFocus disabled={pending} onClick={() => dialogRef.current?.close()}>
            {t("daily_challenge.skip_keep_going", "Keep trying")}
          </Button>
          <Button variant="secondary" disabled={pending} onClick={leave}>
            {pending
              ? t("daily_challenge.leaving", "Leaving…")
              : t("daily_challenge.leave_confirm", "Leave")}
          </Button>
        </div>
      </dialog>
    </>
  );
}
