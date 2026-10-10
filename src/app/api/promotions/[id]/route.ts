import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

const schema = z.object({ action: z.enum(["cancel", "activate", "expire"]) });

/**
 * Promotion lifecycle:
 * - owner: cancel own pending/active boost (unfeatures when nothing active remains)
 * - admin: activate (payment confirmed) or expire
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Unknown action. Use cancel, activate or expire." }, { status: 400 });

  const store = getStore();
  await store.sweepExpiredPromotions().catch(() => null);
  const promo = await store.getPromotion(params.id);
  if (!promo) return NextResponse.json({ error: "Promotion not found." }, { status: 404 });
  const isAdmin = user.role === "ADMIN";
  const isOwner = promo.ownerId === user.id;

  const action = parsed.data.action;
  if (action === "cancel") {
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Not your promotion." }, { status: 403 });
    if (!["pending_payment", "active"].includes(promo.status)) {
      return NextResponse.json({ error: `Already ${promo.status} — nothing to cancel.` }, { status: 422 });
    }
    await store.setPromotionStatus(promo.id, "cancelled");
    const rest = await store.listPromotionsByListing(promo.listingId);
    if (!rest.some((p) => p.id !== promo.id && p.status === "active")) {
      await store.setListingFeatured(promo.listingId, false).catch(() => null);
    }
  } else {
    if (!isAdmin) return NextResponse.json({ error: "Only admins confirm payments." }, { status: 403 });
    if (action === "activate") {
      await store.activatePromotion(promo.id);
      await store.setListingFeatured(promo.listingId, true).catch(() => null);
    } else {
      await store.setPromotionStatus(promo.id, "expired");
      const rest = await store.listPromotionsByListing(promo.listingId);
      if (!rest.some((p) => p.id !== promo.id && p.status === "active")) {
        await store.setListingFeatured(promo.listingId, false).catch(() => null);
      }
    }
  }
  const updated = await store.getPromotion(promo.id);
  return NextResponse.json({ ok: true, promotion: updated });
}
