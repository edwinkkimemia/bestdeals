import { NextRequest, NextResponse } from "next/server";
import { getListing } from "@/data/catalog";
import { getStore } from "@/lib/store";

/** Public resolve for checkout/cart display: static catalogue or active store listing. */
export async function GET(req: NextRequest) {
  const ids = (new URL(req.url).searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);
  if (ids.length === 0) return NextResponse.json({ items: [] });
  const store = getStore();
  const items: {
    id: string; slug: string; title: string; price: number; stock: number; seller: string;
    images: string[]; txMethod: string; listingType: string;
    categorySlug?: string; subcategory?: string; county?: string;
  }[] = [];
  for (const id of ids) {
    const c = getListing(id);
    if (c) {
      items.push({ id: c.id, slug: c.slug, title: c.title, price: c.price, stock: c.stock, seller: c.sellerName, images: c.images, txMethod: c.transactionMethod, listingType: c.listingType, categorySlug: c.categorySlug, subcategory: c.subcategory, county: c.county });
      continue;
    }
    const s = await store.getListing(id).catch(() => null);
    if (s && s.status === "active") items.push({ id: s.id, slug: s.slug, title: s.title, price: s.price, stock: s.stock, seller: s.sellerName, images: s.images, txMethod: s.txMethod, listingType: s.type, categorySlug: s.categorySlug, subcategory: s.subcategory, county: s.county });
  }
  return NextResponse.json({ items });
}
