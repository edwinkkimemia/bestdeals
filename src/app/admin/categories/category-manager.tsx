"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import type { Category } from "@/data/catalog";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/components/category-icon";
import { slugify } from "@/lib/utils";

type Props = {
  categories: Category[];
  hidden: Category[];
  counts: Record<string, number>;
  builtInSlugs: string[];
};

const BLANK: Category = {
  slug: "",
  name: "",
  icon: "LayoutGrid",
  blurb: "",
  image: "",
  subcategories: [],
  attributes: [],
};

const IMAGE_HINT =
  "Upload a JPG/PNG/WebP, or paste an https:// image URL. Category images appear on the home page, category rails and browse pages.";

export function CategoryManager({ categories, hidden, counts, builtInSlugs }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Category | null>(null);
  const [originalSlug, setOriginalSlug] = useState("");
  const [subs, setSubs] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const builtIn = new Set(builtInSlugs);

  const openNew = () => {
    setDraft({ ...BLANK, subcategories: [] });
    setOriginalSlug("");
    setSubs("");
    setMsg("");
    setErr("");
  };

  const openEdit = (category: Category) => {
    setDraft({ ...category, subcategories: [...category.subcategories], attributes: [...category.attributes] });
    setOriginalSlug(category.slug);
    setSubs(category.subcategories.join(", "));
    setMsg("");
    setErr("");
  };

  const close = () => {
    setDraft(null);
    setOriginalSlug("");
    setSubs("");
    setErr("");
  };

  const update = (patch: Partial<Category>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  const upload = async (file: File) => {
    setUploading(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("files", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setErr(json.error || "Image upload failed.");
      const url = Array.isArray(json.urls) ? json.urls[0] : "";
      if (!url) return setErr("Image upload failed.");
      update({ image: url });
      setMsg("Image uploaded — save the category to publish it.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const category: Category = {
        ...draft,
        subcategories: subs
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", originalSlug: originalSlug || undefined, category }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setErr(json.error || "Could not save the category.");
      close();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (category: Category) => {
    const isBuiltIn = builtIn.has(category.slug);
    const count = counts[category.slug] ?? 0;
    const prompt = isBuiltIn
      ? `Hide “${category.name}” from the storefront? ${count > 0 ? `${count} listing(s) keep their category until re-edited. ` : ""}You can restore it later.`
      : `Delete “${category.name}” permanently? ${count > 0 ? `${count} listing(s) will no longer be reachable through this category. ` : ""}This cannot be undone.`;
    if (!confirm(prompt)) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", slug: category.slug }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setErr(json.error || "Could not delete the category.");
      if (originalSlug === category.slug) close();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const restore = async (category: Category) => {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", slug: category.slug }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setErr(json.error || "Could not restore the category.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title">Categories ({categories.length})</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-500">
            Edit category names, images, icons and subcategories, or add a new category. Changes apply to the home page,
            navigation, browse pages, search filters and listing forms immediately.
          </p>
        </div>
        <button type="button" className="btn-primary !py-2 text-sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> Add category
        </button>
      </div>

      {(msg || err) && (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm ${err ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {err || msg}
        </p>
      )}

      {draft && (
        <form onSubmit={save} className="card space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold">{originalSlug ? `Edit “${draft.name || originalSlug}”` : "Add a category"}</p>
              <p className="mt-0.5 text-xs text-ink-400">
                {originalSlug && builtIn.has(originalSlug)
                  ? "Built-in category — the slug stays fixed so existing links keep working."
                  : "Category pages are created automatically at /browse/{slug}."}
              </p>
            </div>
            <button type="button" onClick={close} className="rounded-lg p-1.5 text-ink-400 hover:bg-sand-100" aria-label="Close editor">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label-bd" htmlFor="cat-name">Name</label>
              <input
                id="cat-name"
                className="input-bd"
                value={draft.name}
                onChange={(e) => {
                  const name = e.target.value;
                  update({ name, ...(originalSlug ? {} : { slug: slugify(name) }) });
                }}
                placeholder="e.g. Safety Equipment & Gear"
                maxLength={80}
                required
              />
            </div>
            <div>
              <label className="label-bd" htmlFor="cat-slug">Slug</label>
              <input
                id="cat-slug"
                className="input-bd"
                value={draft.slug}
                onChange={(e) => update({ slug: slugify(e.target.value) })}
                placeholder="safety-equipment"
                maxLength={60}
                disabled={Boolean(originalSlug)}
                required
              />
              <p className="mt-1 text-[11px] text-ink-400">Used in the URL: /browse/{draft.slug || "category-slug"}</p>
            </div>
            <div>
              <label className="label-bd" htmlFor="cat-icon">Icon</label>
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <CategoryIcon name={draft.icon} className="h-5 w-5" />
                </span>
                <select id="cat-icon" className="input-bd" value={draft.icon} onChange={(e) => update({ icon: e.target.value })}>
                  {CATEGORY_ICON_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label-bd" htmlFor="cat-blurb">Short description</label>
              <input
                id="cat-blurb"
                className="input-bd"
                value={draft.blurb}
                onChange={(e) => update({ blurb: e.target.value })}
                placeholder="One line shown on category pages and SEO copy"
                maxLength={240}
              />
            </div>
          </div>

          <div>
            <label className="label-bd" htmlFor="cat-subs">Subcategories</label>
            <input
              id="cat-subs"
              className="input-bd"
              value={subs}
              onChange={(e) => setSubs(e.target.value)}
              placeholder="PPE & Workwear, Fire Safety, Road Safety, Security & Surveillance"
            />
            <p className="mt-1 text-[11px] text-ink-400">Separate with commas. At least one is required.</p>
          </div>

          <div>
            <label className="label-bd" htmlFor="cat-image">Category image</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="cat-image"
                className="input-bd"
                value={draft.image}
                onChange={(e) => update({ image: e.target.value })}
                placeholder="https://images.unsplash.com/… or upload below"
                required
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
              <button type="button" className="btn-secondary shrink-0 !py-2 text-sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {uploading ? "Uploading…" : "Upload image"}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-ink-400">{IMAGE_HINT}</p>
            {draft.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.image} alt="" className="mt-2 h-28 w-full max-w-xs rounded-xl object-cover" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-primary" disabled={busy || uploading}>{busy ? "Saving…" : originalSlug ? "Save changes" : "Create category"}</button>
            <button type="button" className="btn-secondary" onClick={close} disabled={busy}>Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {categories.map((category) => (
          <div key={category.slug} className="card flex items-start gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={category.image} alt="" loading="lazy" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
                <CategoryIcon name={category.icon} className="h-3.5 w-3.5 text-brand-600" />
                {category.name}
                {builtIn.has(category.slug) && <span className="chip !px-1.5 !py-0 !text-[10px]">built-in</span>}
              </p>
              <p className="truncate text-xs text-ink-400">/browse/{category.slug} · {counts[category.slug] ?? 0} listing(s)</p>
              <p className="clamp-2 mt-0.5 text-xs text-ink-500">{category.subcategories.join(" · ")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" className="chip" onClick={() => openEdit(category)} disabled={busy}>
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button
                  type="button"
                  className="chip !border-red-200 !text-red-700 hover:!bg-red-50"
                  onClick={() => remove(category)}
                  disabled={busy}
                >
                  <Trash2 className="h-3 w-3" /> {builtIn.has(category.slug) ? "Hide" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hidden.length > 0 && (
        <div className="card p-4">
          <p className="font-bold">Hidden built-in categories ({hidden.length})</p>
          <p className="mt-0.5 text-xs text-ink-500">Hidden categories keep their existing listings but no longer appear in navigation or category pages.</p>
          <ul className="mt-3 space-y-2">
            {hidden.map((category) => (
              <li key={category.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sand-50 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{category.name}</span>
                  <span className="ml-2 text-xs text-ink-400">/browse/{category.slug}</span>
                </span>
                <button type="button" className="chip" onClick={() => restore(category)} disabled={busy}>
                  <RotateCcw className="h-3 w-3" /> Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
