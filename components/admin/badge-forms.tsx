"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createBadge, deleteBadge, setBadgeActive, updateBadge } from "@/lib/actions/badges";
import { TextField } from "@/components/ui/text-field";
import { SelectField } from "@/components/ui/select";
import { FileField } from "@/components/ui/file-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { VisibilityToggle } from "@/components/ui/visibility-toggle";
import { useTranslations } from "@/components/i18n/locale-provider";
import {
  BADGE_METRICS,
  BADGE_TIMESCALES,
  badgeGoal,
  badgeMetricLabel,
  badgeTimescaleLabel,
  metricAllowsCourse,
  metricAllowsTimescale,
  type BadgeMetric,
  type BadgeTimescale,
} from "@/lib/badge-metrics";

const IMAGE_ACCEPT = "image/webp,image/png,image/jpeg";

// The picked image, shown before it's uploaded — round, as learners see it.
function useImagePreview() {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  // Stable, so effects that depend on it don't re-run every render.
  const setFile = useCallback(
    (file: File | null) => setPreview(file ? URL.createObjectURL(file) : null),
    [],
  );
  return [preview, setFile] as const;
}

export function CreateBadgeForm({ courses }: { courses: { id: string; title: string }[] }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(createBadge, undefined);
  const [preview, setPreviewFile] = useImagePreview();
  // The picked milestone, to grey out a course or timescale it can't have.
  const [metric, setMetric] = useState<BadgeMetric | "">("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setPreviewFile(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the milestone picker is reset with the rest of the form.
      setMetric("");
    }
  }, [state, setPreviewFile]);

  const courseLocked = metric !== "" && !metricAllowsCourse(metric);
  const timescaleLocked = metric !== "" && !metricAllowsTimescale(metric);

  return (
    <form
      ref={formRef}
      action={action}
      onChange={(event) => {
        const field = event.target;
        if (field instanceof HTMLSelectElement && field.name === "metric") {
          setMetric(field.value as BadgeMetric | "");
        }
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center gap-4">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-sumi/20 bg-washi">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview, which next/image can't load.
            <img src={preview} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-sumi-soft">{t("admin_badges.no_image", "No image")}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <FileField
            label={t("admin_badges.image", "Badge image")}
            name="image"
            accept={IMAGE_ACCEPT}
            required
            errors={state?.errors?.image}
            onChange={setPreviewFile}
          />
        </div>
      </div>

      <TextField
        label={t("admin_badges.name", "Name")}
        name="name"
        placeholder="e.g. Word Collector"
        errors={state?.errors?.name}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={t("admin_badges.metric", "Milestone")}
          name="metric"
          placeholder={t("admin_badges.metric_placeholder", "Choose…")}
          options={BADGE_METRICS.map((metric) => ({
            value: metric,
            label: badgeMetricLabel(metric, t),
          }))}
          errors={state?.errors?.metric}
        />
        <TextField
          label={t("admin_badges.threshold", "Target")}
          name="threshold"
          type="number"
          placeholder="e.g. 100"
          errors={state?.errors?.threshold}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={t("admin_badges.course", "Course")}
          name="courseId"
          required={false}
          placeholder={t("admin_badges.all_courses", "All courses")}
          options={courses.map((course) => ({ value: course.id, label: course.title }))}
          disabled={courseLocked}
          hint={
            courseLocked
              ? t("admin_badges.course_locked", "XP isn't tracked per course, so XP badges are for all courses.")
              : t("admin_badges.course_hint", "A course badge only counts that course, and shows on its page.")
          }
          errors={state?.errors?.courseId}
        />
        <SelectField
          label={t("admin_badges.timescale", "Timescale")}
          name="timescale"
          required={false}
          placeholder={badgeTimescaleLabel(null, t)}
          options={BADGE_TIMESCALES.map((timescale) => ({
            value: timescale,
            label: badgeTimescaleLabel(timescale, t),
          }))}
          disabled={timescaleLocked}
          hint={
            timescaleLocked
              ? metric === "challenge_xp"
                ? t("admin_badges.timescale_locked_day", "Daily challenge XP is always counted within one day.")
                : t("admin_badges.timescale_locked", "Streaks and mastered words can only be all time.")
              : t("admin_badges.timescale_hint", 'e.g. "In one day" + 10 words learnt = learn 10 words in a single day.')
          }
          errors={state?.errors?.timescale}
        />
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-card-border bg-washi px-4 py-3">
        <input type="checkbox" name="awardExisting" className="mt-1 h-4 w-4 accent-ai" />
        <span className="text-sm">
          <span className="font-medium text-sumi">
            {t("admin_badges.award_existing", "Give to existing users who already qualify")}
          </span>
          <span className="mt-0.5 block text-sumi-soft">
            {t(
              "admin_badges.award_existing_hint",
              "On: anyone already past the target gets it on their next visit. Off: only learners who reach it from now on earn it. This can't be changed later.",
            )}
          </span>
        </span>
      </label>

      {state?.message && (
        <p className={`text-sm ${state.success ? "text-matcha-dark" : "text-shu"}`}>{state.message}</p>
      )}
      <SubmitButton pending={pending} pendingText={t("admin_create_category.creating", "Creating…")}>
        {t("admin_badges.create", "Create badge")}
      </SubmitButton>
    </form>
  );
}

type EditBadgeFormProps = {
  badge: {
    id: string;
    name: string;
    imageUrl: string;
    metric: BadgeMetric;
    threshold: number;
    timescale: BadgeTimescale | null;
    courseTitle: string | null;
    active: boolean;
    awardExisting: boolean;
    earnedCount: number;
  };
};

// One existing badge: rename, change its target or image, hide or delete
// it. Its milestone, course, timescale and "existing users" choice are
// fixed once made.
export function EditBadgeForm({ badge }: EditBadgeFormProps) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(updateBadge, undefined);
  const [preview, setPreviewFile] = useImagePreview();
  const [deleting, startDelete] = useTransition();

  const handleDelete = () => {
    const confirmed = confirm(
      t(
        "admin_badges.confirm_delete",
        'Permanently delete "{{name}}"? The {{count}} learners who earned it lose it too. Hide it instead to keep it for them.',
        { name: badge.name, count: badge.earnedCount },
      ),
    );
    if (confirmed) startDelete(() => deleteBadge(badge.id));
  };

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-2xl border border-card-border bg-washi-soft p-4 sm:flex-row sm:items-start"
    >
      <input type="hidden" name="badgeId" value={badge.id} />
      {/* eslint-disable-next-line @next/next/no-img-element -- bunny.net image or a local blob: preview. */}
      <img
        src={preview ?? badge.imageUrl}
        alt=""
        className={`h-20 w-20 shrink-0 rounded-full bg-washi object-contain ${badge.active ? "" : "opacity-40 grayscale"}`}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-sumi-soft">
            <span className="font-medium text-sumi">
              {badgeGoal(badge.metric, badge.threshold, t, badge.timescale)}
            </span>{" "}
            · {badge.courseTitle ?? t("admin_badges.all_courses", "All courses")} ·{" "}
            {t("admin_badges.earned_count", "{{count}} earned", { count: badge.earnedCount })} ·{" "}
            {badge.awardExisting
              ? t("admin_badges.existing_on", "given to existing users")
              : t("admin_badges.existing_off", "new achievers only")}
          </p>
          <VisibilityToggle
            active={badge.active}
            toggleAction={setBadgeActive.bind(null, badge.id)}
            label={badge.name}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <input
            type="text"
            name="name"
            defaultValue={badge.name}
            aria-label={t("admin_badges.name", "Name")}
            className="min-w-0 rounded-lg border border-sumi/15 bg-washi px-4 py-2.5 text-sumi outline-none transition focus:border-ai focus:ring-2 focus:ring-ai-soft"
          />
          <input
            type="number"
            name="threshold"
            min={1}
            defaultValue={badge.threshold}
            aria-label={t("admin_badges.threshold", "Target")}
            className="min-w-0 rounded-lg border border-sumi/15 bg-washi px-4 py-2.5 text-sumi outline-none transition focus:border-ai focus:ring-2 focus:ring-ai-soft"
          />
        </div>
        <FileField
          label={t("admin_badges.replace_image", "Replace image (optional)")}
          name="image"
          id={`image-${badge.id}`}
          accept={IMAGE_ACCEPT}
          errors={state?.errors?.image}
          onChange={setPreviewFile}
        />

        {(state?.message || state?.errors) && (
          <p className={`text-sm ${state.success ? "text-matcha-dark" : "text-shu"}`}>
            {state.message ?? [...(state.errors?.name ?? []), ...(state.errors?.threshold ?? [])].join(" ")}
          </p>
        )}
        <div className="flex gap-2">
          <SubmitButton pending={pending} pendingText={t("common.saving", "Saving…")}>
            {t("common.save", "Save")}
          </SubmitButton>
          <Button variant="outline" tone="danger" size="sm" onClick={handleDelete} disabled={deleting}>
            {t("common.delete", "Delete")}
          </Button>
        </div>
      </div>
    </form>
  );
}
