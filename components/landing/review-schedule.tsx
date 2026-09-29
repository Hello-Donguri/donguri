import { Award, Clock, Undo2 } from "lucide-react";
import { Section, SectionHeading } from "@/components/landing/section";
import type { TFunction } from "@/lib/i18n/translate";

// The seven review stages and the wait after reaching each one — kept in
// step with STAGES in lib/srs.ts.
export function ReviewSchedule({ t }: { t: TFunction }) {
  const stages = [
    { name: t("home.review.stage_1", "Beginner 1"), wait: t("home.review.wait_4h", "4 hours") },
    { name: t("home.review.stage_2", "Beginner 2"), wait: t("home.review.wait_1d", "1 day") },
    { name: t("home.review.stage_3", "Beginner 3"), wait: t("home.review.wait_3d", "3 days") },
    { name: t("home.review.stage_4", "Intermediate 1"), wait: t("home.review.wait_1w", "1 week") },
    { name: t("home.review.stage_5", "Intermediate 2"), wait: t("home.review.wait_2w", "2 weeks") },
    { name: t("home.review.stage_6", "Expert 1"), wait: t("home.review.wait_1m", "1 month") },
  ];

  return (
    <Section>
      <SectionHeading
        accent="kin"
        eyebrow={t("home.review.eyebrow", "Reviews")}
        heading={t("home.review.heading", "Each word comes back just before you'd forget it.")}
        subtext={t(
          "home.review.subtext",
          "Answer correctly and the next review moves further away. Seven stages later, the word is yours.",
        )}
      />

      <ol className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {stages.map((stage, index) => (
          <li
            key={stage.name}
            className="flex flex-col rounded-2xl border border-card-border bg-washi-soft px-4 py-4"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-sumi-soft">
              {t("home.review.stage_number", "Stage {{number}}", { number: index + 1 })}
            </span>
            <span className="mt-1 font-semibold text-sumi">{stage.name}</span>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-sumi-soft">
              <Clock aria-hidden className="h-3.5 w-3.5" />
              {stage.wait}
            </span>
          </li>
        ))}
        <li className="col-span-2 flex flex-col justify-center rounded-2xl bg-kin/20 px-4 py-4 sm:col-span-2 lg:col-span-1">
          <Award aria-hidden className="h-6 w-6 text-sumi" />
          <span className="mt-2 font-bold text-sumi">{t("home.review.mastered", "Mastered")}</span>
          <span className="mt-1 text-sm text-sumi-soft">
            {t("home.review.mastered_body", "No more reviews needed.")}
          </span>
        </li>
      </ol>

      <p className="mx-auto mt-8 flex max-w-2xl items-start justify-center gap-2.5 text-center text-sm text-sumi-soft text-pretty">
        <Undo2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        {t(
          "home.review.slip",
          "Get one wrong and it comes back sooner. Words you've known for weeks only step back a little, so one slip never undoes all that work.",
        )}
      </p>
    </Section>
  );
}
