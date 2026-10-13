"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  createWorldCountry,
  createWorldItem,
  createWorldSlide,
  deleteWorldCountry,
  deleteWorldItem,
  deleteWorldSlide,
  moveWorldSlide,
  setRoomBackground,
  setWorldItemActive,
  updateWorldCountry,
  updateWorldItem,
  updateWorldSlide,
} from "@/lib/actions/world";
import type { WorldFormState } from "@/lib/definitions";
import { FileField } from "@/components/ui/file-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { VisibilityToggle } from "@/components/ui/visibility-toggle";
import { useTranslations } from "@/components/i18n/locale-provider";

// The admin forms for the world map (/dashboard/admin/world): countries,
// each country's slides and items, and the room background. Several of
// each sit on one page, so fields here are written out with their own ids
// rather than TextField (which ids by name).

const PHOTO_ACCEPT = "image/webp,image/png,image/jpeg";
const ITEM_ACCEPT = "image/png,image/webp";

const inputClass =
  "w-full min-w-0 rounded-lg border border-sumi/15 bg-washi px-4 py-2.5 text-sumi outline-none transition focus:border-ai focus:ring-2 focus:ring-ai-soft";
const labelClass = "text-sm font-medium text-sumi-soft";

// The picked image, shown before it's uploaded.
function useImagePreview() {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  const setFile = useCallback(
    (file: File | null) => setPreview(file ? URL.createObjectURL(file) : null),
    [],
  );
  return [preview, setFile] as const;
}

// Clears a create form once it's saved.
function useResetOnSuccess(state: WorldFormState, reset: () => void) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      reset();
    }
  }, [state, reset]);
  return formRef;
}

function FormMessage({ state }: { state: WorldFormState }) {
  if (!state?.message && !state?.errors) return null;
  const text = state.message ?? Object.values(state.errors ?? {}).flat().join(" ");
  return <p className={`text-sm ${state.success ? "text-matcha-dark" : "text-shu"}`}>{text}</p>;
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
    </div>
  );
}

// --- Countries ------------------------------------------------------------------

// Pick a country off the map; its name fills in, and can be changed (e.g.
// "United States of America" to "USA"). Countries already set up aren't
// offered.
export function CreateWorldCountryForm({ options }: { options: { key: string; name: string }[] }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(createWorldCountry, undefined);
  const [name, setName] = useState("");
  const resetName = useCallback(() => setName(""), []);
  const formRef = useResetOnSuccess(state, resetName);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <Field label={t("admin_world.map_country", "Country on the map")} id="mapKey">
        <select
          id="mapKey"
          name="mapKey"
          required
          defaultValue=""
          onChange={(event) => setName(event.target.selectedOptions[0]?.text ?? "")}
          className={inputClass}
        >
          <option value="" disabled>
            {t("admin_world.choose_country", "Choose…")}
          </option>
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("admin_world.display_name", "Name learners see")} id="country-name">
        <input
          id="country-name"
          name="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText={t("admin_create_category.creating", "Creating…")}>
        {t("admin_world.add_country", "Add country")}
      </SubmitButton>
    </form>
  );
}

export function EditWorldCountryForm({ country }: { country: { id: string; name: string; itemCount: number } }) {
  const t = useTranslations();
  const router = useRouter();
  const [state, action, pending] = useActionState(updateWorldCountry, undefined);
  const [deleting, startDelete] = useTransition();

  const handleDelete = () => {
    const confirmed = confirm(
      t(
        "admin_world.confirm_delete_country",
        'Permanently delete "{{name}}"? Its slides and {{count}} items go too, including from learners\' rooms. Hide it instead to keep them.',
        { name: country.name, count: country.itemCount },
      ),
    );
    if (confirmed) {
      startDelete(async () => {
        await deleteWorldCountry(country.id);
        router.push("/dashboard/admin/world");
      });
    }
  };

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="countryId" value={country.id} />
      <div className="flex-1">
        <Field label={t("admin_world.display_name", "Name learners see")} id="edit-country-name">
          <input id="edit-country-name" name="name" required defaultValue={country.name} className={inputClass} />
        </Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton pending={pending} pendingText={t("common.saving", "Saving…")}>
          {t("common.save", "Save")}
        </SubmitButton>
        <Button variant="outline" tone="danger" onClick={handleDelete} disabled={deleting} className="mt-2">
          {t("common.delete", "Delete")}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

// --- Room background ------------------------------------------------------------

export function RoomBackgroundForm({ currentUrl }: { currentUrl: string | null }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(setRoomBackground, undefined);
  const [preview, setPreviewFile] = useImagePreview();
  const formRef = useResetOnSuccess(state, useCallback(() => setPreviewFile(null), [setPreviewFile]));
  const shown = preview ?? currentUrl;

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-sumi/20 bg-washi">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- bunny.net image or a local blob: preview.
          <img src={shown} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-sumi-soft">{t("admin_world.no_background", "No background yet")}</span>
        )}
      </div>
      <FileField
        label={t("admin_world.room_background", "Room background")}
        name="image"
        id="room-background"
        accept={PHOTO_ACCEPT}
        required
        onChange={setPreviewFile}
      />
      <p className="text-xs text-sumi-soft">
        {t("admin_world.room_background_hint", "Shown at 4:3 — anything wider or taller is cropped at the edges.")}
      </p>
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText={t("common.saving", "Saving…")}>
        {t("admin_world.save_background", "Save background")}
      </SubmitButton>
    </form>
  );
}

