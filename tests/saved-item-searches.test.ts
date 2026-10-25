import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { itemSearchQuery } from "../src/lib/saved-item-searches.ts";

describe("saved searches from hearted products", () => {
  it("derives category, subcategory and price cap", () => {
    const query = itemSearchQuery({
      title: "Samsung Galaxy A55 128GB",
      categorySlug: "phones-tablets",
      subcategory: "Smartphones",
      price: 50000,
    });
    assert.equal(query.category, "phones-tablets");
    assert.equal(query.subcategory, "Smartphones");
    assert.equal(query.max, 63000);
    assert.equal(query.q, undefined);
  });

  it("falls back to title keywords when a listing has no category", () => {
    const query = itemSearchQuery({
      title: "Handmade leather sofa three seater",
      categorySlug: undefined,
      price: 20000,
    });
    assert.equal(query.category, undefined);
    assert.equal(query.max, 25000);
    assert.equal(query.q, "Handmade leather sofa three");
  });
});
