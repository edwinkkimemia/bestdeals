"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { WmImage } from "@/components/ui/wm-image";

/**
 * Product gallery: watermarked main photo + watermarked thumbnails, with
 * prev/next arrows, keyboard navigation, a position counter, and a lightbox
 * for full-size viewing. Every rendered photo goes through <WmImage> so the
 * Chap mark is baked into all images — thumbnails previously used a raw
 * <img> and showed no watermark.
 */
export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const count = images.length;
  const safe = count > 0 ? images : ["/chaplogo.png"];

  const go = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + safe.length) % safe.length),
    [safe.length]
  );

  // Reset when navigating between listings (the parent also keys by listing
  // id, so this is belt-and-braces for same-id image updates). Clamp when
  // the set shrinks so the counter can never read "3 / 1".
  useEffect(() => setActive(0), [title, safe.length]);
  useEffect(() => {
    setActive((i) => Math.min(i, safe.length - 1));
  }, [safe.length]);
  // Keyboard arrows + Escape while the lightbox is open; the page behind is
  // scroll-locked for the duration.
  useEffect(() => {
    if (!lightbox) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, go]);

  return (
    <div>
      <div className="card relative overflow-hidden bg-sand-100">
        <WmImage
          src={safe[active]}
          alt={count > 1 ? `${title} — photo ${active + 1} of ${count}` : title}
          className="aspect-[4/3] w-full object-cover"
        />
        {safe.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-bold text-white" aria-live="polite">
              {active + 1} / {safe.length}
            </span>
          </>
        )}
        <button
          type="button"
          onClick={() => setLightbox(true)}
          aria-label="View fullscreen"
          className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
        >
          <Expand className="h-4 w-4" />
        </button>
      </div>

      {safe.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Product photos">
          {safe.map((s, i) => (
            <button
              key={`${s}-${i}`}
              aria-current={i === active}
              aria-label={`View photo ${i + 1}${i === 0 ? " (cover)" : ""}`}
              onClick={() => setActive(i)}
              className={`relative w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-sand-100 transition ${
                i === active ? "border-brand-600" : "border-transparent hover:border-neutral-300"
              }`}
            >
              <WmImage src={s} alt="" loading="lazy" className="h-16 w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Cover
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} photos`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            autoFocus
            aria-label="Close fullscreen"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
            onClick={() => setLightbox(false)}
          >
            <X className="h-5 w-5" />
          </button>
          {safe.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <div className="max-h-[86vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <WmImage
              src={safe[active]}
              alt={`${title} — photo ${active + 1} of ${safe.length}`}
              className="max-h-[86vh] w-full max-w-full rounded-xl object-contain"
            />
            {safe.length > 1 && (
              <p className="mt-2 text-center text-sm font-semibold text-white" aria-live="polite">
                {active + 1} / {safe.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
