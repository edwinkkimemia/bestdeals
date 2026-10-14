import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeShopDisplay, resolveShopInfo } from "../src/lib/live-listings.ts";
import { getStore } from "../src/lib/store.ts";

const demo = {
  slug: "rift-hardware",
  name: "Rift Hardware Ltd",
  description: "Wholesale & retail building materials.",
  businessCategory: "Hardware",
  county: "Nakuru",
  town: "Nakuru Town",
  phone: "0711223344",
  logo: "https://example.com/logo.jpg",
  cover: "https://example.com/cover.jpg",
  verified: false,
  deliveryInfo: "Bulk delivery within Rift Valley.",
  hours: "Mon–Sat 8am–5:30pm",
};

describe("shop display merge (store twin wins)", () => {
  it("returns the catalogue copy when there is no twin", () => {
    assert.deepEqual(mergeShopDisplay(demo, null), demo);
  });

  it("prefers admin verification + header edits, falls back on blanks", () => {
    const merged = mergeShopDisplay(demo, {
      verified: true,
      name: "Rift Hardware Limited",
      description: "  ",
      logoUrl: "https://cdn.example.com/new-logo.jpg",
      coverUrl: null,
      phone: "0722000000",
      deliveryInfo: "",
    });
    assert.equal(merged.verified, true);
    assert.equal(merged.name, "Rift Hardware Limited");
    assert.equal(merged.description, demo.description);
    assert.equal(merged.logo, "https://cdn.example.com/new-logo.jpg");
    // Null art keeps the catalogue copy (legacy rows predate the columns) —
    // art must never vanish because the twin exists.
    assert.equal(merged.cover, demo.cover);
    assert.equal(merged.phone, "0722000000");
    assert.equal(merged.deliveryInfo, demo.deliveryInfo);
    assert.equal(merged.slug, demo.slug);
  });
});

describe("resolveShopInfo (product-page shop card)", () => {
  it("returns null for unknown slugs", async () => {
    assert.equal(await resolveShopInfo(undefined), null);
    assert.equal(await resolveShopInfo("no-such-shop-xyz"), null);
  });

  it("reflects admin verification of a catalogue shop", async () => {
    const store = getStore();
    // Catalogue copy ships unverified; no twin yet → catalogue values.
    const before = await resolveShopInfo("rift-hardware");
    assert.ok(before);
    assert.equal(before!.slug, "rift-hardware");

    // Seed twin (as prisma/seed.ts does) then verify like the admin panel.
    if (!(await store.getShopBySlug("rift-hardware"))) {
      await store.createShop({
        slug: "rift-hardware",
        name: "Rift Hardware Ltd",
        description: demo.description,
        businessCategory: demo.businessCategory,
        county: demo.county,
        town: demo.town,
        phone: demo.phone,
        logoUrl: demo.logo,
        coverUrl: demo.cover,
      });
    }
    await store.setShopVerified("rift-hardware", true);
    const after = await resolveShopInfo("rift-hardware");
    assert.ok(after);
    assert.equal(after!.verified, true);
    assert.equal(after!.name, "Rift Hardware Ltd");
    assert.equal(after!.phone, demo.phone);
  });
});
