import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshDemoStore } from "../src/lib/store.ts";
import { referralLink, referralCode, resolveReferrer, qualifyReferralsFor } from "../src/lib/referrals.ts";

async function seller(store: ReturnType<typeof freshDemoStore>, email: string, activeListing = false) {
  const u = await store.createUser({ name: "Seller", email, phone: "0712345678", role: "SELLER", verified: false, passwordHash: "h" });
  let listingId: string | undefined;
  if (activeListing) {
    const l = await store.createListing({
      title: "Test phone for growth loops", description: "A phone used to test referral rewards end to end",
      type: "product", price: 10000, compareAt: null, condition: "new", txMethod: "buy_online",
      negotiable: false, stock: 2, county: "Nairobi", town: "CBD", images: [], attributes: {},
      ownerId: u.id, sellerName: u.name,
    });
    await store.setListingStatus(l.id, "active");
    listingId = l.id;
  }
  return { u, listingId };
}

describe("referrals", () => {
  it("builds opaque invite links (not enumerable user ids)", () => {
    const link = referralLink("u_abc123", "https://chap.co.ke");
    assert.ok(link.startsWith("https://chap.co.ke/auth/signup?ref="));
    assert.ok(!link.includes("u_abc123"), "code must be opaque");
    assert.equal(link, `https://chap.co.ke/auth/signup?ref=${referralCode("u_abc123")}`);
  });
  it("resolves opaque codes and legacy ids", async () => {
    const store = freshDemoStore();
    const { u: a } = await seller(store, "rcode@x.co.ke");
    assert.equal(await resolveReferrer(referralCode(a.id), store), a.id);
    assert.equal(await resolveReferrer(a.id, store), a.id);
    assert.equal(await resolveReferrer("nope", store), null);
  });
  it("attributes signups, refuses self-referrals and duplicates", async () => {
    const store = freshDemoStore();
    const { u: a } = await seller(store, "a@x.co.ke");
    const { u: b } = await seller(store, "b@x.co.ke");
    const r = await store.createReferral({ referrerUserId: a.id, referredUserId: b.id });
    assert.equal(r.status, "pending");
    assert.equal((await store.createReferral({ referrerUserId: a.id, referredUserId: b.id })).id, r.id);
    await assert.rejects(store.createReferral({ referrerUserId: a.id, referredUserId: a.id }), /Self-referral/);
    assert.equal((await store.findReferralByReferred(b.id))?.referrerUserId, a.id);
    assert.equal((await store.listReferralsByReferrer(a.id)).length, 1);
  });
  it("rewards verification with a free featured boost", async () => {
    const store = freshDemoStore();
    const { u: referrer } = await seller(store, "ref@x.co.ke", true);
    const { u: friend } = await seller(store, "friend@x.co.ke");
    await store.createReferral({ referrerUserId: referrer.id, referredUserId: friend.id });
    // Not verified yet → nothing happens.
    assert.equal(await qualifyReferralsFor(friend.id, store), null);
    await store.setUserVerified(friend.id, true);
    const before = Date.now();
    const res = await qualifyReferralsFor(friend.id, store);
    assert.equal(res?.qualified, true);
    assert.ok(res?.rewardPromoId);
    const promo = await store.getPromotion(res!.rewardPromoId!);
    assert.equal(promo?.status, "active");
    assert.equal(promo?.amount, 0);
    assert.ok(new Date(promo!.endsAt).getTime() > before);
    const listings = await store.listListingsByOwner(referrer.id);
    assert.equal(listings[0].featured, true);
    assert.equal((await store.findReferralByReferred(friend.id))?.status, "rewarded");
    // Second run is a no-op.
    assert.equal(await qualifyReferralsFor(friend.id, store), null);
  });
  it("qualifies without a boost when the referrer has nothing live", async () => {
    const store = freshDemoStore();
    const { u: referrer } = await seller(store, "ref2@x.co.ke");
    const { u: friend } = await seller(store, "friend2@x.co.ke");
    await store.createReferral({ referrerUserId: referrer.id, referredUserId: friend.id });
    await store.setUserVerified(friend.id, true);
    const res = await qualifyReferralsFor(friend.id, store);
    assert.equal(res?.qualified, true);
    assert.equal(res?.rewardPromoId, undefined);
    assert.equal((await store.findReferralByReferred(friend.id))?.status, "qualified");
  });
});
