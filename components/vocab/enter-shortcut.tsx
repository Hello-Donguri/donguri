"use client";

import { useRouter } from "next/navigation";
import { useEnterToContinue } from "@/components/vocab/session-ui";

// Enter follows `href` — for the learn/test/review pages' server-rendered
// screens (e.g. "nothing to learn right now"), whose one way forward is a
// link. Renders nothing.
export function EnterShortcut({ href }: { href: string }) {
  const router = useRouter();
  useEnterToContinue(true, () => router.push(href));
  return null;
}
