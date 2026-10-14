"use client";

import { useEffect, useState } from "react";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  src: string | null | undefined;
  alt: string;
  /** Shown when src is missing or the bytes 404 (e.g. pre-fix ephemeral uploads). */
  fallback?: React.ReactNode;
};

/**
 * Image with a graceful missing-file fallback. Old uploads stored on ephemeral
 * /tmp (pre-DB/S3 fix) 404 after a redeploy — without this the shop page shows
 * a tall broken-image box. With this the gradient/avatar behind stays visible.
 */
export function SafeImage({ src, alt, fallback = null, className, ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  // Dashboard previews reuse the instance across uploads — a 404 for the old
  // src must never hide the newly uploaded photo.
  useEffect(() => {
    setFailed(false);
  }, [src]);
  if (!src || failed) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} {...rest} />;
}
