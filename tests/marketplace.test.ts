import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cartTotals, commissionDue, savings } from "../src/lib/format.ts";
import { slugify } from "../src/lib/utils.ts";
import { validateMpesaCallback } from "../src/lib/payments.ts";
import { searchListings } from "../src/lib/search.ts";
import { getRelated, listingHref } from "../src/lib/related.ts";
import { getListing, LISTINGS, CATEGORIES } from "../src/data/catalog.ts";
import { freshDemoStore } from "../src/lib/store.ts";
import { reviewSchema, disputeSchema } from "../src/lib/validators.ts";

describe("pricing", () => {
  it("computes subtotal/discount/delivery/total", () => {
    const t = cartTotals(
      [{ unitPrice: 52999, qty: 1 }, { unitPrice: 1800, qty: 2 }],
      { couponValue: 500, deliveryFee: 250 }
    );
    assert.equal(t.subtotal, 56599);
    assert.equal(t.discount, 500);
    assert.equal(t.total, 56349);
  });
  it("caps discount at subtotal", () => {
    const t = cartTotals([{ unitPrice: 200, qty: 1 }], { couponValue: 500 });
    assert.equal(t.total, 0);
  });
  it("calculates genuine savings only", () => {
    assert.equal(savings(59999, 52999), 12);
    assert.equal(savings(1000, 1000), null);
    assert.equal(savings(900, 1000), null);
  });
  it("computes commission in basis points", () => {
    assert.equal(commissionDue(10000, 500), 500);
    assert.equal(commissionDue(0, 500), 0);
  });
});

describe("listings", () => {
  it("makes safe slugs", () => {
    assert.equal(slugify("FonZone Nairobi!!"), "fonzone-nairobi");
  });
  it("finds products via synonyms", () => {
    const r = searchListings({ q: "phone" });
    assert.ok(r.total >= 1, "expected phone results");
  });
  it("filters by price + county", () => {
    const r = searchListings({ min: 1000000, county: "Nairobi" });
    assert.ok(r.items.every((i) => i.price >= 1000000 && i.county === "Nairobi"));
  });
  it("combines shop + classifieds by default", () => {
    const r = searchListings({});
    const types = new Set(r.items.map((i) => i.listingType));
    assert.ok(types.has("product") && types.has("classified"), "default search must mix shop and classifieds");
    const onlyShop = searchListings({ type: "product" });
    assert.ok(onlyShop.items.every((i) => i.listingType === "product"));
    const onlyClass = searchListings({ type: "classified" });
    assert.ok(onlyClass.items.every((i) => i.listingType === "classified"));
    assert.equal(r.total, onlyShop.total + onlyClass.total + searchListings({ type: "service" }).total);
  });
});

