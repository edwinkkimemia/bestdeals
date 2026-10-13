"use client";

import { useState } from "react";

/**
 * Copy the listing's public URL (works from the dashboard without knowing
 * the site origin at render time). For pending items the link previews for
 * the owner/admins and goes public automatically once approved.
 */
export function CopyListingLink({ path, label = "Share" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy product link"
      className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs"
      onClick={async () => {
        try {
          const url = `${window.location.origin}${path}`;
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard unavailable (permissions) — no-op, link is still visible via Preview.
        }
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
