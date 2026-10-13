import { describe, it } from "node:test";
import assert from "node:assert/strict";

delete process.env.DATABASE_URL;

import { validateMpesaCallback, resolveMpesaOrderId } from "../src/lib/payments.ts";
import { priceHint, nicheScore, priceTrends } from "../src/lib/insights.ts";
import { rankDeterministic, shuffleSeeded } from "../src/lib/search.ts";
import { getBalance, creditWallet, debitWallet } from "../src/lib/wallet.ts";
import { getDeliveryFees } from "../src/lib/delivery.ts";
import { referralCode } from "../src/lib/referrals.ts";
import { freshDemoStore, getStore } from "../src/lib/store.ts";

describe("mpesa callback mapping", () => {
  it("rejects malformed payloads, parses success with both ids", () => {
    assert.equal(validateMpesaCallback(null).valid, false);
    const v = validateMpesaCallback({
      Body: {
        stkCallback: {
          ResultCode: 0,
          MerchantRequestID: "M123",
          CheckoutRequestID: "C123",
          CallbackMetadata: { Item: [{ Name: "Amount", Value: 500 }, { Name: "MpesaReceiptNumber", Value: "R1" }] },
        },
      },
    });
    assert.equal(v.valid, true);
    assert.equal(v.providerRef, "R1");
    assert.equal(v.orderRef, "C123");
    assert.equal(v.amount, 500);
  });
  it("resolves stored Daraja mapping (empty when unknown)", async () => {
    const r = await resolveMpesaOrderId("nope-xyz");
    assert.equal(r.orderId, undefined);
  });
});

describe("wallet", () => {
  it("credits and debits with insufficient guard", async () => {
    const uid = `w_${Math.random().toString(36).slice(2, 8)}`;
    assert.equal(await getBalance(uid), 0);
    await creditWallet(uid, 1000, "topup-demo");
    assert.equal(await getBalance(uid), 1000);
    const ok = await debitWallet(uid, 300, "boost");
    assert.equal(ok.ok, true);
    assert.equal(ok.balance, 700);
    const no = await debitWallet(uid, 9999, "boost");
    assert.equal(no.ok, false);
  });
});

describe("delivery fees", () => {
  it("returns defaults without admin override", async () => {
    const f = await getDeliveryFees();
    assert.equal(f.standard, 250);
    assert.equal(f.pickup, 0);
  });
});

describe("pricing intel (jiji-style)", () => {
  it("hints great/fair/high with median", () => {
    const h = priceHint("phones-tablets", 1000);
    assert.ok(["great", "fair", "high"].includes(h.verdict));
  });
  it("trends return min/median/max", () => {
    const t = priceTrends("phones-tablets");
    if (t) assert.ok(t.min <= t.median && t.median <= t.max);
  });
  it("niche scores 0-10", () => {
    const n = nicheScore("iphone", 3, 80);
    assert.ok(n.score >= 0 && n.score <= 10);
  });
});

describe("deterministic ranking", () => {
  it("TOP pins lead, stable across calls", () => {
    const items = [
      { id: "a", featured: false, topPinned: false, createdAt: new Date().toISOString() },
      { id: "b", featured: true, topPinned: false, createdAt: new Date().toISOString() },
      { id: "c", featured: false, topPinned: true, createdAt: new Date().toISOString() },
    ];
    const r1 = rankDeterministic(items).map((x) => x.id);
    const r2 = rankDeterministic(items).map((x) => x.id);
    assert.deepEqual(r1, r2);
    assert.equal(r1[0], "c");
  });
  it("seeded shuffle is stable", () => {
    const a = shuffleSeeded([1, 2, 3, 4, 5], 7);
    const b = shuffleSeeded([1, 2, 3, 4, 5], 7);
    assert.deepEqual(a, b);
  });
});

describe("referral codes opaque", () => {
  it("codes are 12-hex and stable", () => {
    const c1 = referralCode("u1");
    const c2 = referralCode("u1");
    assert.equal(c1, c2);
    assert.equal(c1.length, 12);
  });
});

describe("store renew cooldown key", () => {
  it("persists renew stamp via settings", async () => {
    const s = freshDemoStore();
    await s.setSetting("renew:xyz", { at: new Date().toISOString() });
    const v = (await s.getSetting("renew:xyz")) as { at: string };
    assert.ok(v.at);
    void getStore;
  });
});
