import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { MODERATION_REASONS } from "@/lib/moderation";
import { logAudit } from "@/lib/audit";

/**
 * Admin-only moderation with recorded reason + audit trail.
 * approve → active · reject → rejected · hide → hidden.
 * Rejects require a granular reason code (Jiji-style fix-and-resubmit).
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const isJson = (req.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await req.json().catch(() => ({})) : Object.fromEntries(await req.formData());
  // Bulk: {ids: [...], action, reason}
  const ids = Array.isArray(body.ids) ? body.ids.map((x: unknown) => String(x)) : body.id ? [String(body.id)] : [];
  const action = String(body.action || "");
  const reason = String(body.reason || action).slice(0, 500);
  const reasonCode = String(body.reasonCode || "").slice(0, 40);
  const status = action === "approve" ? "active" : action === "reject" ? "rejected" : action === "hide" ? "hidden" : null;
  if (ids.length === 0 || !status) {
    const err = { error: "Provide id(s) + action (approve|reject|hide).", reasons: MODERATION_REASONS };
    return isJson ? NextResponse.json(err, { status: 400 }) : NextResponse.redirect(new URL("/admin", req.url), 303);
  }
  if ((action === "reject" || action === "hide") && reasonCode) {
    const ok = MODERATION_REASONS.some((r) => r.code === reasonCode);
    if (!ok) return NextResponse.json({ error: "Unknown reason code.", reasons: MODERATION_REASONS }, { status: 400 });
  }
  const store = getStore();
  let done = 0;
  for (const id of ids.slice(0, 100)) {
    const existing = await store.getListing(id);
    if (existing) {
      await store.setListingStatus(id, status, user.id, reasonCode ? `${reasonCode}: ${reason}` : reason);
      done += 1;
    } else {
      await logAudit({ actorId: user.id, actorEmail: user.email, action: `moderate.${action}`, entity: "catalogue", entityId: id, reason }).catch(() => {});
    }
  }
  await logAudit({ actorId: user.id, actorEmail: user.email, action: `moderate.${action}`, entity: "listing", entityId: ids.slice(0, 5).join(","), reason: `${done}/${ids.length} ${reasonCode || reason}`.slice(0, 300) }).catch(() => {});
  return isJson ? NextResponse.json({ ok: true, done }) : NextResponse.redirect(new URL("/admin", req.url), 303);
}

/** Reason taxonomy for the admin UI + seller resubmit hints. */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  return NextResponse.json({ reasons: MODERATION_REASONS });
}
