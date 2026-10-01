"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { unenrollFromCourse } from "@/lib/actions/courses";
import { useTranslations } from "@/components/i18n/locale-provider";

// Under each enrolled course on the course list. Asks first, and says up
// front that nothing is lost — leaving only hides the course until they
// enroll again (see unenrollFromCourse).
export function UnenrollButton({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();

  const leave = () => {
    const confirmed = confirm(
      t(
        "courses_page.unenroll_confirm",
        "Unenroll from {{course}}? Your progress is saved — enroll again any time to pick up where you left off.",
        { course: courseTitle },
      ),
    );
    if (!confirmed) return;
    startTransition(() => unenrollFromCourse(courseId));
  };

  return (
    <button
      type="button"
      onClick={leave}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-sumi-soft transition hover:bg-shu/10 hover:text-shu-dark disabled:opacity-60"
    >
      <LogOut aria-hidden className="h-4 w-4" />
      {pending
        ? t("courses_page.unenrolling", "Unenrolling…")
        : t("courses_page.unenroll", "Unenroll")}
    </button>
  );
}
