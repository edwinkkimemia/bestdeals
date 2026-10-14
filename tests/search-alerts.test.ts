import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  listingMatchesQuery,
  fanoutNewListingAlert,
  fanoutPriceDrop,
} from "../src/lib/search-alerts.ts";
import { freshDemoStore } from "../src/lib/store.ts";

const base = {
  id: "l1",
  slug: "iphone-13-nairobi",
  title: "iPhone 13 128GB sealed",
  description: "Sealed iPhone 13, Nairobi CBD, receipt available",
  categorySlug: "phones-tablets",
  subcategory: "Smartphones",
  price: 85000,
  county: "Nairobi",
  town: "CBD",
  condition: "new",
  type: "product",
  ownerId: "seller1",
};

describe("listingMatchesQuery", () => {
  it("matches keywords case-insensitively", () => {
    assert.equal(listingMatchesQuery(base, { q: "iphone" }), true);
    assert.equal(listingMatchesQuery(base, { q: "IPHONE sealed" }), true);
    assert.equal(listingMatchesQuery(base, { q: "fielder" }), false);
  });
  it("filters category, price, location, condition, type", () => {
    assert.equal(listingMatchesQuery(base, { category: "phones-tablets" }), true);
    assert.equal(listingMatchesQuery(base, { category: "automotive" }), false);
    assert.equal(listingMatchesQuery(base, { max: 90000 }), true);
    assert.equal(listingMatchesQuery(base, { max: 80000 }), false);
    assert.equal(listingMatchesQuery(base, { min: 80000 }), true);
    assert.equal(listingMatchesQuery(base, { county: "Nairobi" }), true);
    assert.equal(listingMatchesQuery(base, { county: "Kiambu" }), false);
    assert.equal(listingMatchesQuery(base, { town: "cbd" }), true);
    assert.equal(listingMatchesQuery(base, { town: "Westlands" }), false);
    assert.equal(listingMatchesQuery(base, { condition: "new" }), true);
    assert.equal(listingMatchesQuery(base, { type: "product" }), true);
    assert.equal(listingMatchesQuery(base, { type: "classified" }), false);
  });
  it("combines filters (AND)", () => {
    assert.equal(listingMatchesQuery(base, { q: "iphone", category: "phones-tablets", max: 90000, county: "Nairobi" }), true);
    assert.equal(listingMatchesQuery(base, { q: "iphone", max: 80000 }), false);
  });
  it("empty query matches everything", () => {
    assert.equal(listingMatchesQuery(base, {}), true);
  });
});

describe("fanoutNewListingAlert", () => {
  it("notifies matching watchers, skips owner + non-matches, dedupes", async () => {
    const s = freshDemoStore();
    const w1 = await s.createUser({ name: "W1", email: "w1@x.co.ke", phone: "0711111111", role: "BUYER", verified: false, passwordHash: "x" });
    const w2 = await s.createUser({ name: "W2", email: "w2@x.co.ke", phone: "0722222222", role: "BUYER", verified: false, passwordHash: "x" });
    const owner = await s.createUser({ name: "Own", email: "o@x.co.ke", phone: "0733333333", role: "SELLER", verified: true, passwordHash: "x" });
    await s.setSetting(`saved_searches:${w1.id}`, [{ id: "ss1", name: "iphones", query: { q: "iphone", max: 90000 }, createdAt: new Date().toISOString() }]);
    await s.setSetting(`saved_searches:${w2.id}`, [{ id: "ss2", name: "cars", query: { q: "fielder" }, createdAt: new Date().toISOString() }]);
    await s.setSetting(`saved_searches:${owner.id}`, [{ id: "ss3", name: "own", query: { q: "iphone" }, createdAt: new Date().toISOString() }]);
    const listing = { ...base, ownerId: owner.id };
    const n = await fanoutNewListingAlert(listing, s);
    assert.equal(n, 1);
    assert.equal((await s.listNotifications(w1.id)).length, 1);
    assert.equal((await s.listNotifications(w1.id))[0].type, "alert");
    assert.equal((await s.listNotifications(w2.id)).length, 0);
    assert.equal((await s.listNotifications(owner.id)).length, 0);
    // Second fanout for the same ad is a no-op (dedupe).
    assert.equal(await fanoutNewListingAlert(listing, s), 0);
  });
});

describe("fanoutPriceDrop", () => {
  it("bells wishlist holders on a drop, ignores rises, dedupes", async () => {
    const s = freshDemoStore();
    const w = await s.createUser({ name: "W", email: "pw@x.co.ke", phone: "0711111111", role: "BUYER", verified: false, passwordHash: "x" });
    const owner = await s.createUser({ name: "O", email: "po@x.co.ke", phone: "0722222222", role: "SELLER", verified: true, passwordHash: "x" });
    await s.setSetting(`wishlist:${w.id}`, ["l1"]);
    const listing = { ...base, id: "l1", price: 75000, ownerId: owner.id };
    const n = await fanoutPriceDrop(listing, 85000, s);
    assert.equal(n, 1);
    const items = await s.listNotifications(w.id);
    assert.equal(items.length, 1);
    assert.match(items[0].title, /Price drop/);
    assert.equal(await fanoutPriceDrop(listing, 85000, s), 0); // same price: deduped
    assert.equal(await fanoutPriceDrop({ ...listing, price: 90000 }, 75000, s), 0); // rise: nothing
  });

  it("bells newly-in-budget saved searches", async () => {
    const s = freshDemoStore();
    const w = await s.createUser({ name: "B", email: "b@x.co.ke", phone: "0711111111", role: "BUYER", verified: false, passwordHash: "x" });
    await s.setSetting(`saved_searches:${w.id}`, [{ id: "ss1", name: "budget iphones", query: { q: "iphone", max: 80000 }, createdAt: new Date().toISOString() }]);
    const listing = { ...base, price: 75000, ownerId: "someone-else" };
    const n = await fanoutPriceDrop(listing, 85000, s);
    assert.equal(n, 1);
    assert.match((await s.listNotifications(w.id))[0].title, /budget/);
  });
});
