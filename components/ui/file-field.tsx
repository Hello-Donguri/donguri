"use client";

import { useState } from "react";

type FileFieldProps = {
  label: string;
  name: string;
  // Defaults to `name`; pass one when several fields share a name on a page.
  id?: string;
  accept?: string;
  required?: boolean;
  errors?: string[];
  onChange?: (file: File | null) => void;
  // Turns away a bigger file the moment it's picked, with `maxBytesError`,
  // rather than after the whole form's been sent. Checked on the server
  // too — this is only for a quicker answer.
  maxBytes?: number;
  maxBytesError?: string;
  hint?: string;
};

export function FileField({
  label,
  name,
  id = name,
  accept,
  required = false,
  errors,
  onChange,
  maxBytes,
  maxBytesError,
  hint,
}: FileFieldProps) {
  const [tooBig, setTooBig] = useState(false);
  const shownErrors = tooBig && maxBytesError ? [maxBytesError] : errors;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-sumi-soft">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        aria-invalid={shownErrors && shownErrors.length > 0}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          const rejected = Boolean(file && maxBytes && file.size > maxBytes);
          setTooBig(rejected);
          // Cleared, so the form can't be sent with it.
          if (rejected) e.target.value = "";
          onChange?.(rejected ? null : file);
        }}
        className="rounded-lg border border-sumi/15 bg-washi px-4 py-2.5 text-sumi outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-ai/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ai-dark focus:border-ai focus:ring-2 focus:ring-ai-soft"
      />
      {hint && <p className="text-xs text-sumi-soft">{hint}</p>}
      {shownErrors?.map((error) => (
        <p key={error} className="text-sm text-shu">
          {error}
        </p>
      ))}
    </div>
  );
}
