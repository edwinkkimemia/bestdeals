import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { listingSchemaFor } from "@/lib/validators";
import { currentUser } from "@/lib/auth";
import { canManageListing } from "@/lib/gate";
import { normalizeListingImages } from "@/lib/image-urls";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { categorySelectionError, getCategories } from "@/lib/categories";

async function owned(id: string) {
  const user = await currentUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in first." }, { status: 401 }) } as const;
  const listing = await getStore().getListing(id);
  if (!listing) return { error: NextResponse.json({ error: "Listing not found." }, { status: 404 }) } as const;
  if (!(await canManageListing(user, listing))) {
    return { error: NextResponse.json({ error: "Not your listing." }, { status: 403 }) } as const;
  }
  return { user, listing } as const;
}

/** Owner (or admin) view of a single listing. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const res = await owned(params.id);
  if ("error" in res) return res.error;
  return NextResponse.json({ item: res.listing });
}

/** Full edit — validated; re-queues for moderation when content changes. */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const res = await owned(params.id);
  if ("error" in res) return res.error;
  const rl = rateLimit(clientKey(req, `listing:edit:${res.user.id}`), { limit: 30, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many edits. Try again later." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const categories = await getCategories();
  const parsed = listingSchemaFor(categories).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the form and try again." }, { status: 400 });
  }
  const d = parsed.data;
  const categoryError = await categorySelectionError(d.categorySlug, d.subcategory);
  if (categoryError) return NextResponse.json({ error: categoryError }, { status: 400 });
  if (d.compareAt && d.compareAt <= d.price) {
    return NextResponse.json({ error: "Previous price must be higher than the current price, or left empty." }, { status: 400 });
  }
  const banned = ["counterfeit", "stolen", "pyramid", "quick loan"];
  const hay = `${d.title} ${d.description}`.toLowerCase();
  if (banned.some((w) => hay.includes(w))) {
    return NextResponse.json({ error: "This listing needs manual review due to a flagged term. Our team will check it." }, { status: 422 });
  }
  // Sanitize image URLs — only https or server-uploaded paths (incl. serverless /api/files/).
  const images = normalizeListingImages(d.images);

  const store = getStore();
  const updated = await store.updateListing(params.id, {
    title: d.title,
    description: d.description,
    type: d.listingType,
    price: d.price,
    compareAt: d.compareAt ?? null,
    condition: d.condition,
    txMethod: d.transactionMethod,
    negotiable: d.negotiable,
    stock: d.stock,
    county: d.county,
    town: d.town,
    images,
    attributes: d.attributes ?? {},
    categorySlug: d.categorySlug,
    subcategory: (d.subcategory ?? "").trim() || undefined,
  });
  if (!updated) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  // Content changed → back to moderation, unless seller had parked it as sold/hidden/draft.
  if (!["sold", "hidden", "draft"].includes(res.listing.status)) {
    await store.setListingStatus(params.id, "pending");
  }
  const fresh = await store.getListing(params.id);
  // Price-drop + newly-in-budget bells (best-effort, never blocks the edit).
  try {
    if (fresh && d.price < res.listing.price) {
      const { fanoutPriceDrop } = await import("@/lib/search-alerts");
      await fanoutPriceDrop(
        {
          id: fresh.id,
          slug: fresh.slug,
          title: fresh.title,
          description: fresh.description,
          categorySlug: fresh.categorySlug,
          subcategory: fresh.subcategory,
          price: d.price,
          county: fresh.county,
          town: fresh.town,
          condition: fresh.condition,
          type: fresh.type,
          ownerId: (fresh as { ownerId?: string }).ownerId,
        },
        res.listing.price
      );
    }
  } catch {}
  try {
    revalidatePath("/sitemap.xml");
  } catch {}
  return NextResponse.json({ ok: true, id: params.id, status: fresh?.status ?? "pending", item: fresh });
}

/** Quick status actions: sold | hidden | republish (hidden/sold → review queue) | renew (7-day free bump). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const res = await owned(params.id);
  if ("error" in res) return res.error;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const store = getStore();
  if (action === "sold") {
    await store.setListingStatus(params.id, "sold");
  } else if (action === "hidden") {
    await store.setListingStatus(params.id, "hidden");
  } else if (action === "republish" || action === "active") {
    // Always back to the moderation queue — sellers (and admin-hidden
    // listings) must never self-activate without a fresh admin check.
    await store.setListingStatus(params.id, "pending");
  } else if (action === "renew") {
    // Jiji-style free bump: 1× per 7 days, moves ad to top with fresh timestamp.
    if (res.listing.status !== "active") {
      return NextResponse.json({ error: "Only active listings can be renewed." }, { status: 409 });
    }
    const last = (await store.getSetting(`renew:${params.id}`).catch(() => null)) as { at?: string } | null;
    const lastAt = last?.at ? new Date(last.at).getTime() : 0;
    if (Date.now() - lastAt < 7 * 86400_000) {
      const days = Math.ceil((7 * 86400_000 - (Date.now() - lastAt)) / 86400_000);
      return NextResponse.json({ error: `Free renew available in ${days}d. Boost for instant visibility.` }, { status: 429 });
    }
    // Bump = touch updatedAt via re-save of same fields (store keeps createdAt;
    // we record renewedAt so search sorts bumped first within relevance).
    await store.setSetting(`renew:${params.id}`, { at: new Date().toISOString(), by: res.user.id }).catch(() => {});
    await store.updateListing(params.id, { county: res.listing.county }).catch(() => {});
  } else {
    return NextResponse.json({ error: "Unknown action. Use sold, hidden, republish or renew." }, { status: 400 });
  }
  const fresh = await store.getListing(params.id);
  try {
    revalidatePath("/sitemap.xml");
  } catch {}
  return NextResponse.json({ ok: true, status: fresh?.status, item: fresh });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const res = await owned(params.id);
  if ("error" in res) return res.error;
  await getStore().deleteListing(params.id);
  try {
    revalidatePath("/sitemap.xml");
  } catch {}
  return NextResponse.json({ ok: true });
}
