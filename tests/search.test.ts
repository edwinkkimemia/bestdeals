import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveCounty, countyMatches, townsFor } from "../src/lib/kenya.ts";
import { searchListings, suggestions, shuffleFeaturedFirst, dominantIntent } from "../src/lib/search.ts";
import { CATEGORIES } from "../src/data/catalog.ts";
import { signupSchema } from "../src/lib/validators.ts";
import { listingSchema } from "../src/lib/validators.ts";

describe("location-resolution", () => {
  it("resolves counties case-insensitively", () => {
    assert.equal(resolveCounty("nakuru"), "Nakuru");
    assert.equal(resolveCounty("  NAIROBI "), "Nairobi");
    assert.equal(resolveCounty("Uasin gishu"), "Uasin Gishu");
  });
  it("resolves towns to their county", () => {
    assert.equal(resolveCounty("Eldoret"), "Uasin Gishu");
    assert.equal(resolveCounty("thika"), "Kiambu");
    assert.equal(resolveCounty("Malindi"), "Kilifi");
  });
  it("treats all/empty/unknown as all-Kenya (never a bogus empty page)", () => {
    assert.equal(resolveCounty("all"), "all");
    assert.equal(resolveCounty("All Kenya"), "all");
    assert.equal(resolveCounty(""), "all");
    assert.equal(resolveCounty("Nakuruu"), "all");
  });
  it("matches listings case-insensitively", () => {
    assert.equal(countyMatches("Nakuru", "nakuru"), true);
    assert.equal(countyMatches("Uasin Gishu", "Eldoret"), true);
    assert.equal(countyMatches("Nairobi", "all"), true);
    assert.equal(countyMatches("Nairobi", "Nakuru"), false);
  });
  it("looks up towns case-insensitively", () => {
    assert.deepEqual(townsFor("nakuru"), townsFor("Nakuru"));
    assert.ok(townsFor("Nakuru").length > 0);
  });
});

describe("location-filtering", () => {
  it("finds Nakuru products with lowercase or town input", () => {
    const lower = searchListings({ county: "nakuru", perPage: 60 });
    const proper = searchListings({ county: "Nakuru", perPage: 60 });
    assert.ok(proper.total > 0, "seed should hold Nakuru listings");
    assert.equal(lower.total, proper.total);
    assert.ok(lower.items.every((l) => l.county === "Nakuru"));
  });
  it("finds Uasin Gishu products when typing Eldoret", () => {
    const r = searchListings({ county: "Eldoret", perPage: 60 });
    assert.ok(r.total > 0);
    assert.ok(r.items.every((l) => l.county === "Uasin Gishu"));
  });
  it("filters listings by town within a county", () => {
    const r = searchListings({ county: "Uasin Gishu", town: "Eldoret", perPage: 60 });
    assert.ok(r.total > 0, "seed should hold Eldoret listings");
    assert.ok(r.items.every((l) => l.town === "Eldoret"));
    const lower = searchListings({ county: "Uasin Gishu", town: "eldoret", perPage: 60 });
    assert.equal(lower.total, r.total);
    const none = searchListings({ county: "Uasin Gishu", town: "Thika", perPage: 60 });
    assert.equal(none.total, 0);
  });
  it("matches free-text town queries against listing towns", () => {
    const r = searchListings({ q: "Eldoret", perPage: 60 });
    assert.ok(r.items.some((l) => l.town === "Eldoret"));
  });
  it("filters listings by posting date", () => {
    const all = searchListings({ perPage: 100 });
    assert.ok(all.total > 0);
    const day = searchListings({ postedWithinHours: 24, perPage: 100 });
    assert.ok(day.total <= all.total);
    const now = Date.now();
    assert.ok(day.items.every((l) => now - +new Date(l.createdAt) <= 24 * 3600_000));
    const month = searchListings({ postedWithinHours: 720, perPage: 100 });
    assert.ok(month.total >= day.total);
  });
});

describe("dominant-cluster tiering", () => {
  it("returns null for empty or single-hit queries", () => {
    assert.equal(dominantIntent([]), null);
    assert.equal(
      dominantIntent([{ l: { categorySlug: "x", subcategory: "Y" }, s: 5 }]),
      null
    );
  });

  it("finds the majority category and subcategory", () => {
    const intent = dominantIntent([
      { l: { categorySlug: "phones-tablets", subcategory: "Smartphones" }, s: 9 },
      { l: { categorySlug: "phones-tablets", subcategory: "Smartphones" }, s: 7 },
      { l: { categorySlug: "phones-tablets", subcategory: "Accessories" }, s: 6 },
      { l: { categorySlug: "home-furniture", subcategory: "Furniture" }, s: 8 },
    ]);
    assert.deepEqual(intent, { categorySlug: "phones-tablets", subcategory: "Smartphones" });
  });

  it("leads free-text results with the query's own cluster", () => {
    const { items } = searchListings({ q: "samsung", perPage: 60 });
    assert.ok(items.length >= 2, "expected a phones cluster");
    assert.equal(items[0].categorySlug, "phones-tablets");
  });

  it("never buries the lone best hit under a bonus-only majority", () => {
    // "cement" matches one title; featured/verified bonuses (+2.5 with zero
    // text match) elect a spurious phones majority — the title hit must stay first.
    const { items } = searchListings({ q: "cement", perPage: 60 });
    assert.ok(items[0].title.toLowerCase().includes("cement"));
  });

  it("leaves price/newest sorts untouched", () => {
    const a = searchListings({ q: "cement", sort: "price_asc", perPage: 60 }).items;
    for (let i = 1; i < a.length; i++) assert.ok(a[i].price >= a[i - 1].price);
  });
});

