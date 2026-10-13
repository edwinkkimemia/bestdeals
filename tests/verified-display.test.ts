import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshDemoStore } from "../src/lib/store.ts";

const listing = (ownerId: string, sellerName: string) => ({
  title: "Test phone for badge",
  description: "A phone to test the seller verified badge",
  type: "product" as const,
  price: 10000,
  compareAt: null,
  condition: "new" as const,
  txMethod: "buy_online" as const,
  negotiable: false,
  stock: 1,
  county: "Nairobi",
  town: "CBD",
  images: [] as string[],
  attributes: {} as Record<string, string>,
  ownerId,
  sellerName,
  categorySlug: "phones-tablets",
});

describe("seller verified display", () => {
  it("resolves listing verified from the owner account at read time", async () => {
    const store = freshDemoStore();
    const user = await store.createUser({
      name: "Seller A", email: "a@x.co.ke", phone: "0712345678",
      role: "SELLER", verified: false, passwordHash: "h",
    });
    const l = await store.createListing(listing(user.id, user.name));
    await store.setListingStatus(l.id, "active");
    for (const read of [
      await store.getListing(l.id),
      (await store.listListingsByOwner(user.id))[0],
      (await store.listListingsByStatus("active")).find((x) => x.id === l.id),
    ]) {
      assert.equal(read?.verified, false);
    }
    await store.setUserVerified(user.id, true);
    assert.equal((await store.getListing(l.id))?.verified, true);
    assert.equal((await store.listListingsByOwner(user.id))[0]?.verified, true);
    assert.equal(
      (await store.listListingsByStatus("active")).find((x) => x.id === l.id)?.verified,
      true
    );
  });

  it("keeps badges per-owner (one verified seller does not badge another)", async () => {
    const store = freshDemoStore();
    const a = await store.createUser({
      name: "Seller A", email: "a@x.co.ke", phone: "0712345678",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    const b = await store.createUser({
      name: "Seller B", email: "b@x.co.ke", phone: "0712345679",
      role: "SELLER", verified: false, passwordHash: "h",
    });
    const la = await store.createListing(listing(a.id, a.name));
    const lb = await store.createListing(listing(b.id, b.name));
    assert.equal((await store.getListing(la.id))?.verified, true);
    assert.equal((await store.getListing(lb.id))?.verified, false);
  });

  it("exposes shop ownerId so shop pages can show the owner badge", async () => {
    const store = freshDemoStore();
    const user = await store.createUser({
      name: "Shop Owner", email: "o@x.co.ke", phone: "0712345678",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    await store.createShop({
      slug: "owner-shop", name: "Owner Shop", description: "A shop with an owner",
      businessCategory: "Retail", county: "Nairobi", town: "CBD", phone: "0712345678",
      ownerId: user.id,
    });
    assert.equal((await store.getShopBySlug("owner-shop"))?.ownerId, user.id);
    assert.equal(
      (await store.listShops()).find((s) => s.slug === "owner-shop")?.ownerId,
      user.id
    );
    assert.equal((await store.listShopsByOwner(user.id)).length, 1);
  });
});
