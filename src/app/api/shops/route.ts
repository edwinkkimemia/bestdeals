import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { slugify } from "@/lib/utils";
import { SHOPS } from "@/data/catalog";

/** Shop creation with slug availability check (demo catalogue + store). */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const name = String(form?.get("name") || (await req.json().catch(() => ({} as Record<string, unknown>))).name || "").trim();
  if (name.length < 3) return NextResponse.json({ error: "Business name too short." }, { status: 400 });
  let slug = slugify(name);
  const store = getStore();
  if (SHOPS.some((s) => s.slug === slug) || (await store.getShopBySlug(slug))) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }
  await store.createShop({
    slug,
    name,
    description: String(form?.get("description") || `${name} — storefront on Chap.`).slice(0, 2000),
    businessCategory: String(form?.get("businessCategory") || "General retail"),
    county: String(form?.get("county") || ""),
    town: String(form?.get("town") || ""),
    phone: String(form?.get("phone") || ""),
    ownerId: user.id,
  });
  return NextResponse.redirect(new URL(`/shops/${encodeURIComponent(slug)}`, req.url), 303);
}

export async function GET() {
  const csv = "title,description,category,price,stock,condition,county,town\n\"Sample Phone\",\"Sealed demo row\",\"phones-tablets\",52999,10,new,Nairobi,CBD\n";
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=chap-bulk-template.csv" } });
}
