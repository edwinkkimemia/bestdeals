import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshDemoStore } from "../src/lib/store.ts";
import { pinTopResults, rankDeterministic } from "../src/lib/search.ts";

const listing = (ownerId: string, sellerName: string, title: string) => ({
  title,
  description: "A listing for testing TOP pins",
  type: "product" as const,
  price: 10000,
  compareAt: null,
  condition: "new" as const,
  txMethod: "buy_online" as const,
  negotiable: false,
  stock: 1,
  county: "Nairobi",
  town: "CBD",
  images: ["https://x.co/i.jpg"],
  attributes: {} as Record<string, string>,
  ownerId,
  sellerName,
  categorySlug: "phones-tablets",
});

describe("TOP pins", () => {
  it("livePromoKinds reports top (winning over stacked featured)", async () => {
    const store = freshDemoStore();
    const user = await store.createUser({
      name: "Top Seller", email: "top-s@x.co.ke", phone: "0712345678",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    const a = await store.createListing(listing(user.id, user.name, "Top pinned phone"));
    const b = await store.createListing(listing(user.id, user.name, "Featured phone"));
    const pa = await store.createPromotion({ listingId: a.id, ownerId: user.id, kind: "top", days: 7, amount: 349 });
    const pb = await store.createPromotion({ listingId: b.id, ownerId: user.id, kind: "featured", days: 7, amount: 199 });
    await store.setPromotionStatus(pa.id, "active");
    await store.setPromotionStatus(pb.id, "active");
    // Stacked featured on top of the TOP pin must not demote it.
    const extra = await store.createPromotion({ listingId: a.id, ownerId: user.id, kind: "featured", days: 7, amount: 199 });
    await store.setPromotionStatus(extra.id, "active");

    const kinds = await store.livePromoKinds([a.id, b.id, "missing"]);
    assert.equal(kinds.get(a.id), "top");
    assert.equal(kinds.get(b.id), "featured");
    assert.equal(kinds.has("missing"), false);
  });

  it("TOP pins lead search ranking deterministically", () => {
    const items = rankDeterministic([
      { id: "a", featured: false, topPinned: false, createdAt: new Date().toISOString() },
      { id: "b", featured: true, topPinned: false, createdAt: new Date().toISOString() },
      { id: "c", featured: false, topPinned: true, createdAt: new Date().toISOString() },
    ]);
    assert.deepEqual(items.map((i) => i.id), ["c", "b", "a"]);
  });

  it("keyword search pins TOP only, preserving relevance over featured", () => {
    const items = [
      { id: "exact", topPinned: false },
      { id: "featured", topPinned: false },
      { id: "top", topPinned: true },
    ];
    assert.deepEqual(pinTopResults(items).map((i) => i.id), ["top", "exact", "featured"]);
  });
});
