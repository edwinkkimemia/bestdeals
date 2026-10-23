import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshDemoStore, getStore } from "../src/lib/store.ts";
import { canManageListing } from "../src/lib/gate.ts";

const listing = (ownerId: string, sellerName: string, extra: Record<string, unknown> = {}) => ({
  title: "Deletable test listing",
  description: "A listing created to test delete permissions",
  type: "product" as const,
  price: 9000,
  compareAt: null,
  condition: "new" as const,
  txMethod: "buy_online" as const,
  negotiable: false,
  stock: 1,
  county: "Nairobi",
  town: "CBD",
  images: ["https://example.com/del-a.jpg", "https://example.com/del-b.jpg"],
  attributes: {} as Record<string, string>,
  ownerId,
  sellerName,
  categorySlug: "phones-tablets",
  ...extra,
});

const user = (name: string, email: string, role: "SELLER" | "ADMIN" = "SELLER") => ({
  name, email, phone: "0712345678", role, verified: true, passwordHash: "h",
});

describe("listing delete permissions", () => {
  it("owner, admin and shop staff may manage; strangers may not", async () => {
    // canManageListing reads the global store for memberships — seed it.
    const store = getStore();
    const owner = await store.createUser(user("Owner U", "owner-del-u@x.co.ke"));
    const stranger = await store.createUser(user("Stranger U", "stranger-del-u@x.co.ke"));
    const staff = await store.createUser(user("Staff U", "staff-del-u@x.co.ke"));
    const admin = await store.createUser({ ...user("Admin U", "admin-del-u@x.co.ke"), role: "ADMIN" });
    if (!(await store.getShopBySlug("del-perm-shop"))) {
      await store.createShop({
        slug: "del-perm-shop", name: "Del Perm Shop", description: "shop", businessCategory: "Retail",
        county: "Nairobi", town: "CBD", phone: "0712345678", ownerId: owner.id,
      });
    }
    await store.addShopMember("del-perm-shop", staff.id, "staff");
    const l = await store.createListing(listing(owner.id, owner.name, { shopSlug: "del-perm-shop" }));

    assert.equal(await canManageListing({ id: owner.id, role: "SELLER" }, l), true);
    assert.equal(await canManageListing({ id: admin.id, role: "ADMIN" }, l), true);
    assert.equal(await canManageListing({ id: staff.id, role: "SELLER" }, l), true);
    assert.equal(await canManageListing({ id: stranger.id, role: "SELLER" }, l), false);
  });

  it("deleteListing removes the record entirely", async () => {
    const store = freshDemoStore();
    const owner = await store.createUser(user("Owner D", "owner-d@x.co.ke"));
    const l = await store.createListing(listing(owner.id, owner.name));
    await store.setListingStatus(l.id, "active");
    assert.ok(await store.getListing(l.id));
    await store.deleteListing(l.id);
    assert.equal(await store.getListing(l.id), null);
    assert.equal((await store.listListingsByStatus("active")).some((x) => x.id === l.id), false);
    assert.equal((await store.listListingsByOwner(owner.id)).some((x) => x.id === l.id), false);
  });
});

describe("admin shop delete", () => {
  it("deleteShop removes the storefront, listings, promotions and staff memberships", async () => {
    const store = freshDemoStore();
    const owner = await store.createUser(user("Shop Owner", "shop-owner-del@x.co.ke"));
    const staff = await store.createUser(user("Shop Staff", "shop-staff-del@x.co.ke"));
    const shop = await store.createShop({
      slug: "doomed-shop-only", name: "Doomed Shop Only", description: "shop", businessCategory: "Retail",
      county: "Nairobi", town: "CBD", phone: "0712345678", ownerId: owner.id,
    });
    await store.addShopMember(shop.slug, staff.id, "staff");
    const l = await store.createListing(listing(owner.id, owner.name, { shopSlug: shop.slug }));
    const promo = await store.createPromotion({
      listingId: l.id, ownerId: owner.id, kind: "featured", days: 7, amount: 199,
    });

    await store.deleteShop(shop.slug);

    assert.equal(await store.getShopBySlug(shop.slug), null);
    assert.equal(await store.getListing(l.id), null);
    assert.deepEqual(await store.listShopMembers(shop.slug), []);
    assert.equal(await store.getPromotion(promo.id), null);
  });
});

describe("admin user delete", () => {
  it("deleteUserAccount removes the account, listings and owned shops", async () => {
    const store = freshDemoStore();
    const doomed = await store.createUser(user("Doomed U", "doomed@x.co.ke"));
    await store.createShop({
      slug: "doomed-shop", name: "Doomed Shop", description: "shop", businessCategory: "Retail",
      county: "Nairobi", town: "CBD", phone: "0712345678", ownerId: doomed.id,
    });
    const l = await store.createListing(listing(doomed.id, doomed.name));
    assert.ok(await store.findUserById(doomed.id));
    await store.deleteUserAccount(doomed.id);
    assert.equal(await store.findUserById(doomed.id), null);
    assert.equal(await store.getListing(l.id), null);
    assert.equal(await store.getShopBySlug("doomed-shop"), null);
  });

  it("moves pre-shop listings into a new shop and deletes them with it", async () => {
    const store = freshDemoStore();
    const owner = await store.createUser(user("Shop Later", "shop-later@x.co.ke"));
    const beforeShop = await store.createListing(listing(owner.id, owner.name));
    assert.equal(beforeShop.shopSlug, undefined);
    const shop = await store.createShop({
      slug: "opened-later-shop", name: "Opened Later", description: "shop", businessCategory: "Retail",
      county: "Nairobi", town: "CBD", phone: "0712345678", ownerId: owner.id,
    });
    // A listing posted before the storefront belongs to it once created.
    assert.equal((await store.getListing(beforeShop.id))?.shopSlug, shop.slug);
    assert.ok((await store.listListingsByShop(shop.slug)).some((l) => l.id === beforeShop.id));
    await store.deleteUserAccount(owner.id);
    assert.equal(await store.getShopBySlug(shop.slug), null);
    assert.equal(await store.getListing(beforeShop.id), null);
  });
});
