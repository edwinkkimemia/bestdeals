import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { getListing } from "@/data/catalog";

export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "report"), { limit: 20, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many reports." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const { listingId, reason } = body as { listingId?: string; reason?: string };
  if (!listingId || !reason || String(reason).trim().length < 3) {
    return NextResponse.json({ error: "Tell us briefly what's wrong." }, { status: 400 });
  }
  // Junk reports against non-existent listings pollute the mod queue.
  const exists =
    (await getStore().getListing(listingId).catch(() => null)) ?? getListing(listingId);
  if (!exists) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const rec = await getStore().createReport({ listingId, reason: String(reason).slice(0, 500) });
  return NextResponse.json({ ok: true, id: rec.id });
}
