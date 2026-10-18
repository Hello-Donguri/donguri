"use client";

import { useCallback, useEffect, useState } from "react";
import type { FollowState } from "@/lib/actions/friends";
import type { FollowCounts } from "@/lib/definitions";

// A follow or unfollow anywhere on the page — a profile's Follow button,
// the followers modal, the leaderboard's search box — is announced here
// with the viewer's new following leaderboard and counts, so every place
// showing them updates without a reload.

const EVENT = "donguri:follows-changed";

export function announceFollows(state: FollowState) {
  window.dispatchEvent(new CustomEvent<FollowState>(EVENT, { detail: state }));
}

export function useFollowsChanged(onChange: (state: FollowState) => void) {
  useEffect(() => {
    const listener = (event: Event) => onChange((event as CustomEvent<FollowState>).detail);
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
  }, [onChange]);
}

// The viewer's follower / following counts, kept current.
export function useFollowCounts(initial: FollowCounts): FollowCounts {
  const [counts, setCounts] = useState(initial);
  const onChange = useCallback((state: FollowState) => setCounts(state.counts), []);
  useFollowsChanged(onChange);
  return counts;
}
