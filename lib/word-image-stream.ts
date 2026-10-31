import "server-only";

import type { NextRequest } from "next/server";
import type { WordImageEvent } from "@/lib/generated-word-image";

// A streamed reply for the word-picture routes (see
// app/api/admin/word-images): `work` reports through `emit` as it goes,
// and each event is sent as one JSON line, ending with an "end" event.
// When the page aborts its request (Stop, or closing the window) `signal`
// fires — however that reaches us: the request's own signal, or the stream
// being cancelled — and an error from stopping isn't reported.
export function streamWordImageEvents(
  request: NextRequest,
  work: (signal: AbortSignal, emit: (event: WordImageEvent) => void) => Promise<void>,
) {
  const stop = new AbortController();
  request.signal.addEventListener("abort", () => stop.abort());

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      stop.abort();
    },
    async start(controller) {
      let open = true;
      const emit = (event: WordImageEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // The page went away mid-run; carry on quietly.
          open = false;
        }
      };
      try {
        await work(stop.signal, emit);
        emit({ type: "end", ok: true });
      } catch (error) {
        if (!stop.signal.aborted) {
          console.error("Word picture failed", error);
          emit({ type: "end", ok: false, error: error instanceof Error ? error.message : "Something went wrong." });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already cancelled by the page.
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
