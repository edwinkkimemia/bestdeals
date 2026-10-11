import { describe, it } from "node:test";
import assert from "node:assert/strict";

delete process.env.DATABASE_URL;

import {
  normalizePlan,
  PLAN_LISTING_LIMITS,
  PLAN_ANALYTICS_DAYS,
  planAllowsListings,
  getSellerPlan,
  countLiveListings,
  limitMessage,
  goldRequiredMessage,
} from "../src/lib/plans.ts";
import { parseCSV } from "../src/lib/csv.ts";
import { getStore } from "../src/lib/store.ts";
import { resetAnalyticsMemory, recordListingView, getSellerAnalyticsReport } from "../src/lib/analytics.ts";

const uid = () => Math.random().toString(36).slice(2, 9);

async function makeSeller() {
  const tag = uid();
  return getStore().createUser({
    name: `Seller ${tag}`,
    email: `seller-${tag}@x.co.ke`,
    phone: "0712345678",
    role: "SELLER",
    verified: true,
    passwordHash: "h",
  });
}

describe("plan rules", () => {
  it("normalises unknown plans to free", () => {
    assert.equal(normalizePlan("gold"), "gold");
    assert.equal(normalizePlan("GOLD"), "gold");
    assert.equal(normalizePlan("platinum"), "free");
    assert.equal(normalizePlan(undefined), "free");
  });
  it("caps listings per plan (gold unlimited)", () => {
    assert.equal(PLAN_LISTING_LIMITS.free, 5);
    assert.equal(PLAN_LISTING_LIMITS.silver, 30);
    assert.equal(PLAN_LISTING_LIMITS.gold, Infinity);
    assert.equal(planAllowsListings("free", 4), true);
    assert.equal(planAllowsListings("free", 5), false);
    assert.equal(planAllowsListings("silver", 29), true);
    assert.equal(planAllowsListings("silver", 30), false);
    assert.equal(planAllowsListings("gold", 100000), true);
  });
  it("tiers analytics history by plan", () => {
    assert.deepEqual(PLAN_ANALYTICS_DAYS, { free: 7, silver: 30, gold: 90 });
    assert.ok(limitMessage("free", 5).includes("5"));
    assert.ok(goldRequiredMessage("Bulk CSV upload").includes("Gold"));
  });
});

describe("seller plan resolution", () => {
  it("defaults to free without a shop, follows the best shop plan", async () => {
    const u = await makeSeller();
    assert.deepEqual(await getSellerPlan(u.id), { planId: "free" });
    const shop = await getStore().createShop({
      slug: `shop-${uid()}`, name: "Test Shop", description: "A test shop for plan checks.",
      businessCategory: "General retail", county: "Nairobi", town: "CBD",
      phone: "0712345678", ownerId: u.id,
    });
    assert.equal((await getSellerPlan(u.id)).planId, "free");
    await getStore().setShopPlan(shop.slug, "gold");
    const gold = await getSellerPlan(u.id);
    assert.equal(gold.planId, "gold");
    assert.equal(gold.shopSlug, shop.slug);
  });
  it("counts live listings excluding terminal states", async () => {
    const u = await makeSeller();
    const base = {
      title: "Plan test product row", description: "A sufficiently long description for validation.",
      type: "product" as const, price: 1000, condition: "new" as const, txMethod: "buy_online" as const,
      negotiable: false, stock: 1, county: "Nairobi", town: "CBD", images: [] as string[],
      attributes: {}, ownerId: u.id, sellerName: u.name,
    };
    assert.equal(await countLiveListings(u.id), 0);
    const a = await getStore().createListing(base);
    const b = await getStore().createListing({ ...base, title: "Plan test product row two" });
    assert.equal(await countLiveListings(u.id), 2);
    await getStore().setListingStatus(a.id, "sold");
    assert.equal(await countLiveListings(u.id), 1);
    await getStore().setListingStatus(b.id, "rejected");
    assert.equal(await countLiveListings(u.id), 0);
  });
});

describe("staff members", () => {
  it("adds, lists and removes shop staff", async () => {
    const owner = await makeSeller();
    const staff = await makeSeller();
    const shop = await getStore().createShop({
      slug: `staff-${uid()}`, name: "Staff Shop", description: "Shop for staff membership checks.",
      businessCategory: "General retail", county: "Nakuru", town: "Nakuru Town",
      phone: "0712345678", ownerId: owner.id,
    });
    const owners = await getStore().listShopMembers(shop.slug);
    assert.ok(owners.some((m) => m.userId === owner.id && m.role === "owner"));
    const added = await getStore().addShopMember(shop.slug, staff.id, "staff");
    assert.equal(added.role, "staff");
    assert.equal(added.name, staff.name);
    const staffShops = await getStore().listStaffShops(staff.id);
    assert.ok(staffShops.some((s) => s.slug === shop.slug));
    await getStore().removeShopMember(shop.slug, staff.id);
    assert.deepEqual(
      (await getStore().listShopMembers(shop.slug)).filter((m) => m.userId === staff.id),
      []
    );
    const owned = await getStore().listShopsByOwner(owner.id);
    assert.ok(owned.some((s) => s.slug === shop.slug));
  });
});

describe("csv parser", () => {
  it("handles quotes, commas and CRLF", () => {
    const rows = parseCSV('title,price\r\n"Phone, sealed",52999\r\nCement,780\r\n');
    assert.deepEqual(rows, [
      ["title", "price"],
      ["Phone, sealed", "52999"],
      ["Cement", "780"],
    ]);
    const esc = parseCSV('a,b\n"He said ""hi""",2\n');
    assert.deepEqual(esc[1], ['He said "hi"', "2"]);
    assert.deepEqual(parseCSV("   \n"), []);
  });
});

describe("analytics plan caps", () => {
  it("clamps history to the plan maximum", async () => {
    resetAnalyticsMemory();
    const u = await makeSeller();
    await recordListingView({ listingId: "gold-p1", sessionId: "s1" });
    const free = await getSellerAnalyticsReport({ id: u.id, name: u.name }, 90, 7);
    assert.equal(free.rangeDays, 7);
    assert.equal(free.daily.length, 7);
    const gold = await getSellerAnalyticsReport({ id: u.id, name: u.name }, 90, 90);
    assert.equal(gold.rangeDays, 90);
    resetAnalyticsMemory();
  });
});
