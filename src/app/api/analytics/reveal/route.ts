import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/** Contact-reveal tracking: Show-contact / WhatsApp taps count as PPC conversions. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "reveal"), { limit: 60, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const listingId = String(body.listingId || "").slice(0, 80);
  const channel = String(body.channel || "contact").slice(0, 20);
  if (!listingId) return NextResponse.json({ error: "Missing listing." }, { status: 400 });
  const key = `reveals:${listingId}`;
  const cur = (Number(await getStore().getSetting(key).catch(() => 0)) || 0) + 1;
  await getStore().setSetting(key, cur).catch(() => {});
  const total = (Number(await getStore().getSetting("reveals_total").catch(() => 0)) || 0) + 1;
  await getStore().setSetting("reveals_total", total).catch(() => {});
  void channel;
  return NextResponse.json({ ok: true, reveals: cur });
}

export async function GET(req: NextRequest) {
  const listingId = new URL(req.url).searchParams.get("listingId") || "";
  if (!listingId) return NextResponse.json({ error: "Missing listingId." }, { status: 400 });
  const n = Number(await getStore().getSetting(`reveals:${listingId}`).catch(() => 0)) || 0;
  return NextResponse.json({ listingId, reveals: n });
}
