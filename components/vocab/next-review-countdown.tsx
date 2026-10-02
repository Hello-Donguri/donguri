"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { useTranslations } from "@/components/i18n/locale-provider";

// "14:32", "3h 12m", "2d 4h" — seconds only while it's under an hour, when
// it's close enough to be worth watching.
function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// On the course page's review card when nothing is due: a live countdown to
// the next word coming due. When it gets there the page refreshes, so the
// card switches to "1 word due" on its own.
export function NextReviewCountdown({ nextDueAt }: { nextDueAt: Date }) {
  const t = useTranslations();
  const router = useRouter();
  // Null until mounted: the server's clock and the browser's differ, so
  // rendering a time on the server would mismatch on hydration.
  const [now, setNow] = useState<number | null>(null);
  const dueAt = new Date(nextDueAt).getTime();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts the clock once mounted (see above).
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = now === null ? null : dueAt - now;
  const due = remaining !== null && remaining <= 0;

  useEffect(() => {
    if (due) router.refresh();
  }, [due, router]);

  if (remaining === null) return null;

  return (
    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-ink-on-dark backdrop-blur-sm">
      <Clock aria-hidden className="h-4 w-4" />
      {due
        ? t("course_home.review_ready", "Ready now!")
        : t("course_home.next_review_in", "Next review in {{time}}", {
            time: formatRemaining(remaining),
          })}
    </span>
  );
}
