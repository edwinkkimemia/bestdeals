"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RichTextEditor } from "./rich-text-editor";

export type BlogInitial = {
  id?: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  coverUrl?: string | null;
  bodyHtml: string;
  status: string;
};

/** Create / edit form for an admin blog post. */
export function BlogForm({ initial }: { initial: BlogInitial }) {
  const router = useRouter();
  const isNew = !initial.id;
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [excerpt, setExcerpt] = useState(initial.excerpt ?? "");
  const [coverUrl, setCoverUrl] = useState<string | null>(initial.coverUrl ?? null);
  const [bodyHtml, setBodyHtml] = useState(initial.bodyHtml);
  const [status, setStatus] = useState(initial.status === "published" ? "published" : "draft");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onTitle = (v: string) => {
    setTitle(v);
    if (!slugTouched) {
      setSlug(
        v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 80)
      );
    }
  };

  const uploadCover = async (f: File | undefined) => {
    if (!f) return;
    setUploading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("files", f);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "Upload failed — use JPG/PNG/WebP under 5MB.");
      const url = (j.urls as string[] | undefined)?.[0];
      if (!url) return setMsg("Upload failed.");
      setCoverUrl(url);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const url = isNew ? "/api/admin/blog" : `/api/admin/blog/${initial.id}`;
      const r = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, excerpt, coverUrl, bodyHtml, status }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "Save failed.");
      router.push("/admin/blog");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!initial.id || !confirm("Delete this post permanently?")) return;
    setMsg("");
    const r = await fetch(`/api/admin/blog/${initial.id}`, { method: "DELETE" });
    if (!r.ok) return setMsg("Delete failed.");
    router.push("/admin/blog");
    router.refresh();
  };

  return (
    <form onSubmit={save} className="grid gap-3">
      <div className="card space-y-3 p-5">
        <div>
          <label className="label-bd" htmlFor="bp-title">Title</label>
          <input id="bp-title" className="input-bd" value={title} onChange={(e) => onTitle(e.target.value)} required minLength={3} maxLength={140} placeholder="e.g. How to spot a genuine phone in Nairobi" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label-bd" htmlFor="bp-slug">URL slug</label>
            <div className="flex items-center gap-1">
              <span className="shrink-0 text-xs text-ink-400">/blog/</span>
              <input id="bp-slug" className="input-bd font-mono !text-[13px]" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} required pattern="[a-z0-9-]+" minLength={3} maxLength={120} />
            </div>
          </div>
          <div>
            <span className="label-bd">Status</span>
            <div className="flex gap-2">
              {(["draft", "published"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  aria-pressed={status === s}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${status === s ? "border-brand-600 bg-brand-50 text-brand-700" : "border-neutral-300 text-ink-500"}`}
                >
                  {s === "published" ? "Published ✓" : "Draft"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="label-bd" htmlFor="bp-excerpt">Excerpt <span className="font-normal text-ink-400">(optional — auto-generated if empty)</span></label>
          <textarea id="bp-excerpt" className="input-bd min-h-16" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={300} rows={2} />
        </div>
        <div>
          <span className="label-bd">Cover image <span className="font-normal text-ink-400">(optional)</span></span>
          {coverUrl ? (
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt="Cover preview" className="h-36 w-full object-cover" />
            </div>
          ) : (
            <p className="rounded-xl bg-sand-50 p-3 text-xs text-ink-400">No cover yet.</p>
          )}
          <div className="mt-2 flex gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Choose cover image" onChange={(e) => uploadCover(e.target.files?.[0])} />
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="btn-secondary !px-3 !py-1.5 text-xs">
              {uploading ? "Uploading…" : coverUrl ? "Change cover" : "Upload cover"}
            </button>
            {coverUrl && (
              <button type="button" onClick={() => setCoverUrl(null)} className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-sand-50">Remove</button>
            )}
          </div>
        </div>
      </div>
      <div>
        <span className="label-bd">Article body</span>
        <RichTextEditor initialHtml={bodyHtml} onChange={setBodyHtml} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary flex-1" disabled={busy || uploading}>{busy ? "Saving…" : isNew ? "Publish post" : "Save changes"}</button>
        {!isNew && (
          <button type="button" onClick={remove} className="rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">Delete</button>
        )}
        <Link href="/admin/blog" className="btn-secondary">Cancel</Link>
      </div>
      {msg && <p role="alert" className="text-sm text-red-700">{msg}</p>}
    </form>
  );
}
