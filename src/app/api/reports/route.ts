import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { getListing } from "@/data/catalog";
import { REPORT_REASONS, AUTO_BLOCK_REPORTS } from "@/lib/moderation";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "report"), { limit: 20, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many reports." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const { listingId, reason, details } = body as { listingId?: string; reason?: string; details?: string };
  const code = String(reason || "").trim().slice(0, 40);
  if (!listingId || !code) {
    return NextResponse.json({ error: "Choose what's wrong.", reasons: REPORT_REASONS }, { status: 400 });
  }
  const allowed: Set<string> = new Set(REPORT_REASONS.map((r) => r.code));
  if (!allowed.has(code) && code.length < 3) {
    return NextResponse.json({ error: "Tell us briefly what's wrong." }, { status: 400 });
  }
  // Junk reports against non-existent listings pollute the mod queue.
  const exists =
    (await getStore().getListing(listingId).catch(() => null)) ?? getListing(listingId);
  if (!exists) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const rec = await getStore().createReport({ listingId, reason: `${code}${details ? ` — ${String(details).slice(0, 300)}` : ""}`.slice(0, 500) });
  // Auto-block: 2+ open ban-requests hide the listing pending admin review (Jiji-style).
  try {
    const open = await getStore().listReports("open").catch(() => []);
    const n = open.filter((r) => r.listingId === listingId).length;
    if (n >= AUTO_BLOCK_REPORTS) {
      await getStore().setListingStatus(listingId, "hidden").catch(() => {});
      await logAudit({ action: "listing.auto_hidden", entity: "listing", entityId: listingId, reason: `${n} reports` }).catch(() => {});
    }
  } catch {}
  return NextResponse.json({ ok: true, id: rec.id });
}

/** Report reasons taxonomy for the client picker. */
export async function GET() {
  return NextResponse.json({ reasons: REPORT_REASONS });
}
