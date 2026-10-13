import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  storeRecordToListing,
  publicListingPath,
  canPreviewListing,
  mergeStaticAndLive,
} from "../src/lib/live-listings.ts";
import type { ListingRecord } from "../src/lib/store.ts";

const base: ListingRecord = {
  id: "listing_abc123",
  slug: "test-product-abc123",
  title: "Test Product Long Title",
  description: "A sufficiently long description.",
  type: "product",
  status: "pending",
  price: 1000,
  compareAt: null,
  condition: "new",
  txMethod: "buy_online",
  negotiable: false,
  stock: 5,
  county: "Nairobi",
  town: "CBD",
  images: [],
  attributes: {},
  ownerId: "owner1",
  sellerName: "Amina",
  sellerPhone: "0712345678",
  shopSlug: "test-shop",
  categorySlug: "phones-tablets",
  featured: false,
  verified: true,
  createdAt: new Date().toISOString(),
};

describe("preview + share helpers", () => {
  it("maps a store record to catalogue shape with image fallback", () => {
    const l = storeRecordToListing(base);
    assert.equal(l.slug, base.slug);
    assert.equal(l.listingType, "product");
    assert.equal(l.sellerType, "business");
    assert.ok(l.images.length >= 1);
  });

  it("builds canonical public paths per type", () => {
    assert.equal(publicListingPath({ listingType: "product", slug: "a" }), "/product/a");
    assert.equal(publicListingPath({ listingType: "classified", slug: "b" }), "/classifieds/b");
    assert.equal(publicListingPath({ listingType: "service", slug: "c" }), "/services/c");
  });

  it("lets everyone see active, restricts pending to owner/admin", async () => {
    assert.equal(await canPreviewListing(null, { status: "active" }), true);
    assert.equal(await canPreviewListing(null, { status: "pending", ownerId: "owner1" }), false);
    assert.equal(
      await canPreviewListing({ id: "owner1", role: "SELLER" }, { status: "pending", ownerId: "owner1" }),
      true
    );
    assert.equal(
      await canPreviewListing({ id: "stranger", role: "SELLER" }, { status: "pending", ownerId: "owner1" }),
      false
    );
    assert.equal(
      await canPreviewListing({ id: "admin1", role: "ADMIN" }, { status: "rejected", ownerId: "owner1" }),
      true
    );
  });

  it("merges static + live without duplicates", () => {
    const l = storeRecordToListing({ ...base, status: "active" });
    const merged = mergeStaticAndLive([{ ...l, id: "static1", slug: "static-1" }], [l, { ...l, id: "static1", slug: "static-1" }]);
    assert.equal(merged.length, 2);
  });
});
