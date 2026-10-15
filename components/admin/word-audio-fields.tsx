"use client";

import { useEffect, useState } from "react";
import { FileField } from "@/components/ui/file-field";
import { useTranslations } from "@/components/i18n/locale-provider";
import type { WordAudio } from "@/lib/definitions";

const AUDIO_ACCEPT = "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm,.mp3,.m4a,.wav,.ogg,.webm";

// The word create/edit forms' "Pronunciation" section: a female and a male
// recording, each optional (see saveWordAudio in
// lib/actions/admin-content.ts). Shows what's uploaded with a player and a
// Remove tick-box, and a picked file plays before it's saved. Words with
// neither keep the browser's read-through for learners.
export function WordAudioFields({
  current = null,
  errors,
}: {
  current?: WordAudio | null;
  errors?: { audioFemale?: string[]; audioMale?: string[] };
}) {
  const t = useTranslations();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <VoiceField
        voice="Female"
        label={t("admin_word_form.audio_female", "Female voice")}
        currentUrl={current?.female ?? null}
        errors={errors?.audioFemale}
      />
      <VoiceField
        voice="Male"
        label={t("admin_word_form.audio_male", "Male voice")}
        currentUrl={current?.male ?? null}
        errors={errors?.audioMale}
      />
    </div>
  );
}

function VoiceField({
  voice,
  label,
  currentUrl,
  errors,
}: {
  voice: "Female" | "Male";
  label: string;
  currentUrl: string | null;
  errors?: string[];
}) {
  const t = useTranslations();
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const shown = preview ?? currentUrl;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-card-border bg-washi p-4">
      <FileField
        label={currentUrl ? t("admin_word_form.audio_replace", "{{voice}} — replace", { voice: label }) : label}
        name={`audio${voice}`}
        id={`audio${voice}`}
        accept={AUDIO_ACCEPT}
        errors={errors}
        onChange={(file) => setPreview(file ? URL.createObjectURL(file) : null)}
      />
      {shown ? (
        <audio controls src={shown} className="w-full" preload="none" />
      ) : (
        <p className="text-xs text-sumi-soft">
          {t("admin_word_form.audio_none", "None yet — learners hear the read-through.")}
        </p>
      )}
      {currentUrl && (
        <label className="flex items-center gap-2 text-sm text-sumi-soft">
          <input type="checkbox" name={`removeAudio${voice}`} className="h-4 w-4 accent-ai" />
          {t("admin_word_form.audio_remove", "Remove this recording")}
        </label>
      )}
    </div>
  );
}
