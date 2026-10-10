import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isAccountLocked,
  recordLoginFailure,
  clearLoginFailures,
  resetLoginGuard,
} from "../src/lib/login-guard.ts";
import { createPurposeToken, readPurposeToken, hashFingerprint } from "../src/lib/auth-tokens.ts";
import { BOOST_PRODUCTS, boostProductById } from "../src/data/catalog.ts";
import { promoIsLive, promoDisplayStatus, freshDemoStore } from "../src/lib/store.ts";

describe("login-guard", () => {
  it("locks an account after 5 failures, leaves others alone", () => {
    resetLoginGuard();
    assert.equal(isAccountLocked("a@x.co.ke").locked, false);
    for (let i = 0; i < 4; i++) {
      const r = recordLoginFailure("a@x.co.ke");
      assert.equal(r.locked, false);
      assert.equal(r.remaining, 4 - i);
    }
    assert.equal(recordLoginFailure("a@x.co.ke").locked, true);
    const lock = isAccountLocked("a@x.co.ke");
    assert.equal(lock.locked, true);
    assert.ok((lock.retryAfterSec ?? 0) > 0);
    assert.equal(isAccountLocked("b@x.co.ke").locked, false);
  });
  it("treats email case-insensitively and clears on success", () => {
    resetLoginGuard();
    recordLoginFailure("User@X.co.ke");
    assert.equal(isAccountLocked("user@x.co.ke").locked, false);
    clearLoginFailures("USER@x.co.ke");
    assert.equal(isAccountLocked("user@x.co.ke").locked, false);
    // bucket restarts after clear
    assert.equal(recordLoginFailure("user@x.co.ke").remaining, 4);
    resetLoginGuard();
  });
});

describe("auth-tokens", () => {
  it("round-trips purpose tokens and rejects mismatched purpose", async () => {
    const t = await createPurposeToken({ purpose: "password-reset", userId: "u1", email: "a@x.co.ke", fingerprint: "fp1" });
    const d = await readPurposeToken(t, "password-reset");
    assert.equal(d?.userId, "u1");
    assert.equal(d?.email, "a@x.co.ke");
    assert.equal(d?.fingerprint, "fp1");
    assert.equal(await readPurposeToken(t, "email-verify"), null);
    assert.equal(await readPurposeToken("garbage", "password-reset"), null);
  });
  it("invalidates reset tokens when the password hash changes", async () => {
    const fpOld = hashFingerprint("hash-one");
    const fpNew = hashFingerprint("hash-two");
    assert.notEqual(fpOld, fpNew);
    const t = await createPurposeToken({ purpose: "password-reset", userId: "u1", email: "a@x.co.ke", fingerprint: fpOld });
    const d = await readPurposeToken(t, "password-reset");
    assert.equal(d?.fingerprint, fpOld);
    assert.notEqual(d?.fingerprint, fpNew);
  });
  it("round-trips email-verify tokens", async () => {
    const t = await createPurposeToken({ purpose: "email-verify", userId: "u9", email: "b@x.co.ke" });
    const d = await readPurposeToken(t, "email-verify");
    assert.equal(d?.userId, "u9");
    assert.equal(await readPurposeToken(t, "password-reset"), null);
  });
});

describe("promotion-expiry", () => {
  it("treats active boosts past their window as expired", () => {
    const now = Date.now();
    assert.equal(promoIsLive({ status: "active", endsAt: new Date(now + 1000).toISOString() }, now), true);
    assert.equal(promoIsLive({ status: "active", endsAt: new Date(now - 1000).toISOString() }, now), false);
    assert.equal(promoIsLive({ status: "pending_payment", endsAt: new Date(now + 1000).toISOString() }, now), false);
    assert.equal(
      promoDisplayStatus({ id: "p", listingId: "l", kind: "featured", days: 7, amount: 249, status: "active", startsAt: "", endsAt: new Date(now - 1000).toISOString(), createdAt: "" }, now),
      "expired"
    );
  });

  it("sweeps lapsed boosts and unfeatures the listing", async () => {
    const store = freshDemoStore();
    const user = await store.createUser({ name: "Seller", email: "s@x.co.ke", phone: "0712345678", role: "SELLER", verified: true, passwordHash: "h" });
    const listing = await store.createListing({
      title: "Test phone", description: "A phone for testing boosts", type: "product", price: 10000,
      compareAt: null, condition: "new", txMethod: "buy_online", negotiable: false, stock: 1,
      county: "Nairobi", town: "CBD", images: ["https://x.co/i.jpg"], attributes: {},
      ownerId: user.id, sellerName: user.name, categorySlug: "phones-tablets",
    });
    const promo = await store.createPromotion({ listingId: listing.id, ownerId: user.id, kind: "featured", days: 7, amount: 249 });
    await store.setPromotionStatus(promo.id, "active");
    // Backdate the window into the past (simulates 7 days passing).
    (store as unknown as { promotions: Map<string, { endsAt: string }> }).promotions.get(promo.id)!.endsAt =
      new Date(Date.now() - 1000).toISOString();

    assert.equal((await store.getPromotion(promo.id))?.status, "expired");
    assert.equal((await store.getListing(listing.id))?.featured, false);
    assert.equal(await store.sweepExpiredPromotions(), 1);
    assert.equal((await store.getPromotion(promo.id))?.status, "expired");
    assert.equal(await store.sweepExpiredPromotions(), 0);
  });

  it("reactivating a lapsed boost restarts its window", async () => {
    const store = freshDemoStore();
    const user = await store.createUser({ name: "Seller", email: "s2@x.co.ke", phone: "0712345678", role: "SELLER", verified: true, passwordHash: "h" });
    const listing = await store.createListing({
      title: "Test laptop", description: "A laptop for testing boosts", type: "product", price: 50000,
      compareAt: null, condition: "new", txMethod: "buy_online", negotiable: false, stock: 1,
      county: "Nairobi", town: "CBD", images: [], attributes: {},
      ownerId: user.id, sellerName: user.name,
    });
    const promo = await store.createPromotion({ listingId: listing.id, ownerId: user.id, kind: "featured", days: 7, amount: 249 });
    await store.setPromotionStatus(promo.id, "active");
    (store as unknown as { promotions: Map<string, { endsAt: string }> }).promotions.get(promo.id)!.endsAt =
      new Date(Date.now() - 1000).toISOString();
    const re = await store.activatePromotion(promo.id);
    assert.equal(re?.status, "active");
    assert.ok(new Date(re!.endsAt).getTime() > Date.now());
    assert.equal((await store.getListing(listing.id))?.featured, true);
  });
});

describe("boost-products", () => {
  it("lists fixed-price featured boosts", () => {
    assert.equal(BOOST_PRODUCTS.length, 3);
    for (const b of BOOST_PRODUCTS) {
      assert.ok(b.price > 0 && b.days > 0 && b.kind === "featured");
    }
    assert.equal(boostProductById("boost-7")?.price, 249);
    assert.equal(boostProductById("boost-14")?.price, 399);
    assert.equal(boostProductById("boost-30")?.price, 599);
    assert.equal(boostProductById("nope"), null);
  });
});
