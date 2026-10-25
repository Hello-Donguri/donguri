"use client";

import { Link2 } from "lucide-react";
import type { LinkedWordStatus } from "@/lib/definitions";
import { useDevMode } from "@/components/dashboard/dev-mode-context";

const STATUS_LABEL: Record<LinkedWordStatus["status"], string> = {
  learnt: "learnt",
  "this-batch": "this batch",
  later: "still to come",
};

const STATUS_STYLE: Record<LinkedWordStatus["status"], string> = {
  learnt: "bg-matcha-soft text-matcha-dark",
  "this-batch": "bg-ai-soft text-ai-dark",
  later: "bg-sumi/5 text-sumi-soft",
};

// Debug mode only: floating in the bottom left corner like a toast (just
// above the learn page's action bar), the
// word's linked words (see WordLink) and where the learner is with each —
// so the ordering in orderLearnCandidates can be checked. Admin-only
// tooling, so not translated.
export function LinkedWordsDebug({ linkedWords }: { linkedWords: LinkedWordStatus[] | undefined }) {
  const { enabled } = useDevMode();
  if (!enabled) return null;

  return (
    <div
      role="status"
      className="fixed bottom-36 left-4 z-40 sm:bottom-24 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-dashed border-kin bg-raised px-4 py-3 text-sm text-sumi shadow-lg"
    >
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-acorn">
        <Link2 aria-hidden className="h-3.5 w-3.5" />
        Linked words
      </p>
      {linkedWords && linkedWords.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {linkedWords.map((linked) => (
            <li
              key={linked.term}
              className="inline-flex items-center gap-2 rounded-full bg-raised px-3 py-1 ring-1 ring-card-border"
            >
              <span className="font-semibold">{linked.term}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[linked.status]}`}>
                {STATUS_LABEL[linked.status]}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sumi-soft">None.</p>
      )}
    </div>
  );
}
