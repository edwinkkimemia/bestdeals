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
    try {
      const { notifyUser } = await import("@/lib/notifications");
      await notifyUser({
        userId: v.userId,
        type: "verification",
        title: "You’re verified ✓",
        body: "Your verification was approved. Your listings now carry the ✓ badge.",
        link: "/dashboard/verify",
      });
    } catch {}
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "verify.approve", entity: "verification", entityId: id }).catch(() => {});
  } else {
    await store.decideVerification(id, false, user.id);
    // Rejection note doubles as the appeal SLA response (visible on re-submit).
    if (note) await store.setSetting(`verify_note:${id}`, { by: user.id, note: String(note).slice(0, 500), at: new Date().toISOString() }).catch(() => {});
    try {
      const all = await store.listVerifications().catch(() => []);
      const target = all.find((x) => x.id === id);
      if (target) {
        const { notifyUser } = await import("@/lib/notifications");
        await notifyUser({
          userId: target.userId,
          type: "verification",
          title: "Verification needs attention",
          body: note ? String(note).slice(0, 300) : "Your verification was declined. Check the requirements and resubmit.",
          link: "/dashboard/verify",
        });
      }
    } catch {}
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "verify.reject", entity: "verification", entityId: id, reason: String(note || "").slice(0, 200) }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}

/** Verification queue (admin) — rows carry their uploader profile. */
export async function GET(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const status = new URL(req.url).searchParams.get("status") || undefined;
  const store = getStore();
  const [items, users] = await Promise.all([
    store.listVerifications(status).catch(() => []),
    store.listUsers().catch(() => []),
  ]);
  const { attachVerificationUsers } = await import("@/lib/verifications");
  return NextResponse.json({ items: attachVerificationUsers(items, users) });
}
