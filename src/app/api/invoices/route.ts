import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

/** My invoices (plans + boosts). Admin sees all via ?all=1. */
export async function GET(req: Request) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const all = ((await getStore().getSetting("invoices").catch(() => null)) as { shopSlug?: string; at: string }[] | null) ?? [];
  if (new URL(req.url).searchParams.get("all") === "1") {
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
    return NextResponse.json({ items: all.slice(0, 500) });
  }
  const owned = await getStore().listShopsByOwner(user.id).catch(() => []);
  const slugs = new Set(owned.map((s) => s.slug));
  return NextResponse.json({ items: all.filter((i) => i.shopSlug && slugs.has(i.shopSlug)).slice(0, 200) });
}
