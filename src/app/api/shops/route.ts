import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedSeller } from "@/lib/gate";
import { getStore } from "@/lib/store";
import { slugify } from "@/lib/utils";
import { SHOPS } from "@/data/catalog";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/** Shop creation: verified sellers only, with slug availability check. */
export async function POST(req: NextRequest) {
  const gate = await requireVerifiedSeller();
  if (!gate.ok) return gate.response;
  const user = gate.seller;
  // Parse by content type: reading formData() first consumes a JSON body, so
  // JSON clients used to arrive here with every field empty.
  const contentType = req.headers.get("content-type") ?? "";
  const isForm =
    contentType.startsWith("multipart/form-data") ||
    contentType.startsWith("application/x-www-form-urlencoded");
  const form = isForm ? await req.formData().catch(() => null) : null;
  const json = form ? ({} as Record<string, unknown>) : await req.json().catch(() => ({} as Record<string, unknown>));
  const get = (k: string) => String(form?.get(k) ?? json[k] ?? "").trim();
  const name = get("name");
  if (name.length < 3) return NextResponse.json({ error: "Business name too short." }, { status: 400 });
  // Every shop needs a reachable phone — it becomes the public WhatsApp contact.
  const phone = get("phone") || user.phone;
  if (!/^(\+254|0)[17]\d{8}$/.test(phone)) {
    return NextResponse.json({ error: "A valid Kenyan phone is required — buyers reach you on it via WhatsApp." }, { status: 400 });
  }
  let slug = slugify(name);
  const store = getStore();
  if (SHOPS.some((s) => s.slug === slug) || (await store.getShopBySlug(slug))) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }
  let contacts: Record<string, unknown> = {};
  if (get("website") || get("email") || get("socials")) {
    let socials: unknown;
    try {
      socials = get("socials") ? JSON.parse(get("socials")) : undefined;
    } catch {
      return NextResponse.json({ error: "Social links must be valid JSON." }, { status: 400 });
    }
    const { normalizeShopContacts } = await import("@/lib/shop-contacts");
    const res = normalizeShopContacts({ website: get("website") || undefined, email: get("email") || undefined, socials });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    contacts = res.patch;
  }
  await store.createShop({
    slug,
    name,
    description: (get("description") || `${name} — storefront on Chap.`).slice(0, 2000),
    businessCategory: get("businessCategory") || "General retail",
    county: get("county"),
    town: get("town"),
    phone,
    ownerId: user.id,
    ...contacts,
  });
  return NextResponse.redirect(new URL(`/shops/${encodeURIComponent(slug)}`, req.url), 303);
}

export async function GET() {
  const csv = "title,description,category,price,stock,condition,county,town\n\"Sample Phone\",\"Sealed demo row\",\"phones-tablets\",52999,10,new,Nairobi,CBD\n";
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=chap-bulk-template.csv" } });
}

const isPublicImageUrl = (u: string) =>
  u.length <= 2000 &&
  (u.startsWith("https://") || u.startsWith("/uploads/") || u.startsWith("/api/files/"));

