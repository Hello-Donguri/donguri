"use client";

import { useEffect, useState } from "react";
import { Code } from "lucide-react";
import { devRawExample } from "@/lib/actions/dev";
import { useDevMode } from "@/components/dashboard/dev-mode-context";

type RawExample = Awaited<ReturnType<typeof devRawExample>>;

// Dev mode only: under a cloze built from a grammar example's "&&&" marks,
// the example exactly as stored — marks, highlights and all — so how it
// was read can be checked against what was written. Fetched on demand
// (the question never carries it, as it holds the answers).
export function DevRawExample({ exampleId }: { exampleId: string | undefined }) {
  const { enabled } = useDevMode();
  const [raw, setRaw] = useState<{ id: string; example: RawExample } | null>(null);

  useEffect(() => {
    if (!enabled || !exampleId) return;
    let current = true;
    devRawExample(exampleId)
      .then((example) => {
        if (current) setRaw({ id: exampleId, example });
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [enabled, exampleId]);

  if (!enabled || !exampleId || raw?.id !== exampleId || !raw.example) return null;
  const { en, ja, enHighlight, jaHighlight } = raw.example;

  return (
    <div className="mt-4 w-full rounded-2xl border border-dashed border-kin bg-kin/10 px-4 py-3 text-left font-mono text-xs text-sumi">
      <p className="mb-1.5 inline-flex items-center gap-1.5 font-sans font-semibold uppercase tracking-wide text-acorn">
        <Code aria-hidden className="h-3.5 w-3.5" />
        Raw example
      </p>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
        <dt className="text-sumi-soft">en</dt>
        <dd className="break-words">{en}</dd>
        <dt className="text-sumi-soft">ja</dt>
        <dd className="break-words">{ja}</dd>
        {(enHighlight || jaHighlight) && (
          <>
            <dt className="text-sumi-soft">**</dt>
            <dd className="break-words">
              en: {enHighlight ?? "—"} · ja: {jaHighlight ?? "—"}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
