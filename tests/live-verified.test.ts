import { describe, it } from "node:test";
import assert from "node:assert/strict";

delete process.env.DATABASE_URL;

import { freshDemoStore, getStore } from "../src/lib/store.ts";

// withLiveVerification reads the ambient store via getStore(); in demo mode
// that is a process-global singleton, so seed it through the same accessor.
import { getStore as gs } from "../src/lib/store.ts";
import { withLiveVerification, relatedWithLive } from "../src/lib/live-listings.ts";
import { tenureLabel } from "../src/components/ui/badge.tsx";
import { LISTINGS } from "../src/data/catalog.ts";

describe("live verification badge", () => {
  it("prefers the live user record over the catalogue flag", async () => {
    const store = gs();
    const target = LISTINGS.find((l) => l.sellerName === "Chebet R.")!;
    assert.equal(target.verified, false, "catalogue fixture ships unverified");
    const user = await store.createUser({
      name: "Chebet R.", email: "chebet.r@demo.chap.co.ke", phone: "0710000103",
      role: "SELLER", verified: true, emailVerified: true, sellerKind: "individual",
      passwordHash: "h",
    });
    void user;
    const [out] = await withLiveVerification([{ ...target }]);
    assert.equal(out.verified, true, "verified user flips the badge");
    await store.setUserVerified((await store.findUserByEmail("chebet.r@demo.chap.co.ke"))!.id, false);
    const [out2] = await withLiveVerification([{ ...target }]);
    assert.equal(out2.verified, false, "unverified user keeps the catalogue flag");
  });
  it("stamps the effective plan for card checkmarks", async () => {
    const store = gs();
    const u = await store.createUser({
      name: "Plan Card Seller", email: "plan-card@demo.chap.co.ke", phone: "0710000199",
      role: "SELLER", verified: true, emailVerified: true, sellerKind: "individual",
      passwordHash: "h",
    });
    const base = { ownerId: u.id, sellerName: "Plan Card Seller", verified: true };
    // Free everywhere → no check.
    assert.equal((await withLiveVerification([{ ...base }]))[0].planId, null);
    // Personal silver → blue check.
    await store.setUserPlan(u.id, "silver");
    assert.equal((await withLiveVerification([{ ...base }]))[0].planId, "silver");
    // Owned gold shop beats personal silver.
    if (!(await store.getShopBySlug("plan-card-shop"))) {
      await store.createShop({
        slug: "plan-card-shop", name: "Plan Card Shop", description: "d",
        businessCategory: "Retail", county: "Nairobi", town: "CBD",
        phone: "0710000199", ownerId: u.id,
      });
    }
    await store.setShopPlan("plan-card-shop", "gold");
    const [shopItem] = await withLiveVerification([{ ...base, shopSlug: "plan-card-shop" }]);
    assert.equal(shopItem.planId, "gold");
    // Unknown sellers keep flags with no check.
    const [stranger] = await withLiveVerification([
      { sellerName: "Nobody At All XYZ", verified: false },
    ]);
    assert.equal(stranger.verified, false);
    assert.equal(stranger.planId, null);
  });
  it("formats tenure compactly (null under ~30 days)", () => {
    assert.equal(tenureLabel(undefined), null);
    assert.equal(tenureLabel("not-a-date"), null);
    assert.equal(tenureLabel(new Date(Date.now() - 10 * 86400_000).toISOString()), null);
    assert.equal(tenureLabel(new Date(Date.now() - 60 * 86400_000).toISOString()), "2m");
    assert.equal(tenureLabel(new Date(Date.now() - 400 * 86400_000).toISOString()), "1y");
    assert.equal(tenureLabel(new Date(Date.now() - 1100 * 86400_000).toISOString()), "3y");
  });
  it("stamps seller account age for tenure display", async () => {
    const store = gs();
    const u = await store.createUser({
      name: "Tenure Seller", email: "tenure@demo.chap.co.ke", phone: "0710000188",
      role: "SELLER", verified: true, emailVerified: true, sellerKind: "individual",
      passwordHash: "h",
    });
    const [out] = await withLiveVerification([{ ownerId: u.id, sellerName: "Tenure Seller", verified: true }]);
    assert.ok(out.sellerSince, "account age stamped");
  });
  it("related rails inherit live flags", async () => {
    const target = LISTINGS.find((l) => l.sellerName === "Chebet R.")!;
    const { main, fromOthers } = await relatedWithLive(target);
    assert.ok(main, "main listing returned");
    assert.ok(Array.isArray(fromOthers), "rails returned");
    void freshDemoStore;
  });
});