describe("store", () => {
  it("registers users and enforces unique email", async () => {
    const s = freshDemoStore();
    const u = await s.createUser({ name: "Amina", email: "amina@example.co.ke", phone: "0712345678", role: "SELLER", verified: false, passwordHash: "x" });
    assert.equal((await s.findUserByEmail("AMINA@example.co.ke"))?.id, u.id);
    assert.equal((await s.findUserById(u.id))?.name, "Amina");
  });

  it("runs listing lifecycle pending → active", async () => {
    const s = freshDemoStore();
    const l = await s.createListing({
      title: "Test Phone 128GB sealed", description: "A sufficiently long description for validation.",
      type: "product", price: 10000, compareAt: null, condition: "new", txMethod: "buy_online",
      negotiable: false, stock: 3, county: "Nairobi", town: "CBD", images: [], attributes: {},
      ownerId: "u1", sellerName: "Amina", categorySlug: "phones-tablets",
    });
    assert.equal(l.status, "pending");
    assert.ok((await s.listListingsByOwner("u1")).some((x) => x.id === l.id));
    await s.setListingStatus(l.id, "active", "admin1", "looks good");
    assert.equal((await s.getListing(l.id))?.status, "active");
  });

  it("persists orders and dedupes payments by providerRef", async () => {
    const s = freshDemoStore();
    const o = await s.createOrder({
      name: "Brian", phone: "0722000000", county: "Nairobi", town: "CBD", address: "Moi Ave",
      deliveryMethod: "standard", paymentMethod: "mpesa", subtotal: 10000, discount: 0,
      delivery: 250, total: 10250, items: [{ title: "Test Phone", qty: 1, price: 10000 }],
      suborders: [{ seller: "Amina", items: [{ title: "Test Phone", qty: 1, price: 10000 }], subtotal: 10000, commission: 500 }],
    });
    assert.equal((await s.getOrder(o.id))?.total, 10250);
    assert.equal((await s.listOrdersByPhone("0722000000")).length, 1);
    const first = await s.recordPayment({ orderId: o.id, method: "mpesa", amount: 10250, status: "paid", providerRef: "RC1" });
    const second = await s.recordPayment({ orderId: o.id, method: "mpesa", amount: 10250, status: "paid", providerRef: "RC1" });
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.equal(second.id, first.id);
  });

  it("runs dispute lifecycle open → responded → resolved", async () => {
    const s = freshDemoStore();
    const d = await s.createDispute({ orderId: "O1", buyerName: "Brian", phone: "0722000000", reason: "Item not received" });
    assert.equal(d.status, "open");
    await s.respondDispute(d.id, "Courier delayed, arriving tomorrow.");
    assert.equal((await s.getDisputeByOrder("O1"))?.status, "seller_responded");
    await s.resolveDispute(d.id, "refund", "admin1");
    assert.equal((await s.getDisputeByOrder("O1"))?.status, "resolved_refund");
  });

  it("moderates reviews, approved-only listing", async () => {
    const s = freshDemoStore();
    const r = await s.createReview({ sellerName: "Amina", authorName: "Brian", rating: 5, body: "Great!", verifiedPurchase: true });
    assert.equal(r.status, "pending");
    assert.equal((await s.listApprovedReviewsForSeller("Amina")).length, 0);
    await s.setReviewStatus(r.id, "approved");
    assert.equal((await s.listApprovedReviewsForSeller("Amina")).length, 1);
  });

  it("verifies users through document decisions", async () => {
    const s = freshDemoStore();
    const u = await s.createUser({ name: "Caro", email: "caro@example.co.ke", phone: "0733000000", role: "SELLER", verified: false, passwordHash: "x" });
    const v = await s.createVerification({ userId: u.id, kind: "id", phone: "0733000000", docPath: "private:2024/f.png", fileName: "id.png" });
    assert.equal(v.status, "pending");
    assert.equal(v.phone, "0733000000");
    await s.decideVerification(v.id, true, "admin1");
    assert.equal((await s.listVerifications("pending")).length, 0);
  });

  it("snapshots the verified seller phone onto listings", async () => {
    const s = freshDemoStore();
    const l = await s.createListing({
      title: "Snapshotted phone listing here", description: "A sufficiently long description here.",
      type: "product", price: 5000, compareAt: null, condition: "new", txMethod: "buy_online",
      negotiable: false, stock: 2, county: "Nairobi", town: "CBD", images: [], attributes: {},
      ownerId: "u9", sellerName: "Caro", sellerPhone: "0733000000", categorySlug: "other",
    });
    assert.equal((await s.getListing(l.id))?.sellerPhone, "0733000000");
  });

  it("tracks reports open → closed", async () => {
    const s = freshDemoStore();
    const r = await s.createReport({ listingId: "p1", reason: "suspected fraud" });
    assert.equal((await s.listReports("open")).length, 1);
    await s.setReportStatus(r.id, "closed");
    assert.equal((await s.listReports("open")).length, 0);
  });

  it("updates profiles, exports and deletes accounts", async () => {
    const s = freshDemoStore();
    const u = await s.createUser({ name: "Dan", email: "dan@example.co.ke", phone: "0711000000", role: "SELLER", verified: false, passwordHash: "x" });
    const upd = await s.updateUser(u.id, { name: "Daniel K", phone: "0722000000" });
    assert.equal(upd?.name, "Daniel K");
    assert.equal(upd?.phone, "0722000000");
    const bad = await s.updateUser(u.id, { phone: "123" });
    assert.equal(bad?.phone, "0722000000");
    await s.createListing({
      title: "Dan's bike, well kept", description: "A sufficiently long description here.",
      type: "classified", price: 50000, compareAt: null, condition: "used_good", txMethod: "contact_seller",
      negotiable: true, stock: 1, county: "Nairobi", town: "CBD", images: [], attributes: {},
      ownerId: u.id, sellerName: "Daniel K", categorySlug: "automotive",
    });
    const exp = await s.exportUserData(u.id) as { user: { name: string }; listings: unknown[] };
    assert.equal(exp.user.name, "Daniel K");
    assert.equal(exp.listings.length, 1);
    await s.deleteUserAccount(u.id);
    assert.equal(await s.findUserById(u.id), null);
    assert.equal((await s.listListingsByOwner(u.id)).length, 0);
  });

  it("lists community shops", async () => {
    const s = freshDemoStore();
    assert.equal((await s.listShops()).length, 0);
    await s.createShop({ slug: "test-shop", name: "Test Shop", description: "Demo shop for tests.", businessCategory: "General", county: "Nairobi", town: "CBD", phone: "0711000000", ownerId: "u1" });
    const shops = await s.listShops();
    assert.equal(shops.length, 1);
    assert.equal(shops[0].verified, false);
  });
});

