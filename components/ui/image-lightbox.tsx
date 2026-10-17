"use client";

import { useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "@/components/i18n/locale-provider";

// A thumbnail that opens its image full size in a modal. `children` is the
// thumbnail itself; clicking it (or Enter/Space) opens the picture at its
// natural size, scaled down to fit the screen. Esc, the ×, or a click
// outside the picture closes it.
export function ImageLightbox({
  src,
  alt,
  children,
  className = "",
}: {
  src: string;
  alt: string;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The picture loads only once it's first opened.
  const [opened, setOpened] = useState(false);

  const open = () => {
    setOpened(true);
    dialogRef.current?.showModal();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={t("image_lightbox.open", "View {{alt}} full size", { alt })}
        className={`cursor-zoom-in rounded-lg transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ai focus-visible:outline-none ${className}`}
      >
        {children}
      </button>

      <dialog
        ref={dialogRef}
        aria-label={alt}
        // A click on the backdrop lands on the dialog itself, not its contents.
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-visible bg-transparent p-0 backdrop:bg-sumi/70"
      >
        <div className="relative">
          {opened && (
            // eslint-disable-next-line @next/next/no-img-element -- a bunny.net image at its own size.
            <img
              src={src}
              alt={alt}
              className="block max-h-[calc(100dvh-4rem)] max-w-[calc(100vw-2rem)] rounded-2xl bg-washi object-contain shadow-2xl"
            />
          )}
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={t("common.close", "Close")}
            className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-raised text-sumi shadow-lg transition hover:bg-washi"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </dialog>
    </>
  );
}
