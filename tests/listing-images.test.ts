import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isAllowedListingImage, normalizeListingImages, parseImageLinks } from "../src/lib/image-urls.ts";
import { storeRecordToListing } from "../src/lib/live-listings.ts";

describe("listing image URLs", () => {
  it("allows https, /uploads/ and /api/files/ sources", () => {
    assert.equal(isAllowedListingImage("https://example.com/a.jpg"), true);
    assert.equal(isAllowedListingImage("/uploads/2026-10/a.jpg"), true);
    assert.equal(isAllowedListingImage("/api/files/2026-10/a.jpg"), true);
    assert.equal(isAllowedListingImage("/tmp/evil.jpg"), false);
    assert.equal(isAllowedListingImage("http://example.com/a.jpg"), false);
    assert.equal(isAllowedListingImage("data:image/png;base64,xx"), false);
    assert.equal(isAllowedListingImage(""), false);
  });

  it("keeps serverless upload URLs instead of stripping them", () => {
    assert.deepEqual(
      normalizeListingImages(["/api/files/2026-10/a.jpg", "/uploads/2026-10/b.jpg", "https://x/y.jpg", "/tmp/z.jpg"]),
      ["/api/files/2026-10/a.jpg", "/uploads/2026-10/b.jpg", "https://x/y.jpg"]
    );
    assert.equal(normalizeListingImages("nope").length, 0);
    assert.equal(normalizeListingImages(new Array(10).fill("https://x/y.jpg")).length, 8);
  });

  it("parses the comma-separated links box", () => {
    assert.deepEqual(
      parseImageLinks("https://a/x.jpg, /api/files/2026-10/b.jpg\n/not-allowed.jpg"),
      ["https://a/x.jpg", "/api/files/2026-10/b.jpg"]
    );
  });

  it("carries ownerId through for avatar lookup", () => {
    const l = storeRecordToListing({
      id: "listing_x",
      slug: "slug-x",
      title: "T",
      description: "D",
      type: "product",
      status: "active",
      price: 1,
      compareAt: null,
      condition: "new",
      txMethod: "buy_online",
      negotiable: false,
      stock: 1,
      county: "Nairobi",
      town: "CBD",
      images: [],
      attributes: {},
      ownerId: "owner-9",
      sellerName: "Renamed Seller",
    });
    assert.equal(l.ownerId, "owner-9");
    assert.deepEqual(l.images, ["/chaplogo.png"]);
  });
});
