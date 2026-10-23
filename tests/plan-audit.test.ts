import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { expectedPlanForCount, auditPlanRows } from "../src/lib/plans.ts";
import { freshDemoStore } from "../src/lib/store.ts";

describe("expectedPlanForCount", () => {
  it("maps counts to tiers (5 free, 6–30 silver, 31+ gold)", () => {
    assert.equal(expectedPlanForCount(0), "free");
    assert.equal(expectedPlanForCount(5), "free");
    assert.equal(expectedPlanForCount(6), "silver");
    assert.equal(expectedPlanForCount(30), "silver");
    assert.equal(expectedPlanForCount(31), "gold");
    assert.equal(expectedPlanForCount(200), "gold");
  });
});

describe("auditPlanRows", () => {
  it("flags under-planned accounts with the right target", () => {
    const rows = auditPlanRows(
      [
        { id: "u1", name: "Small Seller", email: "s@x.ke", planId: null },
        { id: "u2", name: "Big Seller", email: "b@x.ke", planId: "free" },
        { id: "u3", name: "Shop Owner", email: "o@x.ke", planId: null },
      ],
      [{ slug: "big-shop", name: "Big Shop", ownerId: "u3", planId: "silver" }],
      [
        { ownerId: "u1", count: 3 },
        { ownerId: "u2", count: 40 },
        { ownerId: "u3", count: 12 },
      ]
    );
    const [small, big, owner] = rows;
    assert.equal(small.needsUpgrade, false);
    assert.equal(small.expectedPlan, "free");
    assert.equal(big.needsUpgrade, true);
    assert.equal(big.expectedPlan, "gold");
    assert.deepEqual(big.target, { kind: "personal" });
    // Shop owner: effective silver (shop), expected silver → fits.
    assert.equal(owner.effectivePlan, "silver");
    assert.equal(owner.needsUpgrade, false);
    assert.deepEqual(owner.target, { kind: "shop", slug: "big-shop", name: "Big Shop" });
  });

  it("uses the shop plan, not a dormant personal plan, for shop owners", () => {
    const [row] = auditPlanRows(
      [{ id: "u4", name: "Shop Gold Personal", email: "gp@x.ke", planId: "gold" }],
      [{ slug: "silver-shop", name: "Silver Shop", ownerId: "u4", planId: "silver" }],
      [{ ownerId: "u4", count: 10 }]
    );
    assert.equal(row.effectivePlan, "silver");
    assert.equal(row.needsUpgrade, false);
  });

  it("never recommends downgrades", () => {
    const [row] = auditPlanRows(
      [{ id: "u9", name: "Quiet Gold", email: "q@x.ke", planId: "gold" }],
      [],
      [{ ownerId: "u9", count: 2 }]
    );
    assert.equal(row.effectivePlan, "gold");
    assert.equal(row.expectedPlan, "free");
    assert.equal(row.needsUpgrade, false);
  });
});

describe("countLiveListingsByOwner", () => {
  it("counts live slots per owner, skipping rejected/sold/expired", async () => {
    const store = freshDemoStore();
    const u = await store.createUser({
      name: "Counter", email: "counter@x.ke", phone: "0712345678",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    const mk = (status: string) =>
      store.createListing({
        title: `Counter ${status} item`, description: "01234567890123456789",
        type: "product", price: 100, compareAt: null, condition: "new",
        txMethod: "buy_online", negotiable: false, stock: 1,
        county: "Nairobi", town: "CBD", images: [], attributes: {},
        ownerId: u.id, sellerName: u.name, categorySlug: "other",
      }).then(async (l) => {
        await store.setListingStatus(l.id, status);
        return l;
      });
    await mk("active");
    await mk("pending");
    await mk("rejected");
    await mk("sold");
    await mk("expired");
    await mk("hidden");
    const counts = await store.countLiveListingsByOwner();
    assert.deepEqual(counts, [{ ownerId: u.id, count: 3 }]);
  });
});
