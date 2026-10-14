"use client";

import { useEffect, useState } from "react";
import { wmImageSrc } from "@/lib/watermark";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & { src: string; alt: string };

/**
 * Product photo served through the watermark endpoint, so the bytes the
 * browser holds (and right-click → save downloads) already carry the mark.
 * Falls back to the raw source if watermarking ever fails (e.g. endpoint
 * rate-limit or a pre-fix ephemeral upload), and to a neutral placeholder
 * if the source itself is gone — never a tall broken-image box.
 */
export function WmImage({ src, alt, ...rest }: Props) {
  const [wmFailed, setWmFailed] = useState(false);
  const [rawFailed, setRawFailed] = useState(false);
  // Gallery/thumbnail instances are reused across photos — a failure for one
  // src must never poison the next.
  useEffect(() => {
    setWmFailed(false);
    setRawFailed(false);
  }, [src]);
  if (!src || rawFailed) {
    // Empty alt (decorative thumbs) hides from assistive tech; a real alt
    // announces as an image. Only className carries over — the rest are
    // <img>-only attributes invalid on a span.
    return alt ? (
      <span
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-sand-100 text-xs font-semibold text-ink-400 ${rest.className ?? ""}`}
      >
        Chap
      </span>
    ) : (
      <span
        aria-hidden
        className={`flex items-center justify-center bg-sand-100 text-xs font-semibold text-ink-400 ${rest.className ?? ""}`}
      >
        Chap
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={wmFailed ? src : wmImageSrc(src)}
      alt={alt}
      onError={() => (wmFailed ? setRawFailed(true) : setWmFailed(true))}
      {...rest}
    />
  );
}
