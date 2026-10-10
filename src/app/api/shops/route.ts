import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedSeller } from "@/lib/gate";
import { getStore } from "@/lib/store";
import { slugify } from "@/lib/utils";
import { SHOPS } from "@/data/catalog";

/** Shop creation: verified sellers only, with slug availability check. */
export async function POST(req: NextRequest) {
  const gate = await requireVerifiedSeller();
  if (!gate.ok) return gate.response;
  const user = gate.seller;
  const form = await req.formData().catch(() => null);
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
  await store.createShop({
    slug,
    name,
    description: (get("description") || `${name} — storefront on Chap.`).slice(0, 2000),
    businessCategory: get("businessCategory") || "General retail",
    county: get("county"),
    town: get("town"),
    phone,
    ownerId: user.id,
  });
  return NextResponse.redirect(new URL(`/shops/${encodeURIComponent(slug)}`, req.url), 303);
}

export async function GET() {
  const csv = "title,description,category,price,stock,condition,county,town\n\"Sample Phone\",\"Sealed demo row\",\"phones-tablets\",52999,10,new,Nairobi,CBD\n";
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=chap-bulk-template.csv" } });
}
