import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/** Server cart: cross-device sync + merge on login. Lines are {id, qty}. */
function cartKey(userId?: string, session?: string): string {
  return userId ? `cart:${userId}` : `cart_guest:${session || "anon"}`;
}

export async function GET(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  const session = req.cookies.get("bd_cart")?.value || req.headers.get("x-session") || "anon";
  const items = ((await getStore().getSetting(cartKey(user?.id, session)).catch(() => null)) as { id: string; qty: number }[] | null) ?? [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "cart:write"), { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const user = await currentUser().catch(() => null);
  const body = await req.json().catch(() => ({}));
  const session = req.cookies.get("bd_cart")?.value || String(body.session || "anon").slice(0, 64);
  const items = Array.isArray(body.items) ? body.items : [];
  const clean: { id: string; qty: number }[] = items
    .map((l: unknown) => {
      const o = l as { id?: unknown; qty?: unknown };
      return { id: String(o.id || "").slice(0, 80), qty: Math.min(99, Math.max(1, Number(o.qty) || 1)) };
    })
    .filter((l: { id: string }) => l.id)
    .slice(0, 50);
  // Validate ids exist (catalogue or store, active or not — checkout re-validates).
  const { getListing } = await import("@/data/catalog");
  const store = getStore();
  const valid: { id: string; qty: number }[] = [];
  for (const l of clean) {
    if (getListing(l.id)) {
      valid.push(l);
      continue;
    }
    const s = await store.getListing(l.id).catch(() => null);
    if (s) valid.push(l);
  }
  await store.setSetting(cartKey(user?.id, session), valid).catch(() => {});
  // Merge guest → user on login.
  if (user && session && session !== "anon") {
    const guest = ((await store.getSetting(cartKey(undefined, session)).catch(() => null)) as { id: string; qty: number }[] | null) ?? [];
    if (guest.length > 0) {
      const map = new Map(valid.map((l: { id: string; qty: number }) => [l.id, l.qty] as [string, number]));
      for (const g of guest) map.set(g.id, Math.min(99, (map.get(g.id) ?? 0) + g.qty));
      const merged = [...map.entries()].map(([id, qty]) => ({ id, qty }));
      await store.setSetting(cartKey(user.id, undefined), merged).catch(() => {});
      return NextResponse.json({ ok: true, items: merged });
    }
  }
  return NextResponse.json({ ok: true, items: valid });
}

export async function DELETE() {
  const user = await currentUser().catch(() => null);
  await getStore().setSetting(cartKey(user?.id, "anon"), []).catch(() => {});
  return NextResponse.json({ ok: true, items: [] });
}
