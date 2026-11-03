// Counting how often learners listen to each word (see app/api/listens and
// the listen buttons in components/vocab/session-ui.tsx). Fire and forget:
// a beacon, so it never holds up the sound, and still arrives if the page
// is left straight after.

export type ListenSource = "female" | "male" | "speech";

export function countListen(wordId: string | undefined, source: ListenSource) {
  if (!wordId) return;
  const body = JSON.stringify({ wordId, source });
  try {
    if (navigator.sendBeacon?.("/api/listens", new Blob([body], { type: "application/json" }))) return;
  } catch {}
  void fetch("/api/listens", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(
    () => {},
  );
}
