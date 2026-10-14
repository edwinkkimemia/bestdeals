import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mpesaCallbackUrl,
  verifyCallbackSecret,
  isCallbackAuthEnforced,
} from "../src/lib/payments.ts";
import { freshDemoStore, getStore } from "../src/lib/store.ts";
import { recordReservation, restoreReservedStock } from "../src/lib/stock.ts";

const KEYS = ["MPESA_CALLBACK_SECRET", "MPESA_CALLBACK_URL"] as const;
const saved: Record<string, string | undefined> = {};
for (const k of KEYS) saved[k] = process.env[k];
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("callback authentication", () => {
  it("appends and verifies the callback secret", () => {
    delete process.env.MPESA_CALLBACK_SECRET;
    assert.equal(isCallbackAuthEnforced(), false);
    assert.equal(verifyCallbackSecret("https://x/api/payments/mpesa-callback"), true);
    process.env.MPESA_CALLBACK_SECRET = "0123456789abcdef0123456789abcdef";
    assert.equal(isCallbackAuthEnforced(), true);
    const url = mpesaCallbackUrl();
    assert.ok(url.includes("key=0123456789abcdef0123456789abcdef"));
    assert.equal(verifyCallbackSecret(url), true);
    assert.equal(verifyCallbackSecret(url.replace(/key=.*/, "key=wrongwrongwrongwrongwrongwrong12")), false);
    assert.equal(verifyCallbackSecret("https://x/api/payments/mpesa-callback"), false);
  });
});

describe("atomic stock decrement", () => {
  it("refuses to oversell and restores reservations exactly once", async () => {
    const store = freshDemoStore();
    const user = await store.createUser({
      name: "Stock U", email: "stock-u@x.co.ke", phone: "0712345678",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    const l = await store.createListing({
      title: "Stock item for decrement", description: "01234567890123456789",
      type: "product", price: 100, compareAt: null, condition: "new",
      txMethod: "buy_online", negotiable: false, stock: 2,
      county: "Nairobi", town: "CBD", images: [], attributes: {},
      ownerId: user.id, sellerName: user.name, categorySlug: "other",
    });
    assert.equal(await store.decrementListingStock(l.id, 2), true);
    assert.equal(await store.decrementListingStock(l.id, 1), false);
    assert.equal((await store.getListing(l.id))?.stock, 0);
  });

  it("restoreReservedStock gives units back once, then no-ops", async () => {
    const store = getStore();
    const user = await store.createUser({
      name: "Restore U", email: "restore-u@x.co.ke", phone: "0712345678",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    const l = await store.createListing({
      title: "Restore item for cancel", description: "01234567890123456789",
      type: "product", price: 100, compareAt: null, condition: "new",
      txMethod: "buy_online", negotiable: false, stock: 5,
      county: "Nairobi", town: "CBD", images: [], attributes: {},
      ownerId: user.id, sellerName: user.name, categorySlug: "other",
    });
    assert.equal(await store.decrementListingStock(l.id, 2), true);
    await recordReservation("order-test-1", [{ storeId: l.id, qty: 2 }]);
    await restoreReservedStock("order-test-1");
    assert.equal((await store.getListing(l.id))?.stock, 5);
    // Second restore is a no-op (key deleted) — no double credit.
    await restoreReservedStock("order-test-1");
    assert.equal((await store.getListing(l.id))?.stock, 5);
  });
});

describe("review authorship", () => {
  it("records authorId and supports author edit + lookup", async () => {
    const store = freshDemoStore();
    const rec = await store.createReview({
      sellerName: "Some Shop", authorId: "u-author", authorName: "Author",
      rating: 5, verifiedPurchase: false,
    });
    assert.equal(rec.authorId, "u-author");
    assert.equal((await store.getReview(rec.id))?.authorId, "u-author");
    const updated = await store.updateReview(rec.id, { body: "Edited words", rating: 4 });
    assert.equal(updated?.body, "Edited words");
    assert.equal(updated?.rating, 4);
    assert.equal(await store.getReview("missing"), null);
    assert.equal(await store.updateReview("missing", { body: "x" }), null);
  });
});
