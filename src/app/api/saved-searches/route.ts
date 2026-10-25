import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { uid } from "@/lib/utils";
import { syncWishlistSearches, type SavedSearchRecord } from "@/lib/saved-item-searches";

function key(userId: string): string {
  return `saved_searches:${userId}`;
}

async function read(userId: string): Promise<SavedSearchRecord[]> {
  const v = ((await getStore().getSetting(key(userId)).catch(() => null)) as SavedSearchRecord[] | null) ?? [];
  return Array.isArray(v) ? v : [];
}

/** Saved searches + price alerts (Chap leapfrogs Jiji here). */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ items: [] });
  // Hearted products are saved searches too; migrate any legacy hearts first.
  await syncWishlistSearches(user.id).catch(() => {});
  const items = (await read(user.id)).sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const query = (body.query ?? {}) as Record<string, unknown>;
  const name = String(body.name || "Saved search").slice(0, 80);
  const cur = await read(user.id);
  const manualCount = cur.filter((s) => !s.sourceListingId).length;
  if (manualCount >= 20) return NextResponse.json({ error: "Saved search limit reached (20)." }, { status: 409 });
  const rec: SavedSearchRecord = { id: uid("ss"), name, query, createdAt: new Date().toISOString() };
  await getStore().setSetting(key(user.id), [rec, ...cur]).catch(() => {});
  // Persist consent for alert emails.
  if (body.alerts && user.email) {
    const consents = ((await getStore().getSetting(`consents:${user.id}`).catch(() => null)) as Record<string, unknown> | null) ?? {};
    await getStore().setSetting(`consents:${user.id}`, { ...consents, price_alerts: true }).catch(() => {});
  }
  return NextResponse.json({ ok: true, item: rec });
}

export async function DELETE(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  const cur = await read(user.id);
  const target = cur.find((x) => x.id === id);
  if (target?.sourceListingId) {
    // Deleting a product-based search removes the matching heart as well.
    const wish = ((await getStore().getSetting(`wishlist:${user.id}`).catch(() => null)) as string[] | null) ?? [];
    await getStore()
      .setSetting(`wishlist:${user.id}`, wish.filter((listingId) => listingId !== target.sourceListingId))
      .catch(() => {});
  }
  await getStore().setSetting(key(user.id), cur.filter((x) => x.id !== id)).catch(() => {});
  return NextResponse.json({ ok: true });
}
