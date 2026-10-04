"use client";

import { useEffect } from "react";
import { endStaleSession } from "@/lib/actions/session";

// Clears the stale session, then a full page load of the home page — not a
// client-side navigation, so nothing from the old session lingers.
export function EndStaleSession() {
  useEffect(() => {
    endStaleSession().finally(() => window.location.replace("/"));
  }, []);

  return null;
}
