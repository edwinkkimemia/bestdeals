import { describe, it } from "node:test";
import assert from "node:assert/strict";

delete process.env.DATABASE_URL;

import { searchEntities } from "../src/lib/entity-search.ts";
import { searchAll, suggestions } from "../src/lib/search.ts";
import { getStore } from "../src/lib/store.ts";
import { LISTINGS } from "../src/data/catalog.ts";

describe("seller and shop search", () => {
  it("finds a shop by name and does not duplicate its owner as a seller", async () => {
    const { shops, sellers } = await searchEntities({ q: "FonZone" });
    assert.ok(shops.some((s) => s.slug === "fon-zone-nairobi"), "FonZone shop should match");
    assert.ok(!sellers.some((s) => s.name === "FonZone Nairobi"), "shop owner should stay in the shops tab");
  });

  it("finds individual sellers by name", async () => {
    const { sellers } = await searchEntities({ q: "Daniel" });
    const daniel = sellers.find((s) => s.name === "Daniel K.");
    assert.ok(daniel, "Daniel K. should be searchable");
    assert.equal(daniel!.sellerKind, "individual");
    assert.ok(daniel!.listingsCount > 0);
  });

  it("applies county filters to sellers and shops", async () => {
    const nakuru = await searchEntities({ q: "Daniel", county: "Nakuru" });
    assert.ok(nakuru.sellers.some((s) => s.name === "Daniel K."));

    const mombasa = await searchEntities({ q: "Daniel", county: "Mombasa" });
    assert.ok(!mombasa.sellers.some((s) => s.name === "Daniel K."));

    const rift = await searchEntities({ q: "Rift", county: "Nakuru" });
    assert.ok(rift.shops.some((s) => s.slug === "rift-hardware"));

    const wrongCounty = await searchEntities({ q: "Rift", county: "Mombasa" });
    assert.ok(!wrongCounty.shops.some((s) => s.slug === "rift-hardware"));
  });

  it("matches shops by the products in their catalogue", async () => {
    const { shops } = await searchEntities({ q: "Samsung" });
    assert.ok(shops.some((s) => s.slug === "fon-zone-nairobi"), "FonZone sells Samsung phones");
  });

  it("includes seller and shop names in autocomplete suggestions", () => {
    const shopHits = suggestions("FonZone");
    assert.ok(shopHits.some((s) => s.toLowerCase().includes("fonzone")));

    const sellerHits = suggestions("Daniel");
    assert.ok(sellerHits.some((s) => s.toLowerCase().includes("daniel")));
  });

  it("keeps totals stable when live listings are merged with the catalogue", async () => {
    const store = getStore();
    const base = LISTINGS.find((l) => l.sellerName === "FonZone Nairobi");
    assert.ok(base);
    const { id, slug, createdAt, ...rest } = base!;
    void id;
    void slug;
    void createdAt;
    const live = await store.createListing({ ...rest, title: "FonZone Live Search Test" });
    await store.setListingStatus(live.id, "active");

    const one = await searchAll({ q: "FonZone", page: 1, perPage: 1 });
    const many = await searchAll({ q: "FonZone", page: 1, perPage: 60 });
    assert.equal(one.total, many.total);
    assert.ok(many.total > 18, "static catalogue + live item are both counted");
  });
});
