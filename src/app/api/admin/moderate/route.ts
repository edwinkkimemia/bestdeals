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
  const ids: string[] = Array.isArray(body.ids)
    ? body.ids.map((x: unknown) => String(x))
    : body.id
      ? [String(body.id)]
      : [];
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
  // Bulk tools can send the same id twice; moderate each listing once and
  // only notify on a real status change (repeat approvals were creating
  // duplicate "Listing approved" bells).
  const uniqueIds = [...new Set(ids)].slice(0, 100);
  for (const id of uniqueIds) {
    const existing = await store.getListing(id);
    if (existing) {
      const changed = existing.status !== status;
      await store.setListingStatus(id, status, user.id, reasonCode ? `${reasonCode}: ${reason}` : reason);
      done += 1;
      if (!changed) continue;
      // Jiji-style seller feed: approval / fix-and-resubmit / hide.
      try {
        const { notifyUser } = await import("@/lib/notifications");
        const ownerId = (existing as { ownerId?: string }).ownerId;
        if (ownerId) {
          const short = existing.title.slice(0, 80);
          if (status === "active") {
            await notifyUser({
              userId: ownerId,
              type: "listing",
              title: "Listing approved 🎉",
              body: `“${short}” is now live. Share it or boost it to reach more buyers.`,
              link: `/dashboard/listings/${existing.id}`,
            });
          } else if (status === "rejected") {
            await notifyUser({
              userId: ownerId,
              type: "listing",
              title: "Listing needs fixes",
              body: `“${short}” was declined: ${reasonCode ? `${reasonCode} — ` : ""}${reason.slice(0, 200)}. Edit and resubmit.`,
              link: `/dashboard/listings/${existing.id}`,
            });
          } else if (status === "hidden") {
            await notifyUser({
              userId: ownerId,
              type: "listing",
              title: "Listing hidden",
              body: `“${short}” was hidden: ${reason.slice(0, 200)}. Contact support if this looks wrong.`,
              link: `/dashboard/listings/${existing.id}`,
            });
          }
        }
      } catch {}
      // New-ad alerts: buyers watching this query get a bell (best-effort).
      if (status === "active") {
        try {
          const { fanoutNewListingAlert } = await import("@/lib/search-alerts");
          await fanoutNewListingAlert({
            id: existing.id,
            slug: existing.slug,
            title: existing.title,
            description: existing.description,
            categorySlug: existing.categorySlug,
            subcategory: existing.subcategory,
            price: existing.price,
            county: existing.county,
            town: existing.town,
            condition: existing.condition,
            type: existing.type,
            ownerId: (existing as { ownerId?: string }).ownerId,
          });
        } catch {}
      }
    } else {
      await logAudit({ actorId: user.id, actorEmail: user.email, action: `moderate.${action}`, entity: "catalogue", entityId: id, reason }).catch(() => {});
    }
  }
  await logAudit({ actorId: user.id, actorEmail: user.email, action: `moderate.${action}`, entity: "listing", entityId: uniqueIds.slice(0, 5).join(","), reason: `${done}/${uniqueIds.length} ${reasonCode || reason}`.slice(0, 300) }).catch(() => {});
  return isJson ? NextResponse.json({ ok: true, done }) : NextResponse.redirect(new URL("/admin", req.url), 303);
}

/** Reason taxonomy for the admin UI + seller resubmit hints. */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  return NextResponse.json({ reasons: MODERATION_REASONS });
}
