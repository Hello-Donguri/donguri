import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { enrollInCourse } from "@/lib/actions/courses";
import { COURSE_LEVELS, type AvailableCourse, type EnrolledCourseSummary } from "@/lib/definitions";
import type { TFunction } from "@/lib/i18n/translate";
import { FakeButton } from "@/components/ui/fake-button";

// Each course card's look, in turn — the same card backgrounds and icon
// chips as the course page's learn, daily challenge and review cards.
// `checked` styles the selected level pill to match the card's chip.
const CARD_THEMES = [
  {
    image: "/images/blue-bg2.webp",
    accent: "bg-blue-100/95 text-blue-700",
    checked: "has-checked:bg-blue-100/95 has-checked:text-blue-700",
  },
  {
    image: "/images/green-bg.webp",
    accent: "bg-green-100/95 text-green-700",
    checked: "has-checked:bg-green-100/95 has-checked:text-green-700",
  },
  {
    image: "/images/red-bg.webp",
    accent: "bg-red-100/95 text-red-700",
    checked: "has-checked:bg-red-100/95 has-checked:text-red-700",
  },
];

// English fallbacks for the level picker's labels.
const LEVEL_LABELS = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

// The character on a course card's chip — what the course teaches.
const LANGUAGE_GLYPHS: Record<string, string> = { yue: "粵", en: "英", fr: "仏" };

const CARD_CLASS =
  "relative flex min-h-60 flex-col overflow-hidden rounded-2xl border border-card-border bg-cover bg-center p-5 shadow-sm sm:p-6";
const CARD_HOVER_CLASS =
  "group transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.015] hover:brightness-105 hover:shadow-md";

type CourseCardProps = { index: number; t: TFunction } & (
  | { course: EnrolledCourseSummary; enrolled: true }
  | { course: AvailableCourse; enrolled: false }
);

// A course on the dashboard or the course catalogue. Enrolled: the whole
// card links to the course, with progress and streak. Not enrolled: an
// "Enroll" button (a real form submit, so the card itself isn't a link) —
// "Re-enroll" for a course they left, whose progress is waiting for them.
// `index` picks the card's colours, so neighbouring cards differ.
export function CourseCard(props: CourseCardProps) {
  const { course, index, t } = props;
  const theme = CARD_THEMES[index % CARD_THEMES.length];

  const top = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl font-bold leading-none shadow-sm backdrop-blur-sm ${theme.accent}`}
        >
          {LANGUAGE_GLYPHS[course.targetLanguage] ?? course.title.charAt(0)}
        </div>

        {props.enrolled && props.course.currentStreak > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-ink-on-dark backdrop-blur-sm">
            <Flame aria-hidden className="h-3.5 w-3.5 fill-kin text-kin" />
            {t("dashboard_home.streak_days", "{{count}}-day streak", {
              count: props.course.currentStreak,
            })}
          </span>
        )}
      </div>

      <h3 className="mt-4 text-2xl font-extrabold leading-tight text-ink-on-dark sm:text-3xl">
        {course.title}
      </h3>
      {course.description && (
        <p className="mt-2 text-sm leading-relaxed text-ink-on-dark/85">{course.description}</p>
      )}
    </>
  );

  if (!props.enrolled) {
    return (
      <div className={CARD_CLASS} style={{ backgroundImage: `url(${theme.image})` }}>
        {top}
        <form action={enrollInCourse.bind(null, course.id)} className="mt-auto pt-5">
          {/* Sets how Charles Duck talks to them in the daily challenge.
              Starts on the level they had before, for a course they left. */}
          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-semibold text-ink-on-dark/90">
              {t("courses_page.level_label", "Your level")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {COURSE_LEVELS.map((level) => (
                <label
                  key={level}
                  className={`cursor-pointer rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-ink-on-dark backdrop-blur-sm transition hover:bg-white/25 has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-white ${theme.checked}`}
                >
                  <input
                    type="radio"
                    name="level"
                    value={level}
                    defaultChecked={level === (props.course.previousLevel ?? "beginner")}
                    className="sr-only"
                  />
                  {t(`courses_page.level_${level}`, LEVEL_LABELS[level])}
                </label>
              ))}
            </div>
          </fieldset>
          {props.course.previouslyEnrolled && (
            <p className="mb-3 text-xs font-semibold text-ink-on-dark/90">
              {t("courses_page.progress_saved", "Your progress is saved.")}
            </p>
          )}
          <button
            type="submit"
            className={`group inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold shadow-sm backdrop-blur-sm transition-[gap,transform] hover:-translate-y-0.5 hover:gap-3 ${theme.accent}`}
          >
            {props.course.previouslyEnrolled
              ? t("courses_page.re_enroll", "Re-enroll")
              : t("courses_page.enroll_free", "Enroll — free")}
            <ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
          </button>
        </form>
      </div>
    );
  }

  const enrolledCourse = props.course;
  const percent =
    enrolledCourse.totalWords > 0
      ? Math.round((enrolledCourse.knownWords / enrolledCourse.totalWords) * 100)
      : 0;

  return (
    <Link
      href={`/dashboard/courses/${course.slug}`}
      prefetch
      className={`${CARD_CLASS} ${CARD_HOVER_CLASS}`}
      style={{ backgroundImage: `url(${theme.image})` }}
    >
      {top}

      <div className="mt-auto pt-5">
        <div className="flex items-baseline justify-between gap-3 text-xs font-semibold text-ink-on-dark/90">
          <span>
            {t("dashboard_home.words_known", "{{known}} / {{total}} words known", {
              known: enrolledCourse.knownWords,
              total: enrolledCourse.totalWords,
            })}
          </span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={enrolledCourse.totalWords}
          aria-valuenow={enrolledCourse.knownWords}
          aria-label={course.title}
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/25"
        >
          <span className="block h-full rounded-full bg-white/90" style={{ width: `${percent}%` }} />
        </div>

        <div className="mt-4">
          <FakeButton className={theme.accent}>{t("courses_page.continue", "Continue")}</FakeButton>
        </div>
      </div>
    </Link>
  );
}
