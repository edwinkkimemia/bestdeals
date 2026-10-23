"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";

export type ShopHeader = {
  slug: string;
  name: string;
  description: string;
  businessCategory: string;
  county: string;
  town: string;
  phone: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  deliveryInfo?: string | null;
  hours?: string | null;
  website?: string | null;
  email?: string | null;
  socials?: Record<string, string> | null;
};

const SOCIAL_FIELDS = [
  { key: "facebook", label: "Facebook URL" },
  { key: "instagram", label: "Instagram URL" },
  { key: "x", label: "X (Twitter) URL" },
  { key: "tiktok", label: "TikTok URL" },
  { key: "youtube", label: "YouTube URL" },
] as const;

/** Editable shop header — logo, cover + public storefront info. Owner only. */
export function ShopHeaderForm({ shop }: { shop: ShopHeader }) {
  const router = useRouter();
  const [name, setName] = useState(shop.name);
  const [description, setDescription] = useState(shop.description);
  const [category, setCategory] = useState(shop.businessCategory);
  const [county, setCounty] = useState(shop.county);
  const [town, setTown] = useState(shop.town);
  const [phone, setPhone] = useState(shop.phone);
  const [deliveryInfo, setDeliveryInfo] = useState(shop.deliveryInfo ?? "");
  const [hours, setHours] = useState(shop.hours ?? "");
  const [website, setWebsite] = useState(shop.website ?? "");
  const [email, setEmail] = useState(shop.email ?? "");
  const [socials, setSocials] = useState<Record<string, string>>({ ...(shop.socials ?? {}) });
  const [logoUrl, setLogoUrl] = useState<string | null>(shop.logoUrl ?? null);
  const [coverUrl, setCoverUrl] = useState<string | null>(shop.coverUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [msg, setMsg] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (f: File | undefined, kind: "logo" | "cover") => {
    if (!f) return;
    setUploading(kind);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("files", f);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "Upload failed — use JPG/PNG/WebP under 5MB.");
      const uploaded = (j.urls as string[] | undefined)?.[0];
      if (!uploaded) return setMsg("Upload failed.");
      if (kind === "logo") setLogoUrl(uploaded);
      else setCoverUrl(uploaded);
    } finally {
      setUploading(null);
      if (logoRef.current) logoRef.current.value = "";
      if (coverRef.current) coverRef.current.value = "";
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/shops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: shop.slug,
          name,
          description,
          businessCategory: category,
          county,
          town,
          phone,
          deliveryInfo,
          hours,
          website,
          email,
          socials,
          logoUrl,
          coverUrl,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "Save failed.");
      setMsg("Shop header saved ✓ — live on your storefront.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="card mt-3 space-y-3 p-5">
      <p className="font-bold">Shop header</p>
      <p className="text-sm text-ink-500">Your public cover, logo and shop info — live at <Link href={`/shops/${shop.slug}`} className="link-bd break-all">/shops/{shop.slug}</Link>.</p>
      <div>
        <span className="label-bd">Cover photo</span>
        {/* Fixed height lives on the container: a 404 cover collapses to the
            gradient instead of zero height. */}
        <div className="relative h-32 overflow-hidden rounded-xl border border-neutral-200 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800">
          {coverUrl ? (
            <SafeImage src={coverUrl} alt={`${name} cover`} className="h-32 w-full object-cover" />
          ) : (
            <p className="flex h-32 items-center justify-center bg-sand-50 text-xs text-ink-400">No cover yet — upload a wide shop photo.</p>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Choose cover photo" onChange={(e) => uploadImage(e.target.files?.[0], "cover")} />
          <button type="button" disabled={uploading !== null} onClick={() => coverRef.current?.click()} className="btn-secondary !px-3 !py-1.5 text-xs">
            {uploading === "cover" ? "Uploading…" : coverUrl ? "Change cover" : "Upload cover"}
          </button>
          {coverUrl && (
            <button type="button" disabled={uploading !== null} onClick={() => setCoverUrl(null)} className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-sand-50">
              Remove
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sand-100 text-xl font-black text-ink-400">
          {logoUrl ? (
            <SafeImage src={logoUrl} alt={`${name} logo`} className="h-full w-full object-cover" fallback={name.charAt(0).toUpperCase()} />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0">
          <span className="label-bd">Logo</span>
          <div className="flex flex-wrap gap-2">
            <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Choose shop logo" onChange={(e) => uploadImage(e.target.files?.[0], "logo")} />
            <button type="button" disabled={uploading !== null} onClick={() => logoRef.current?.click()} className="btn-secondary !px-3 !py-1.5 text-xs">
              {uploading === "logo" ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
            </button>
            {logoUrl && (
              <button type="button" disabled={uploading !== null} onClick={() => setLogoUrl(null)} className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-sand-50">
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label-bd" htmlFor="sh-name">Shop name</label>
          <input id="sh-name" className="input-bd" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={80} />
        </div>
        <div className="sm:col-span-2">
          <label className="label-bd" htmlFor="sh-desc">About your shop</label>
          <textarea id="sh-desc" className="input-bd min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
        </div>
        <div>
          <label className="label-bd" htmlFor="sh-cat">Category</label>
          <input id="sh-cat" className="input-bd" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Electronics retail" />
        </div>
        <div>
          <label className="label-bd" htmlFor="sh-phone">Shop phone (WhatsApp)</label>
          <input id="sh-phone" className="input-bd" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </div>
        <div>
          <label className="label-bd" htmlFor="sh-county">County</label>
          <input id="sh-county" className="input-bd" value={county} onChange={(e) => setCounty(e.target.value)} />
        </div>
        <div>
          <label className="label-bd" htmlFor="sh-town">Town</label>
          <input id="sh-town" className="input-bd" value={town} onChange={(e) => setTown(e.target.value)} />
        </div>
        <div>
          <label className="label-bd" htmlFor="sh-delivery">Delivery info</label>
          <input id="sh-delivery" className="input-bd" value={deliveryInfo} onChange={(e) => setDeliveryInfo(e.target.value)} maxLength={500} placeholder="Same-day in Nairobi…" />
        </div>
        <div>
          <label className="label-bd" htmlFor="sh-hours">Opening hours</label>
          <input id="sh-hours" className="input-bd" value={hours} onChange={(e) => setHours(e.target.value)} maxLength={200} placeholder="Mon–Sat 8am–7pm" />
        </div>
        <div>
          <label className="label-bd" htmlFor="sh-website">Website</label>
          <input id="sh-website" className="input-bd" value={website} onChange={(e) => setWebsite(e.target.value)} inputMode="url" maxLength={500} placeholder="yourshop.co.ke" />
        </div>
        <div>
          <label className="label-bd" htmlFor="sh-email">Shop email</label>
          <input id="sh-email" className="input-bd" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={320} placeholder="hello@yourshop.co.ke" />
        </div>
      </div>
      <div>
        <span className="label-bd">Social links (shown on your storefront)</span>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="label-bd" htmlFor={`sh-social-${f.key}`}>{f.label}</label>
              <input
                id={`sh-social-${f.key}`}
                className="input-bd"
                value={socials[f.key] ?? ""}
                onChange={(e) => setSocials((s) => ({ ...s, [f.key]: e.target.value }))}
                inputMode="url"
                maxLength={500}
                placeholder="https://…"
              />
            </div>
          ))}
        </div>
      </div>
      <button className="btn-primary w-full" disabled={busy || uploading !== null}>{busy ? "Saving…" : "Save shop header"}</button>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </form>
  );
}
