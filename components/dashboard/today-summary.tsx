import { BookOpen, Clock, MessageCircle } from "lucide-react";
import type { DailyActivityCount } from "@/lib/definitions";
import type { TFunction } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

// In the course page's profile card: what the learner has done so far
// today, as pills in the activity chart's colours — words learnt (vocab and
// grammar), reviews, and the daily challenge. Nothing until they've done
// something today; the streak line beside the greeting already nudges them
// to start. Solid fills, as the card hangs them over its bottom border.
export function TodaySummary({
  today,
  t,
  className,
}: {
  today: DailyActivityCount | undefined;
  t: TFunction;
  className?: string;
}) {
  if (!today) return null;
  const learnt = today.vocab + today.grammar;

  const pills = [
    learnt > 0 && {
      key: "learnt",
      icon: BookOpen,
      className: "border-ai/20 bg-ai-soft text-ai-dark",
      label: t("course_home.today_learnt", "{{count}} learnt today", { count: learnt }),
    },
    today.review > 0 && {
      key: "review",
      icon: Clock,
      className: "border-shu/20 bg-[color-mix(in_oklab,var(--shu)_14%,var(--raised))] text-shu-dark",
      label: t("course_home.today_reviewed", "{{count}} reviewed today", { count: today.review }),
    },
    today.challenge > 0 && {
      key: "challenge",
      icon: MessageCircle,
      className: "border-matcha/20 bg-matcha-soft text-matcha-dark",
      label: t("course_home.today_challenge", "Daily challenge done"),
    },
  ].filter((pill) => pill !== false);

  if (pills.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {pills.map((pill) => (
        <li
          key={pill.key}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-nunito text-xs font-extrabold whitespace-nowrap shadow-sm",
            pill.className,
          )}
        >
          <pill.icon aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
          {pill.label}
        </li>
      ))}
    </ul>
  );
}
