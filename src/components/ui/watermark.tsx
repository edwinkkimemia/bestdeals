/** On-photo Chap logo for images that predate baked watermarks (seeds, image links). */
export function WmPill({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/chaplogo.png"
      alt=""
      aria-hidden
      draggable={false}
      className={`pointer-events-none absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2 select-none opacity-40 ${className ?? ""}`}
    />
  );
}
