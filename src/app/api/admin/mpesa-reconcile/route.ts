import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { logAudit } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { reconcilePendingMpesaLinks } from "@/lib/mpesa-fulfilment";

function reconcileSecretOk(req: NextRequest): boolean {
  const expected = (process.env.MPESA_RECONCILE_SECRET || "").trim();
  const given = (req.headers.get("x-mpesa-reconcile-secret") || "").trim();
  if (expected.length < 16 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * Admin/ops-only fallback for lost or failed Daraja callbacks. Scans pending
 * mpesa_link rows, queries Daraja, and activates only transactions M-Pesa
 * confirms as successful. Safe to re-run; never activates an unpaid purchase.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "mpesa:reconcile"), { limit: 5, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many reconciliation attempts." }, { status: 429 });

  const bySecret = reconcileSecretOk(req);
  const user = bySecret ? null : await currentUser().catch(() => null);
  if (!bySecret && user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const limit = Number((body as { limit?: unknown }).limit ?? 20);
  const result = await reconcilePendingMpesaLinks(getStore(), Number.isFinite(limit) ? limit : 20);
  await logAudit({
    actorId: user?.id,
    actorEmail: user?.email,
    action: "payment.reconcile",
    entity: "payment",
    reason: `checked=${result.checked} activated=${result.activated} pending=${result.pending} errors=${result.errors}`,
  }).catch(() => {});
  return NextResponse.json({ ok: true, ...result });
}
