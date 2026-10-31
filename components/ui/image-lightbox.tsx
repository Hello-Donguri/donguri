"use client";

import { useRef, useState, type ReactNode } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "@/components/i18n/locale-provider";

// A thumbnail that opens its image full size in a modal. `children` is the
// thumbnail itself; clicking it (or Enter/Space) opens the picture at its
// natural size, scaled down to fit the screen. Esc, the ×, or a click
// outside the picture closes it.
//
// `inspect` is for checking a generated picture closely: it's shown as big
// as the screen allows (a picture with no size of its own, like many SVGs,
// would otherwise open tiny), on a checkerboard so its transparency shows,
// and can be zoomed to twice that to look at the lines.
export function ImageLightbox({
  src,
  alt,
  children,
  className = "",
  inspect = false,
  backgroundStyle,
}: {
  src: string;
  alt: string;
  children: ReactNode;
  className?: string;
  inspect?: boolean;
  // Behind an inspected picture — the checkerboard.
  backgroundStyle?: React.CSSProperties;
}) {
  const t = useTranslations();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The picture loads only once it's first opened.
  const [opened, setOpened] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const open = () => {
    setOpened(true);
    setZoomed(false);
    dialogRef.current?.showModal();
  };

  // As big as fits on screen, square (generated pictures are), or twice that.
  const side = "min(calc(100vw - 2rem), calc(100dvh - 4rem))";

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
          {opened &&
            (inspect ? (
              <div
                className="overflow-auto rounded-2xl bg-white shadow-2xl"
                style={{ ...backgroundStyle, width: side, height: side }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a data URL, not a hosted file. */}
                <img
                  src={src}
                  alt={alt}
                  onClick={() => setZoomed(!zoomed)}
                  style={{ width: zoomed ? `calc(${side} * 2)` : side, height: zoomed ? `calc(${side} * 2)` : side }}
                  className={`block max-w-none object-contain ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
                />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- a bunny.net image at its own size.
              <img
                src={src}
                alt={alt}
                className="block max-h-[calc(100dvh-4rem)] max-w-[calc(100vw-2rem)] rounded-2xl bg-washi object-contain shadow-2xl"
              />
            ))}
          {inspect && opened && (
            <button
              type="button"
              onClick={() => setZoomed(!zoomed)}
              aria-pressed={zoomed}
              className="absolute -top-3 right-8 flex h-9 items-center gap-1.5 rounded-full bg-raised px-3 text-xs font-semibold text-sumi shadow-lg transition hover:bg-washi"
            >
              {zoomed ? <ZoomOut aria-hidden className="h-4 w-4" /> : <ZoomIn aria-hidden className="h-4 w-4" />}
              {zoomed ? t("image_lightbox.fit", "Fit") : t("image_lightbox.zoom", "Zoom 2×")}
            </button>
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
