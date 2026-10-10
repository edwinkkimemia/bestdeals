"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { listingSchema } from "@/lib/validators";
import { CATEGORIES, categoryBySlug } from "@/data/catalog";
import { COUNTY_NAMES, townsFor } from "@/lib/kenya";
import { useSearchParams } from "next/navigation";

/** Post-a-listing form. Respects ?type=product|classified|service. Requires sign-in (API enforces). */
export function ListingForm() {
  const sp = useSearchParams();
  const [msg, setMsg] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [picked, setPicked] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      listingType: (sp.get("type") as "product" | "classified" | "service") ?? "classified",
      condition: "new",
      transactionMethod: "contact_seller",
      negotiable: false,
      stock: 1,
      images: [],
      attributes: {},
    } as never,
  });
  const catSlug = watch("categorySlug");
  const county = watch("county");
  const cat = categoryBySlug(catSlug ?? "");

  return (
    <form
      className="card mt-4 space-y-3 p-5"
      onSubmit={handleSubmit(async (data) => {
        setMsg("");
        let images = [...urls];
        if (picked.length > 0) {
          setUploading(true);
          try {
            const fd = new FormData();
            picked.forEach((f) => fd.append("files", f));
            const up = await fetch("/api/upload", { method: "POST", body: fd });
            const uj = await up.json();
            if (!up.ok) {
              setMsg(uj.error || "Image upload failed.");
              return;
            }
            images = [...images, ...(uj.urls ?? [])].slice(0, 8);
            setUrls(images);
            setPicked([]);
          } finally {
            setUploading(false);
          }
        }
        const r = await fetch("/api/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, images }) });
        const j = await r.json();
        setMsg(r.ok ? `Submitted ✓ — status: ${j.status}. Track it in My listings.` : (j.error || "Failed"));
      })}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label-bd" htmlFor="l-type">Listing type</label>
          <select id="l-type" className="input-bd" {...register("listingType")}>
            <option value="classified">Classified</option><option value="product">Shoppable product</option><option value="service">Service</option>
          </select></div>
        <div><label className="label-bd" htmlFor="l-tx">How will buyers transact?</label>
          <select id="l-tx" className="input-bd" {...register("transactionMethod")}>
            <option value="contact_seller">Contact seller</option><option value="buy_online">Buy online</option><option value="request_quote">Request a quote</option><option value="enquiry">Make an enquiry</option>
          </select></div>
      </div>
      <div><label className="label-bd" htmlFor="l-title">Title</label><input id="l-title" className="input-bd" placeholder="e.g. Samsung Galaxy A15 128GB, sealed" {...register("title")} />{errors.title && <p className="text-xs text-red-600">{String(errors.title.message)}</p>}</div>
      <div><label className="label-bd" htmlFor="l-desc">Description</label><textarea id="l-desc" rows={5} className="input-bd" {...register("description")} />{errors.description && <p className="text-xs text-red-600">{String(errors.description.message)}</p>}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label-bd" htmlFor="l-cat">Category</label>
          <select id="l-cat" className="input-bd" {...register("categorySlug")}>
            <option value="">Select…</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>{errors.categorySlug && <p className="text-xs text-red-600">Required</p>}</div>
        <div><label className="label-bd" htmlFor="l-cond">Condition</label>
          <select id="l-cond" className="input-bd" {...register("condition")}>
            <option value="new">New</option><option value="like_new">Like new</option><option value="used_good">Used · good</option><option value="used_fair">Used · fair</option><option value="refurbished">Refurbished</option>
          </select></div>
      </div>
      {cat && cat.attributes.length > 0 && (
        <fieldset className="rounded-xl bg-sand-50 p-3">
          <legend className="px-1 text-sm font-semibold">{cat.name} details</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {cat.attributes.map((a) => (
              <div key={a.key}>
                <label className="label-bd" htmlFor={`attr-${a.key}`}>{a.label}</label>
                {a.options ? (
                  <select id={`attr-${a.key}`} className="input-bd" {...register(`attributes.${a.key}` as never)}><option value="">Select…</option>{a.options.map((o) => <option key={o}>{o}</option>)}</select>
                ) : (
                  <input id={`attr-${a.key}`} className="input-bd" {...register(`attributes.${a.key}` as never)} />
                )}
              </div>
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label-bd" htmlFor="l-price">Price (KES)</label><input id="l-price" inputMode="numeric" className="input-bd" {...register("price")} />{errors.price && <p className="text-xs text-red-600">Enter a valid price</p>}</div>
        <div><label className="label-bd" htmlFor="l-was">Previous price (optional)</label><input id="l-was" inputMode="numeric" className="input-bd" placeholder="Only if genuine" {...register("compareAt")} /><p className="text-xs text-ink-400">Shown only when valid & higher.</p></div>
        <div><label className="label-bd" htmlFor="l-stock">Stock</label><input id="l-stock" inputMode="numeric" className="input-bd" {...register("stock")} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label-bd" htmlFor="l-county">County</label>
          <select id="l-county" className="input-bd" {...register("county")}><option value="">Select…</option>{COUNTY_NAMES.map((c) => <option key={c}>{c}</option>)}</select>{errors.county && <p className="text-xs text-red-600">Required</p>}</div>
        <div><label className="label-bd" htmlFor="l-town">Town</label>
          <select id="l-town" className="input-bd" {...register("town")}><option value="">Select…</option>{(county ? townsFor(county) : []).map((t) => <option key={t}>{t}</option>)}</select>{errors.town && <p className="text-xs text-red-600">Required</p>}</div>
      </div>
      <div>
        <label className="label-bd" htmlFor="l-img">Image links (optional, comma-separated)</label>
        <input id="l-img" className="input-bd" placeholder="https://…" onChange={(e) => {
          const v = e.target.value.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
          setUrls(v);
        }} />
        <label className="label-bd mt-2" htmlFor="l-files">Or upload photos (JPG/PNG/WebP, ≤5MB each, max 8)</label>
        <input id="l-files" type="file" accept="image/jpeg,image/png,image/webp" multiple className="text-sm"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).slice(0, 8);
            const bad = files.find((f) => f.size > 5 * 1024 * 1024);
            if (bad) setMsg(`"${bad.name}" exceeds 5MB — pick a smaller file.`);
            else {
              setPicked(files);
              if (files.length) setMsg(`${files.length} photo(s) ready — they upload when you submit.`);
            }
          }} />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("negotiable")} /> Price is negotiable</label>
      {msg && <p role="status" className="rounded-lg bg-green-50 p-2 text-sm text-green-800">{msg}</p>}
      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={isSubmitting || uploading}>{uploading ? "Uploading photos…" : isSubmitting ? "Submitting…" : "Submit for review"}</button>
        <button type="button" className="btn-secondary" onClick={() => setMsg("Draft saved locally (demo). Production persists drafts server-side.)")}>Save draft</button>
      </div>
    </form>
  );
}
