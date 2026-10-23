import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshDemoStore } from "../src/lib/store.ts";
import { fulfilLinkedPurchase, reconcilePendingMpesaLinks } from "../src/lib/mpesa-fulfilment.ts";
import { pendingPlanKey, pendingSellerPlanKey } from "../src/lib/plans.ts";

async function makeSeller(store: ReturnType<typeof freshDemoStore>, email: string) {
  return store.createUser({
    name: "M-Pesa Seller",
    email,
    phone: "0712345678",
    role: "SELLER",
    verified: true,
    passwordHash: "h",
  });
}

describe("M-Pesa callback fulfilment", () => {
  it("activates a paid boost and features its listing", async () => {
    const store = freshDemoStore();
    const user = await makeSeller(store, "boost@x.co.ke");
    const listing = await store.createListing({
      title: "Boostable phone",
      description: "A phone with a photo",
      type: "product",
      price: 1000,
      compareAt: null,
      condition: "new",
      txMethod: "contact_seller",
      negotiable: false,
      stock: 1,
      county: "Nairobi",
      town: "CBD",
      images: ["https://example.com/phone.jpg"],
      attributes: {},
      ownerId: user.id,
      sellerName: user.name,
      categorySlug: "phones-tablets",
    });
    await store.setListingStatus(listing.id, "active");
    const promo = await store.createPromotion({
      listingId: listing.id,
      ownerId: user.id,
      kind: "featured",
      days: 7,
      amount: 299,
    });
    await store.setSetting("mpesa_link:ws_CO_BOOST", { promoId: promo.id });

    const ok = await fulfilLinkedPurchase(
      { checkoutRequestId: "ws_CO_BOOST", orderRef: "ws_CO_BOOST", amount: 299, providerRef: "RC-BOOST" },
      store
    );

    assert.equal(ok, true);
    assert.equal((await store.getPromotion(promo.id))?.status, "active");
    assert.equal((await store.getListing(listing.id))?.featured, true);
    assert.equal(await store.getSetting("mpesa_link:ws_CO_BOOST"), null);
  });

  it("activates a paid seller plan and settles its invoice", async () => {
    const store = freshDemoStore();
    const user = await makeSeller(store, "seller-plan@x.co.ke");
    const invoice = {
      id: "INV-SELLER-TEST",
      shopSlug: "",
      planId: "silver",
      amount: 499,
      at: new Date().toISOString(),
      renewsAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
      method: "mpesa",
      status: "pending",
    };
    await store.setSetting("invoices", [invoice]);
    await store.setSetting(pendingSellerPlanKey(user.id), {
      planId: "silver",
      amount: 499,
      phone: "0712345678",
      invoiceId: invoice.id,
      at: new Date().toISOString(),
    });
    await store.setSetting("mpesa_link:ws_CO_SELLER", { planUser: user.id, planId: "silver" });

    const ok = await fulfilLinkedPurchase(
      { checkoutRequestId: "ws_CO_SELLER", orderRef: "ws_CO_SELLER", amount: 499, providerRef: "RC-SELLER" },
      store
    );

    assert.equal(ok, true);
    assert.equal((await store.findUserById(user.id))?.planId, "silver");
    assert.equal(await store.getSetting(pendingSellerPlanKey(user.id)), null);
    const invoices = (await store.getSetting("invoices")) as { id: string; status: string; providerRef?: string }[];
    assert.equal(invoices[0]?.status, "paid");
    assert.equal(invoices[0]?.providerRef, "RC-SELLER");
  });

  it("activates a paid shop plan and settles its invoice", async () => {
    const store = freshDemoStore();
    const user = await makeSeller(store, "shop-plan@x.co.ke");
    const shop = await store.createShop({
      slug: "mpesa-test-shop",
      name: "M-Pesa Test Shop",
      description: "Plan checkout fixture",
      businessCategory: "Electronics",
      county: "Nairobi",
      town: "CBD",
      phone: "0712345678",
      ownerId: user.id,
    });
    const invoice = {
      id: "INV-SHOP-TEST",
      shopSlug: shop.slug,
      planId: "gold",
      amount: 999,
      at: new Date().toISOString(),
      renewsAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
      method: "mpesa",
      status: "pending",
    };
    await store.setSetting("invoices", [invoice]);
    await store.setSetting(pendingPlanKey(shop.slug), {
      planId: "gold",
      amount: 999,
      phone: "0712345678",
      invoiceId: invoice.id,
      at: new Date().toISOString(),
    });
    await store.setSetting("mpesa_link:ws_CO_SHOP", { planShop: shop.slug, planId: "gold" });

    const ok = await fulfilLinkedPurchase(
      { checkoutRequestId: "ws_CO_SHOP", orderRef: "ws_CO_SHOP", amount: 999, providerRef: "RC-SHOP" },
      store
    );

    assert.equal(ok, true);
    assert.equal((await store.getShopBySlug(shop.slug))?.planId, "gold");
    assert.equal(await store.getSetting(pendingPlanKey(shop.slug)), null);
    const invoices = (await store.getSetting("invoices")) as { id: string; status: string }[];
    assert.equal(invoices[0]?.status, "paid");
  });

  it("refuses to activate when the callback amount does not match", async () => {
    const store = freshDemoStore();
    const user = await makeSeller(store, "mismatch@x.co.ke");
    const listing = await store.createListing({
      title: "Mismatch phone",
      description: "A phone with a photo",
      type: "product",
      price: 1000,
      compareAt: null,
      condition: "new",
      txMethod: "contact_seller",
      negotiable: false,
      stock: 1,
      county: "Nairobi",
      town: "CBD",
      images: ["https://example.com/phone.jpg"],
      attributes: {},
      ownerId: user.id,
      sellerName: user.name,
      categorySlug: "phones-tablets",
    });
    const promo = await store.createPromotion({
      listingId: listing.id,
      ownerId: user.id,
      kind: "featured",
      days: 7,
      amount: 299,
    });
    await store.setSetting("mpesa_link:ws_CO_MISMATCH", { promoId: promo.id });

    const ok = await fulfilLinkedPurchase(
      { checkoutRequestId: "ws_CO_MISMATCH", orderRef: "ws_CO_MISMATCH", amount: 1, providerRef: "RC-MISMATCH" },
      store
    );

    assert.equal(ok, false);
    assert.equal((await store.getPromotion(promo.id))?.status, "pending_payment");
    assert.notEqual(await store.getSetting("mpesa_link:ws_CO_MISMATCH"), null);
  });

  it("recovers a lost callback by querying Daraja before activating", async () => {
    const store = freshDemoStore();
    const user = await makeSeller(store, "reconcile@x.co.ke");
    const listing = await store.createListing({
      title: "Reconcile phone",
      description: "A phone with a photo",
      type: "product",
      price: 1000,
      compareAt: null,
      condition: "new",
      txMethod: "contact_seller",
      negotiable: false,
      stock: 1,
      county: "Nairobi",
      town: "CBD",
      images: ["https://example.com/phone.jpg"],
      attributes: {},
      ownerId: user.id,
      sellerName: user.name,
      categorySlug: "phones-tablets",
    });
    const promo = await store.createPromotion({
      listingId: listing.id,
      ownerId: user.id,
      kind: "featured",
      days: 7,
      amount: 299,
    });
    await store.setSetting("mpesa_link:ws_CO_RECONCILE", { promoId: promo.id });

    const keys = [
      "MPESA_ENV",
      "MPESA_CONSUMER_KEY",
      "MPESA_CONSUMER_SECRET",
      "MPESA_SHORTCODE",
      "MPESA_PASSKEY",
    ] as const;
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]])) as Record<string, string | undefined>;
    const originalFetch = globalThis.fetch;
    try {
      process.env.MPESA_ENV = "production";
      process.env.MPESA_CONSUMER_KEY = "test-key";
      process.env.MPESA_CONSUMER_SECRET = "test-secret";
      process.env.MPESA_SHORTCODE = "7837109";
      process.env.MPESA_PASSKEY = "test-passkey";
      globalThis.fetch = (async (url: string | URL | Request) => {
        if (String(url).includes("/oauth/")) {
          return new Response(JSON.stringify({ access_token: "test-token" }), { status: 200 });
        }
        return new Response(JSON.stringify({ ResultCode: "0", ResultDesc: "The service request is processed successfully." }), {
          status: 200,
        });
      }) as typeof fetch;

      const result = await reconcilePendingMpesaLinks(store);

      assert.equal(result.checked, 1);
      assert.equal(result.activated, 1);
      assert.equal(result.pending, 0);
      assert.equal((await store.getPromotion(promo.id))?.status, "active");
      assert.equal((await store.getListing(listing.id))?.featured, true);
      assert.deepEqual(await store.listSettings("mpesa_link:"), []);
    } finally {
      globalThis.fetch = originalFetch;
      for (const k of keys) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    }
  });
});
