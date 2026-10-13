"use client";

import type { ReactNode } from "react";
import { useDevMode } from "@/components/dashboard/dev-mode-context";

// Shows its children only while dev mode is on. Dev mode is a browser-side
// switch, so this hides, not secures — render it for admins only, and
// check the role on the server for anything behind it.
export function DevModeOnly({ children }: { children: ReactNode }) {
  const { enabled } = useDevMode();
  return enabled ? children : null;
}