// --- Slides ---------------------------------------------------------------------

export function CreateWorldSlideForm({ countryId }: { countryId: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(createWorldSlide, undefined);
  const [preview, setPreviewFile] = useImagePreview();
  const formRef = useResetOnSuccess(state, useCallback(() => setPreviewFile(null), [setPreviewFile]));

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="countryId" value={countryId} />
      <SlideFields idPrefix="new-slide" preview={preview} onImage={setPreviewFile} />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText={t("admin_create_category.creating", "Creating…")}>
        {t("admin_world.add_slide", "Add slide")}
      </SubmitButton>
    </form>
  );
}

function SlideFields({
  idPrefix,
  slide,
  preview,
  onImage,
}: {
  idPrefix: string;
  slide?: { title: string | null; body: string; imageUrl: string | null };
  preview: string | null;
  onImage: (file: File | null) => void;
}) {
  const t = useTranslations();
  const shown = preview ?? slide?.imageUrl ?? null;

  return (
    <>
      {shown && (
        // eslint-disable-next-line @next/next/no-img-element -- bunny.net image or a local blob: preview.
        <img src={shown} alt="" className="aspect-[16/10] w-full rounded-xl bg-washi object-cover" />
      )}
      <Field label={t("admin_world.slide_title", "Title (optional)")} id={`${idPrefix}-title`}>
        <input id={`${idPrefix}-title`} name="title" defaultValue={slide?.title ?? ""} className={inputClass} />
      </Field>
      <Field label={t("admin_world.slide_body", "Text")} id={`${idPrefix}-body`}>
        <textarea
          id={`${idPrefix}-body`}
          name="body"
          rows={4}
          defaultValue={slide?.body ?? ""}
          className={inputClass}
        />
      </Field>
      <FileField
        label={
          slide?.imageUrl
            ? t("admin_world.replace_image", "Replace image (optional)")
            : t("admin_world.slide_image", "Image (optional)")
        }
        name="image"
        id={`${idPrefix}-image`}
        accept={PHOTO_ACCEPT}
        onChange={onImage}
      />
    </>
  );
}

export function EditWorldSlideForm({
  slide,
  index,
  count,
}: {
  slide: { id: string; title: string | null; body: string; imageUrl: string | null };
  index: number;
  count: number;
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(updateWorldSlide, undefined);
  const [preview, setPreviewFile] = useImagePreview();
  const [busy, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm(t("admin_world.confirm_delete_slide", "Delete this slide?"))) {
      startTransition(() => deleteWorldSlide(slide.id));
    }
  };

  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-card-border bg-washi-soft p-4">
      <input type="hidden" name="slideId" value={slide.id} />
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sumi">
          {t("admin_world.slide_number", "Slide {{number}}", { number: index + 1 })}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            aria-label={t("admin_world.move_up", "Move up")}
            disabled={busy || index === 0}
            onClick={() => startTransition(() => moveWorldSlide(slide.id, -1))}
          >
            <ArrowUp aria-hidden className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={t("admin_world.move_down", "Move down")}
            disabled={busy || index === count - 1}
            onClick={() => startTransition(() => moveWorldSlide(slide.id, 1))}
          >
            <ArrowDown aria-hidden className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <SlideFields idPrefix={`slide-${slide.id}`} slide={slide} preview={preview} onImage={setPreviewFile} />
      {slide.imageUrl && (
        <label className="flex items-center gap-2 text-sm text-sumi-soft">
          <input type="checkbox" name="removeImage" className="h-4 w-4 accent-ai" />
          {t("admin_world.remove_image", "Remove the image")}
        </label>
      )}
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton pending={pending} pendingText={t("common.saving", "Saving…")}>
          {t("common.save", "Save")}
        </SubmitButton>
        <Button variant="outline" tone="danger" onClick={handleDelete} disabled={busy} className="mt-2">
          {t("common.delete", "Delete")}
        </Button>
      </div>
    </form>
  );
}