describe("instant-suggestions", () => {
  it("suggests from the first keystroke with prefix matches first", () => {
    const one = suggestions("s");
    assert.ok(one.length > 0, "single char should already suggest");
    assert.ok(one.length <= 7);
    const samsung = suggestions("sams");
    assert.ok(samsung[0].toLowerCase().startsWith("sams"), `prefix first, got: ${samsung[0]}`);
  });
});

describe("search-by-seller-and-shop", () => {
  it("finds listings by seller or shop name", () => {
    const fonzone = searchListings({ q: "FonZone", perPage: 100 });
    assert.ok(fonzone.total > 0, "FonZone has listings");
    assert.ok(fonzone.items.every((l) => l.sellerName === "FonZone Nairobi"));

    const daniel = searchListings({ q: "Daniel", perPage: 100 });
    assert.ok(daniel.total > 0, "Daniel K. has a listing");
    assert.ok(daniel.items.every((l) => l.sellerName === "Daniel K."));
  });
  it("does not let featured/verified bonuses create phantom matches", () => {
    const r = searchListings({ q: "xx-no-such-listing-xx", perPage: 100 });
    assert.equal(r.total, 0);
  });
});

describe("seller-kind-signup", () => {
  it("defaults to individual, accepts business", () => {
    const base = { name: "Jane Doe", email: "j@x.co.ke", phone: "0712345678", password: "password1", acceptTerms: true as const };
    assert.equal(signupSchema.parse({ ...base }).sellerKind, "individual");
    assert.equal(signupSchema.parse({ ...base, sellerKind: "business" }).sellerKind, "business");
  });
  it("accepts an optional business display name", () => {
    const base = { name: "Jane Doe", email: "j@x.co.ke", phone: "0712345678", password: "password1", acceptTerms: true as const };
    assert.equal(signupSchema.parse({ ...base }).businessName, "");
    assert.equal(signupSchema.parse({ ...base, businessName: "Acme Ltd" }).businessName, "Acme Ltd");
  });
});

describe("subcategories", () => {
  const listing = {
    title: "Samsung Galaxy A15 128GB sealed",
    description: "Brand new sealed phone with warranty and receipt included.",
    categorySlug: "phones-tablets",
    price: 30000,
    condition: "new" as const,
    listingType: "product" as const,
    county: "Nairobi",
    town: "CBD",
    transactionMethod: "buy_online" as const,
  };
  it("every category ships subcategories sellers can pick", () => {
    assert.ok(CATEGORIES.length > 0);
    for (const c of CATEGORIES) {
      assert.ok(c.subcategories.length > 0, `${c.slug} needs subcategories`);
    }
  });
  it("filters listings by subcategory, case-insensitively", () => {
    const phones = searchListings({ category: "phones-tablets", subcategory: "Smartphones", perPage: 60 });
    assert.ok(phones.total > 0);
    assert.ok(phones.items.every((l) => (l.subcategory ?? "").toLowerCase() === "smartphones"));
    const lower = searchListings({ category: "phones-tablets", subcategory: "smartphones", perPage: 60 });
    assert.equal(lower.total, phones.total);
    const cars = searchListings({ category: "automotive", subcategory: "Cars", perPage: 60 });
    assert.ok(cars.items.every((l) => l.subcategory === "Cars"));
  });
  it("validates the seller subcategory against its category", () => {
    assert.equal(listingSchema.parse({ ...listing, subcategory: "Smartphones" }).subcategory, "Smartphones");
    assert.equal(listingSchema.parse({ ...listing, subcategory: "" }).subcategory, "");
    assert.throws(() => listingSchema.parse({ ...listing, subcategory: "Bananas" }), /subcategory/i);
    assert.throws(() => listingSchema.parse({ ...listing, subcategory: "Cars" }), /subcategory/i);
  });
});

describe("shuffle-featured-first", () => {
  const mk = (n: number, featured: boolean) =>
    Array.from({ length: n }, (_, i) => ({ id: `${featured ? "f" : "p"}${i}`, featured }));
  it("leads with featured, keeps every item, ignores the stored order", () => {
    const items = [...mk(12, false), ...mk(3, true)];
    const out = shuffleFeaturedFirst(items);
    assert.equal(out.length, items.length);
    assert.deepEqual(new Set(out.map((l) => l.id)), new Set(items.map((l) => l.id)));
    assert.ok(out.slice(0, 3).every((l) => l.featured), "first three must be the featured ones");
    assert.ok(out.slice(3).every((l) => !l.featured));
  });
  it("mixes order across calls and never mutates the input", () => {
    const items = mk(20, false);
    const before = items.map((l) => l.id).join(",");
    const seen = new Set([shuffleFeaturedFirst(items).map((l) => l.id).join(",")]);
    for (let i = 0; i < 10; i++) seen.add(shuffleFeaturedFirst(items).map((l) => l.id).join(","));
    assert.ok(seen.size > 1, "repeated shuffles should vary");
    assert.equal(items.map((l) => l.id).join(","), before);
  });
  it("handles empty and all-featured lists", () => {
    assert.deepEqual(shuffleFeaturedFirst([]), []);
    assert.equal(shuffleFeaturedFirst(mk(5, true)).length, 5);
  });
});
