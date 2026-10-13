import { describe, it } from "node:test";
import assert from "node:assert/strict";

delete process.env.DATABASE_URL;

import { freshDemoStore } from "../src/lib/store.ts";
import { normalizeShopContacts, normalizeUrlish } from "../src/lib/shop-contacts.ts";

describe("shop contacts", () => {
  it("cleans urls (adds https, rejects junk)", () => {
    assert.equal(normalizeUrlish("myshop.co.ke"), "https://myshop.co.ke");
    assert.equal(normalizeUrlish("https://myshop.co.ke/"), "https://myshop.co.ke/");
    assert.equal(normalizeUrlish(""), null);
    assert.equal(normalizeUrlish("not a url"), "invalid");
    assert.equal(normalizeUrlish("ftp://x.co"), "invalid");
  });
  it("validates website/email/socials, empty clears", () => {
    const ok = normalizeShopContacts({ website: "shop.co.ke", email: "hi@shop.co.ke", socials: { facebook: "facebook.com/shop", x: "" } });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.patch.website, "https://shop.co.ke");
      assert.equal(ok.patch.email, "hi@shop.co.ke");
      assert.deepEqual(ok.patch.socials, { facebook: "https://facebook.com/shop" });
    }
    assert.equal(normalizeShopContacts({ website: "junk" }).ok, false);
    assert.equal(normalizeShopContacts({ email: "nope" }).ok, false);
    assert.equal(normalizeShopContacts({ socials: { facebook: "junk" } }).ok, false);
    const clear = normalizeShopContacts({ website: "", email: "", socials: null });
    assert.equal(clear.ok, true);
    if (clear.ok) assert.deepEqual(clear.patch, { website: null, email: null, socials: null });
  });
  it("absent keys leave fields unchanged", () => {
    const r = normalizeShopContacts({});
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.patch, {});
  });
  it("persists through updateShop (demo)", async () => {
    const store = freshDemoStore();
    const user = await store.createUser({
      name: "Shop Contacts", email: "contacts@x.co.ke", phone: "0712345678",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    const shop = await store.createShop({
      slug: "contacts-shop", name: "Contacts Shop", description: "Shop used to test public contacts.",
      businessCategory: "General retail", county: "Nairobi", town: "CBD", phone: "0712345678", ownerId: user.id,
    });
    const updated = await store.updateShop(shop.slug, {
      website: "https://shop.co.ke", email: "hi@shop.co.ke", socials: { instagram: "https://instagram.com/shop" },
    });
    assert.equal(updated?.website, "https://shop.co.ke");
    assert.equal(updated?.email, "hi@shop.co.ke");
    assert.deepEqual(updated?.socials, { instagram: "https://instagram.com/shop" });
  });
});
