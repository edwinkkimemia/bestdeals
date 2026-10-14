"use client";

import { useRef, useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";

/** Public seller cover — wide banner atop the seller page, like shop covers. */
export function SellerCoverForm({ initialUrl, name }: { initialUrl: string | null; name: string }) {
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
        body: JSON.stringify({ coverUrl: next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "Save failed.");
      setUrl(next);
      setMsg(next ? "Cover updated ✓ — live on your seller page." : "Cover removed.");
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
    <div>
      <p className="text-sm font-bold">Seller cover</p>
      <p className="text-xs text-ink-500">Public — wide banner on your seller page. JPG/PNG/WebP, max 5MB.</p>
      {/* Fixed height lives on the container: a 404 cover collapses to the
          gradient instead of zero height. */}
      <div className="relative mt-2 h-32 overflow-hidden rounded-xl border border-neutral-200 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800">
        {url && (
          <SafeImage src={url} alt={`${name} seller cover`} className="h-32 w-full object-cover" />
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label="Choose seller cover"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="btn-secondary !px-3 !py-1.5 text-xs">
          {busy ? "Uploading…" : url ? "Change cover" : "Upload cover"}
        </button>
        {url && (
          <button type="button" disabled={busy} onClick={() => save(null)} className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-sand-50">
            Remove
          </button>
        )}
      </div>
      {msg && <p role="status" className="mt-1 text-xs">{msg}</p>}
    </div>
  );
}
