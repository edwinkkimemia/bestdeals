"use client";

import { useState } from "react";
import { wmImageSrc } from "@/lib/watermark";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & { src: string; alt: string };

/**
 * Product photo served through the watermark endpoint, so the bytes the
 * browser holds (and right-click → save downloads) already carry the mark.
 * Falls back to the raw source if watermarking ever fails.
 */
export function WmImage({ src, alt, ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={failed ? src : wmImageSrc(src)} alt={alt} onError={() => setFailed(true)} {...rest} />
  );
}