// --- Items ----------------------------------------------------------------------

function ItemImage({ src, faded = false }: { src: string | null; faded?: boolean }) {
  const t = useTranslations();
  return (
    <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-card-border bg-washi">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- bunny.net image or a local blob: preview.
        <img src={src} alt="" className={`h-full w-full object-contain ${faded ? "opacity-40 grayscale" : ""}`} />
      ) : (
        <span className="text-xs text-sumi-soft">{t("admin_badges.no_image", "No image")}</span>
      )}
    </span>
  );
}

export function CreateWorldItemForm({ countryId }: { countryId: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(createWorldItem, undefined);
  const [preview, setPreviewFile] = useImagePreview();
  const formRef = useResetOnSuccess(state, useCallback(() => setPreviewFile(null), [setPreviewFile]));

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="countryId" value={countryId} />
      <div className="flex items-center gap-4">
        <ItemImage src={preview} />
        <div className="min-w-0 flex-1">
          <FileField
            label={t("admin_world.item_image", "Item image (transparent PNG)")}
            name="image"
            id="new-item-image"
            accept={ITEM_ACCEPT}
            required
            onChange={setPreviewFile}
          />
        </div>
      </div>
      <Field label={t("admin_badges.name", "Name")} id="new-item-name">
        <input id="new-item-name" name="name" required placeholder="e.g. Teapot" className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText={t("admin_create_category.creating", "Creating…")}>
        {t("admin_world.add_item", "Add item")}
      </SubmitButton>
    </form>
  );
}

export function EditWorldItemForm({
  item,
}: {
  item: { id: string; name: string; imageUrl: string; active: boolean; ownerCount: number };
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(updateWorldItem, undefined);
  const [preview, setPreviewFile] = useImagePreview();
  const [deleting, startDelete] = useTransition();

  const handleDelete = () => {
    const confirmed = confirm(
      t(
        "admin_world.confirm_delete_item",
        'Permanently delete "{{name}}"? The {{count}} learners who have it lose it from their rooms. Hide it instead to let them keep it.',
        { name: item.name, count: item.ownerCount },
      ),
    );
    if (confirmed) startDelete(() => deleteWorldItem(item.id));
  };

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-2xl border border-card-border bg-washi-soft p-4 sm:flex-row sm:items-start"
    >
      <input type="hidden" name="itemId" value={item.id} />
      <ItemImage src={preview ?? item.imageUrl} faded={!item.active} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-sumi-soft">
            {t("admin_world.owner_count", "{{count}} learners have it", { count: item.ownerCount })}
          </p>
          <VisibilityToggle
            active={item.active}
            toggleAction={setWorldItemActive.bind(null, item.id)}
            label={item.name}
          />
        </div>
        <input
          name="name"
          required
          defaultValue={item.name}
          aria-label={t("admin_badges.name", "Name")}
          className={inputClass}
        />
        <FileField
          label={t("admin_world.replace_image", "Replace image (optional)")}
          name="image"
          id={`item-image-${item.id}`}
          accept={ITEM_ACCEPT}
          onChange={setPreviewFile}
        />
        <FormMessage state={state} />
        <div className="flex gap-2">
          <SubmitButton pending={pending} pendingText={t("common.saving", "Saving…")}>
            {t("common.save", "Save")}
          </SubmitButton>
          <Button variant="outline" tone="danger" onClick={handleDelete} disabled={deleting} className="mt-2">
            {t("common.delete", "Delete")}
          </Button>
        </div>
      </div>
    </form>
  );
}
