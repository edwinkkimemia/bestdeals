"use client";

import { useState } from "react";

/** Dismissible site-wide announcement bar (text managed in Admin → Settings). */
export function AnnouncementBar({ text }: { text: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !text.trim()) return null;
  return (
    <div className="bg-ink-900 text-white">
      <div className="container-bd flex items-center justify-center gap-3 py-2 text-center text-[13px] font-medium">
        <p className="min-w-0 flex-1">{text}</p>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss announcement"
          className="shrink-0 rounded-md px-2 py-0.5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
