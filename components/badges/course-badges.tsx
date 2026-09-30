"use client";

import { useRef } from "react";
import { Award, ChevronRight, X } from "lucide-react";
import { BadgeTile } from "@/components/badges/badge-tile";
import { BadgeTooltip } from "@/components/badges/badge-tooltip";
import { useTranslations } from "@/components/i18n/locale-provider";
import type { BadgeView } from "@/lib/badges";

// How many earned badges fit in the greeting's row before "See all".
const MAX_IN_ROW = 5;

// The course page's badges, under "Welcome back": the learner's latest
// badges for this course (and every-course ones) as a row of medals, with a
// button that opens them all — earned, then still to earn with progress —
// in a modal. Nothing at all until an admin has made a badge.
export function CourseBadges({
  earned,
  locked,
}: {
  earned: BadgeView[];
  locked: (BadgeView & { progress: number })[];
}) {
  const t = useTranslations();
  const dialogRef = useRef<HTMLDialogElement>(null);

  if (earned.length === 0 && locked.length === 0) return null;

  const shown = earned.slice(0, MAX_IN_ROW);
  const hidden = earned.length - shown.length;
  const open = () => dialogRef.current?.showModal();

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {shown.length > 0 ? (
          <ul className="flex items-center" aria-label={t("badges.your_badges", "Your badges")}>
            {shown.map((badge, index) => (
              <li key={badge.id} className={`relative hover:z-10 focus-within:z-10 ${index > 0 ? "-ml-2.5" : ""}`}>
                <BadgeTooltip name={badge.name}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-raised shadow-sm ring-2 ring-washi transition group-hover/badge:-translate-y-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- an admin-uploaded bunny.net image. */}
                    <img src={badge.imageUrl} alt="" className="h-10 w-10 object-contain" />
                  </span>
                </BadgeTooltip>
              </li>
            ))}
          </ul>
        ) : (
          <span className="flex items-center gap-2 text-sm text-sumi-soft">
            <Award aria-hidden className="h-5 w-5 text-acorn" />
            {t("badges.none_yet", "No badges yet")}
          </span>
        )}

        <button
          type="button"
          onClick={open}
          className="inline-flex items-center gap-1 rounded-full border border-card-border bg-washi-soft px-3 py-1.5 text-sm font-semibold text-sumi transition hover:bg-raised"
        >
          {hidden > 0
            ? t("badges.see_all_more", "+{{count}} · See all", { count: hidden })
            : shown.length > 0
              ? t("badges.see_all", "See all badges")
              : t("badges.see_what_to_earn", "See what you can earn")}
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-label={t("badges.your_badges", "Your badges")}
        onClick={(event) => {
          // A click on the backdrop lands on the <dialog> itself.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-3xl border border-card-border bg-washi p-0 shadow-2xl backdrop:bg-sumi/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-card-border bg-washi/95 px-6 py-4 backdrop-blur">
          <div>
            <h2 className="font-nunito text-xl font-extrabold text-sumi">
              {t("badges.your_badges", "Your badges")}
            </h2>
            <p className="text-sm text-sumi-soft">
              {t("badges.earned_of", "{{earned}} of {{total}} earned", {
                earned: earned.length,
                total: earned.length + locked.length,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={t("common.close", "Close")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sumi/5 text-sumi-soft transition hover:bg-sumi/10 hover:text-sumi"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          {earned.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-sumi-soft">
                {t("badges.earned", "Earned")}
              </h3>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {earned.map((badge) => (
                  <li key={badge.id}>
                    <BadgeTile badge={badge} t={t} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {locked.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-sumi-soft">
                {t("badges.still_to_earn", "Still to earn")}
              </h3>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {locked.map((badge) => (
                  <li key={badge.id}>
                    <BadgeTile badge={badge} progress={badge.progress} t={t} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </dialog>
    </>
  );
}
