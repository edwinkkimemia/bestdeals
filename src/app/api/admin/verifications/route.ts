import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { applyVerificationApproval } from "@/lib/kyc";
import { qualifyReferralsFor } from "@/lib/referrals";
import { logAudit } from "@/lib/audit";

/** Admin-only: approve/reject a verification. Approval marks the user verified. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { id, approve, shopSlug, note } = body as { id?: string; approve?: boolean; shopSlug?: string; note?: string };
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const store = getStore();
  if (approve === true) {
    // User verified + (for business KYC) their shops verified automatically.
    const v = await applyVerificationApproval(store, id, user.id);
    if (!v) return NextResponse.json({ error: "Verification not found." }, { status: 404 });
    if (shopSlug) await store.setShopVerified(shopSlug, true).catch(() => {});
    // Referral milestone: inviter earns a free Featured boost.
    await qualifyReferralsFor(v.userId).catch(() => null);
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "verify.approve", entity: "verification", entityId: id }).catch(() => {});
  } else {
    await store.decideVerification(id, false, user.id);
    // Rejection note doubles as the appeal SLA response (visible on re-submit).
    if (note) await store.setSetting(`verify_note:${id}`, { by: user.id, note: String(note).slice(0, 500), at: new Date().toISOString() }).catch(() => {});
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "verify.reject", entity: "verification", entityId: id, reason: String(note || "").slice(0, 200) }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}

/** Verification queue (admin). */
export async function GET(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const status = new URL(req.url).searchParams.get("status") || undefined;
  return NextResponse.json({ items: await getStore().listVerifications(status).catch(() => []) });
}
