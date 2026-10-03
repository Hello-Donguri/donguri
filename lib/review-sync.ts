// Tells other open tabs that the review queue just changed (a review was
// answered, a word was learnt), so their "words due" count can catch up
// straight away — see useLiveDueCount. A BroadcastChannel reaches every tab
// on this origin without a server round trip; browsers without it just
// don't sync across tabs.
const CHANNEL = "donguri:review-queue";

export function announceReviewQueueChanged(courseSlug: string): void {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(CHANNEL);
  channel.postMessage({ courseSlug });
  channel.close();
}

export function onReviewQueueChanged(listener: (courseSlug: string) => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (event: MessageEvent<{ courseSlug?: unknown }>) => {
    if (typeof event.data?.courseSlug === "string") listener(event.data.courseSlug);
  };
  return () => channel.close();
}
