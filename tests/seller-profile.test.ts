import { describe, it } from "node:test";
import assert from "node:assert/strict";

delete process.env.DATABASE_URL;

import { getStore } from "../src/lib/store.ts";
import { sellerSlug, resolveSellerProfile, getSellerListings, resolveSellerContact } from "../src/lib/live-listings.ts";
import { LISTINGS } from "../src/data/catalog.ts";

describe("seller profile page", () => {
  it("slugs display names for URLs", () => {
    assert.equal(sellerSlug("FonZone Nairobi"), "fonzone-nairobi");
    assert.equal(sellerSlug("Daniel K."), "daniel-k");
    assert.equal(sellerSlug("  Rift--Hardware Ltd "), "rift-hardware-ltd");
  });
  it("falls back to the catalogue when no account exists", async () => {
    const name = LISTINGS[0].sellerName;
    const p = await resolveSellerProfile(sellerSlug(name));
    assert.ok(p, "catalogue seller resolves");
    assert.equal(p!.name, name);
    assert.equal(p!.hasAccount, false);
    assert.equal(await resolveSellerProfile("no-such-seller-xyz"), null);
    assert.equal(await resolveSellerProfile(""), null);
  });
  it("prefers the live account (id, then name slug)", async () => {
    const store = getStore();
    const user = await store.createUser({
      name: `Profile Test ${Date.now().toString(36)}`, email: `profile-${Date.now().toString(36)}@x.co.ke`,
      phone: "0712345678", role: "SELLER", verified: true, emailVerified: true,
      sellerKind: "individual", passwordHash: "h",
    });
    try {
      const byId = await resolveSellerProfile(user.id);
      assert.ok(byId?.hasAccount, "resolves by user id");
      assert.equal(byId!.verified, true);
      const bySlug = await resolveSellerProfile(sellerSlug(user.name));
      assert.equal(bySlug?.userId, user.id, "resolves by name slug");
    } finally {
      await store.deleteUserAccount(user.id).catch(() => null);
    }
  });
  it("lists the seller catalogue (static + live, badges resolved)", async () => {
    const name = LISTINGS[0].sellerName;
    const items = await getSellerListings({ name });
    assert.ok(items.length > 0, "catalogue items found");
    assert.ok(items.every((l) => l.sellerName === name), "only this seller");
  });
  it("resolves public contact (shop first, then listing snapshot)", () => {
    assert.equal(resolveSellerContact([], []), null);
    const fromListing = resolveSellerContact([{ sellerPhone: "0712345678" }], []);
    assert.deepEqual(fromListing, { phone: "0712345678", whatsapp: "254712345678" });
    const fromShop = resolveSellerContact([{ sellerPhone: "0712345678" }], [{ phone: "0733000000" }]);
    assert.deepEqual(fromShop, { phone: "0733000000", whatsapp: "254733000000" });
  });
});
