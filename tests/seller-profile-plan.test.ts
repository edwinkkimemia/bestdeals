import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshDemoStore, getStore } from "../src/lib/store.ts";
import { getSellerPlan } from "../src/lib/plans.ts";
import { resolveSellerProfile } from "../src/lib/live-listings.ts";

describe("seller bio + cover", () => {
  it("round-trips bio and coverUrl through updateUser", async () => {
    const store = freshDemoStore();
    const u = await store.createUser({
      name: "Bio Seller", email: "bio-seller@x.co.ke", phone: "0712345678",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    const updated = await store.updateUser(u.id, {
      bio: "Genuine phones in Nairobi CBD.",
      coverUrl: "https://example.com/seller-cover.jpg",
    });
    assert.equal(updated?.bio, "Genuine phones in Nairobi CBD.");
    assert.equal(updated?.coverUrl, "https://example.com/seller-cover.jpg");
    const cleared = await store.updateUser(u.id, { bio: null, coverUrl: null });
    assert.equal(cleared?.bio, null);
    assert.equal(cleared?.coverUrl, null);
  });

  it("resolveSellerProfile exposes bio and coverUrl", async () => {
    const store = getStore();
    const u = await store.createUser({
      name: "Cover Seller Unique", email: "cover-seller-u@x.co.ke", phone: "0712345678",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    await store.updateUser(u.id, {
      bio: "Cover seller bio here.",
      coverUrl: "https://example.com/cover-u.jpg",
      photoUrl: "https://example.com/photo-u.jpg",
    });
    const p = await resolveSellerProfile(u.id);
    assert.ok(p);
    assert.equal(p!.bio, "Cover seller bio here.");
    assert.equal(p!.coverUrl, "https://example.com/cover-u.jpg");
    assert.equal(p!.photoUrl, "https://example.com/photo-u.jpg");
  });
});

describe("personal seller plans", () => {
  it("uses the shop plan as the seller's one plan when a shop exists", async () => {
    const store = getStore();
    const u = await store.createUser({
      name: "Plan Seller Unique", email: "plan-seller-u@x.co.ke", phone: "0712345678",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    // No plan anywhere → free.
    assert.equal((await getSellerPlan(u.id)).planId, "free");

    // Personal silver with no shops → silver.
    await store.setUserPlan(u.id, "silver");
    assert.equal((await getSellerPlan(u.id)).planId, "silver");

    // Opening a shop moves the paid personal plan to the storefront.
    if (!(await store.getShopBySlug("plan-test-shop-u"))) {
      await store.createShop({
        slug: "plan-test-shop-u", name: "Plan Test Shop", description: "d",
        businessCategory: "Retail", county: "Nairobi", town: "CBD",
        phone: "0712345678", ownerId: u.id,
      });
    }
    assert.equal((await store.getShopBySlug("plan-test-shop-u"))?.planId, "silver");
    assert.equal((await store.findUserById(u.id))?.planId, "free");
    assert.equal((await getSellerPlan(u.id)).planId, "silver");

    // Legacy dual plans are consolidated onto the shop, never kept as two.
    await store.setShopPlan("plan-test-shop-u", "silver");
    await store.setUserPlan(u.id, "gold");
    const effective = await getSellerPlan(u.id);
    assert.equal(effective.planId, "gold");
    assert.equal((await store.getShopBySlug("plan-test-shop-u"))?.planId, "gold");
    assert.equal((await store.findUserById(u.id))?.planId, "free");
    // New listings still attach to the owned shop when one exists.
    assert.equal(effective.shopSlug, "plan-test-shop-u");
  });
});