/** Shop header edit: owner or admin only. Logo/cover must be uploaded images. */
export async function PATCH(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const rl = rateLimit(clientKey(req, `shop-edit:${user.id}`), { limit: 20, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many updates. Try again later." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug ?? "").trim();
  if (!slug) return NextResponse.json({ error: "Shop is required." }, { status: 400 });
  const store = getStore();
  const shop = await store.getShopBySlug(slug).catch(() => null);
  if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  const members = await store.listShopMembers(slug).catch(() => []);
  const isOwner =
    user.role === "ADMIN" ||
    shop.ownerId === user.id ||
    members.some((m) => m.userId === user.id && m.role === "owner");
  if (!isOwner) return NextResponse.json({ error: "Only the shop owner can edit the header." }, { status: 403 });

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 3 || name.length > 80) return NextResponse.json({ error: "Shop name must be 3–80 characters." }, { status: 400 });
    patch.name = name;
  }
  if (body.description !== undefined) {
    const d = String(body.description).trim();
    if (d.length > 2000) return NextResponse.json({ error: "Description is too long (max 2000)." }, { status: 400 });
    patch.description = d;
  }
  if (body.businessCategory !== undefined) {
    const c = String(body.businessCategory).trim();
    if (!c) return NextResponse.json({ error: "Category is required." }, { status: 400 });
    patch.businessCategory = c.slice(0, 80);
  }
  if (body.county !== undefined) patch.county = String(body.county).trim().slice(0, 80);
  if (body.town !== undefined) patch.town = String(body.town).trim().slice(0, 80);
  if (body.phone !== undefined) {
    const phone = String(body.phone).trim();
    if (phone && !/^(\+254|0)[17]\d{8}$/.test(phone)) {
      return NextResponse.json({ error: "Use a valid Kenyan phone e.g. 0712345678." }, { status: 400 });
    }
    if (phone) patch.phone = phone;
  }
  for (const k of ["logoUrl", "coverUrl"] as const) {
    if (body[k] !== undefined) {
      const v = body[k];
      if (v === null || v === "") {
        patch[k] = null;
      } else if (typeof v !== "string" || !isPublicImageUrl(v)) {
        return NextResponse.json({ error: `${k === "logoUrl" ? "Logo" : "Cover"} must be an uploaded image (JPG/PNG/WebP).` }, { status: 400 });
      } else {
        patch[k] = v;
      }
    }
  }
  if (body.deliveryInfo !== undefined) {
    const d = String(body.deliveryInfo ?? "");
    if (d.length > 500) return NextResponse.json({ error: "Delivery info is too long (max 500)." }, { status: 400 });
    patch.deliveryInfo = d.trim() ? d.trim() : null;
  }
  if (body.hours !== undefined) {
    const h = String(body.hours ?? "");
    if (h.length > 200) return NextResponse.json({ error: "Hours are too long (max 200)." }, { status: 400 });
    patch.hours = h.trim() ? h.trim() : null;
  }
  if (body.website !== undefined || body.email !== undefined || body.socials !== undefined) {
    const { normalizeShopContacts } = await import("@/lib/shop-contacts");
    const res = normalizeShopContacts({ website: body.website, email: body.email, socials: body.socials });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    Object.assign(patch, res.patch);
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  const updated = await store.updateShop(slug, patch);
  if (!updated) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  return NextResponse.json({ ok: true, shop: updated });
}

/** Close shop (owner/admin) + transfer ownership. */
export async function DELETE(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || new URL(req.url).searchParams.get("slug") || "").trim();
  const transferTo = String(body.transferTo || "").trim();
  if (!slug) return NextResponse.json({ error: "Shop is required." }, { status: 400 });
  const store = getStore();
  const shop = await store.getShopBySlug(slug).catch(() => null);
  if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  const members = await store.listShopMembers(slug).catch(() => []);
  const isOwner = user.role === "ADMIN" || shop.ownerId === user.id || members.some((m) => m.userId === user.id && m.role === "owner");
  if (!isOwner) return NextResponse.json({ error: "Only the owner can close the shop." }, { status: 403 });
  if (transferTo) {
    const target = await store.findUserById(transferTo).catch(() => null) ?? await store.findUserByEmail(transferTo).catch(() => null);
    if (!target) return NextResponse.json({ error: "New owner not found." }, { status: 404 });
    // Transfer = add new owner + remove old owner membership; keep listings.
    await store.addShopMember(slug, target.id, "owner").catch(() => {});
    if (shop.ownerId) await store.removeShopMember(slug, shop.ownerId).catch(() => {});
    const { logAudit } = await import("@/lib/audit");
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "shop.transfer", entity: "shop", entityId: slug, reason: `to=${target.id}` }).catch(() => {});
    return NextResponse.json({ ok: true, transferred: true });
  }
  // Close: hide all listings + mark plan cancelled via settings tombstone.
  const listings = await store.listListingsByShop(slug).catch(() => []);
  for (const l of listings) await store.setListingStatus(l.id, "hidden").catch(() => {});
  await store.setSetting(`shop_closed:${slug}`, { by: user.id, at: new Date().toISOString() }).catch(() => {});
  const { logAudit } = await import("@/lib/audit");
  await logAudit({ actorId: user.id, actorEmail: user.email, action: "shop.close", entity: "shop", entityId: slug }).catch(() => {});
  return NextResponse.json({ ok: true, closed: true });
}
