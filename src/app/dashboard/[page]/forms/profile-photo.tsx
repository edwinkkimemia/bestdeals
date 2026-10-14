"use client";

import { useRef, useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";

/** Public profile photo — shown to everyone on listings + shop pages. */
export function ProfilePhotoForm({ initialUrl, name }: { initialUrl: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async (next: string | null) => {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "Save failed.");
      setUrl(next);
      setMsg(next ? "Photo updated ✓ — visible on your listings & shop." : "Photo removed.");
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("files", f);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "Upload failed — use JPG/PNG/WebP under 5MB.");
      const uploaded = (j.urls as string[] | undefined)?.[0];
      if (!uploaded) return setMsg("Upload failed.");
      await save(uploaded);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-2xl font-black text-white">
        {url ? (
          <SafeImage src={url} alt={`${name} profile photo`} className="h-full w-full object-cover" fallback={name.charAt(0).toUpperCase()} />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Profile photo</p>
        <p className="text-xs text-ink-500">Public — buyers see it on your listings and shop. JPG/PNG/WebP, max 5MB.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            aria-label="Choose profile photo"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="btn-secondary !px-3 !py-1.5 text-xs">
            {busy ? "Uploading…" : url ? "Change photo" : "Upload photo"}
          </button>
          {url && (
            <button type="button" disabled={busy} onClick={() => save(null)} className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-sand-50">
              Remove
            </button>
          )}
        </div>
        {msg && <p role="status" className="mt-1 text-xs">{msg}</p>}
      </div>
    </div>
  );
}

