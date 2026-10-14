import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LISTINGS } from "../src/data/catalog.ts";
import { countyMatches } from "../src/lib/kenya.ts";
import { getLiveStoreListings, mergeStaticAndLive } from "../src/lib/live-listings.ts";
import { getStore } from "../src/lib/store.ts";

/**
 * /location/[county] data path: admin-approved seller listings (store
 * `active`) merged with the static catalogue, then county-filtered. New
 * shops/sellers must surface here with ALL their images (the gallery
 * depends on it) — previously the county page was statically prerendered
 * (frozen at build time) and Prisma list queries truncated images to 1.
 */
describe("location pages include live seller listings", () => {
  it("shows a new shop product in its county with all images", async () => {
    const store = getStore();
    const slug = "loc-live-shop-nakuru";
    if (!(await store.getShopBySlug(slug))) {
      await store.createShop({
        slug,
        name: "Loc Live Shop",
        description: "A new shop for location tests",
        businessCategory: "Retail",
        county: "Nakuru",
        town: "Nakuru Town",
        phone: "0711223344",
      });
    }
    const urls = [
      "https://example.com/loc-a.jpg",
      "https://example.com/loc-b.jpg",
      "https://example.com/loc-c.jpg",
    ];
    const rec = await store.createListing({
      title: "Loc Live Test Product Nakuru Unique",
      description: "A product posted by a new shop that must appear on /location/nakuru",
      type: "product",
      price: 5000,
      compareAt: null,
      condition: "new",
      txMethod: "buy_online",
      negotiable: false,
      stock: 3,
      county: "Nakuru",
      town: "Nakuru Town",
      images: urls,
      attributes: {},
      sellerName: "Loc Live Shop",
      categorySlug: "phones-tablets",
      shopSlug: slug,
    });
    await store.setListingStatus(rec.id, "active");

    const live = await getLiveStoreListings();
    const mine = live.find((l) => l.id === rec.id);
    assert.ok(mine, "approved seller listing is in the live set");
    assert.deepEqual(mine!.images, urls);
    assert.equal(mine!.shopSlug, slug);

    const all = mergeStaticAndLive(LISTINGS, live);
    const inCounty = all.filter((l) => countyMatches(l.county, "Nakuru"));
    assert.ok(
      inCounty.some((l) => l.id === rec.id),
      "new shop product passes the county filter"
    );
    assert.ok(
      !all.filter((l) => countyMatches(l.county, "Mombasa")).some((l) => l.id === rec.id),
      "it does not leak into other counties"
    );
  });
});