describe("trust-validators", () => {
  it("accepts valid review + dispute payloads", () => {
    assert.ok(reviewSchema.safeParse({ authorName: "Brian", rating: 5, sellerName: "Amina" }).success);
    assert.ok(!reviewSchema.safeParse({ authorName: "B", rating: 9 }).success);
    assert.ok(disputeSchema.safeParse({ orderId: "O1", reason: "damaged", name: "Brian", phone: "0722000000" }).success);
    assert.ok(!disputeSchema.safeParse({ orderId: "O1", reason: "x", name: "B", phone: "123" }).success);
  });
});

describe("catalogue", () => {
  it("holds 100 listings with unique ids/slugs and valid categories", () => {
    assert.equal(LISTINGS.length, 100);
    assert.equal(new Set(LISTINGS.map((l) => l.id)).size, 100);
    assert.equal(new Set(LISTINGS.map((l) => l.slug)).size, 100);
    const cats = new Set(CATEGORIES.map((c) => c.slug));
    for (const l of LISTINGS) {
      assert.ok(cats.has(l.categorySlug), `unknown category ${l.categorySlug}`);
      assert.ok(l.title.length >= 8 && l.price >= 0);
      assert.ok(l.images.length >= 1);
      if (l.compareAt) assert.ok(l.compareAt > l.price, `bogus discount on ${l.id}`);
    }
  });
  it("covers products, classifieds and services", () => {
    const types = new Set(LISTINGS.map((l) => l.listingType));
    assert.ok(types.has("product") && types.has("classified") && types.has("service"));
  });
});

describe("related", () => {
  it("mixes other sellers incl. classifieds/stores, never self", () => {
    const base = getListing("samsung-galaxy-a55-128gb-nairobi")!;
    const { fromOthers, fromSeller } = getRelated(base);
    assert.ok(fromOthers.length > 0, "expected cross-seller picks");
    assert.ok(fromOthers.every((l) => l.id !== base.id && l.sellerName !== base.sellerName));
    assert.ok(fromSeller.every((l) => l.sellerName === base.sellerName));
    assert.ok(fromOthers.some((l) => l.listingType === "classified" || l.shopSlug), "expected classifieds/stores in mix");
  });
  it("builds canonical urls per type", () => {
    assert.equal(listingHref({ listingType: "classified", slug: "x" }), "/classifieds/x");
    assert.equal(listingHref({ listingType: "service", slug: "x" }), "/services/x");
    assert.equal(listingHref({ listingType: "product", slug: "x" }), "/product/x");
  });
});

describe("payments", () => {
  it("rejects malformed callbacks", () => {
    assert.equal(validateMpesaCallback(null).valid, false);
    assert.equal(validateMpesaCallback({}).valid, false);
  });
  it("parses a success callback", () => {
    const v = validateMpesaCallback({
      Body: {
        stkCallback: {
          MerchantRequestID: "ORD-1",
          CheckoutRequestID: "ws_CO_1",
          ResultCode: 0,
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: 52999 },
              { Name: "MpesaReceiptNumber", Value: "RC123" },
            ],
          },
        },
      },
    });
    assert.equal(v.valid, true);
    assert.equal(v.amount, 52999);
  });
});
