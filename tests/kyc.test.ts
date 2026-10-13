import { describe, it } from "node:test";
import assert from "node:assert/strict";

delete process.env.DATABASE_URL;

import { freshDemoStore } from "../src/lib/store.ts";
import { applyVerificationApproval } from "../src/lib/kyc.ts";

const uid = () => Math.random().toString(36).slice(2, 9);

async function setup(kind: "id" | "business") {
  const s = freshDemoStore();
  const tag = uid();
  const user = await s.createUser({
    name: `Kyc ${tag}`, email: `kyc-${tag}@x.co.ke`, phone: "0712345678",
    role: "SELLER", verified: false, passwordHash: "h",
  });
  const shop = await s.createShop({
    slug: `kyc-shop-${tag}`, name: "Kyc Shop", description: "A shop awaiting business KYC.",
    businessCategory: "General retail", county: "Nairobi", town: "CBD",
    phone: "0712345678", ownerId: user.id,
  });
  const v = await s.createVerification({
    userId: user.id, kind, phone: "0712345678",
    docPath: "private:2026/id.png", fileName: "id.png",
  });
  return { s, user, shop, v };
}

describe("kyc decisions", () => {
  it("records who decided and when (audit trail)", async () => {
    const { s, v } = await setup("id");
    await s.decideVerification(v.id, true, "admin1");
    const done = (await s.listVerifications()).find((x) => x.id === v.id)!;
    assert.equal(done.status, "approved");
    assert.equal(done.decidedBy, "admin1");
    assert.ok(done.decidedAt, "decidedAt should be set");
  });

  it("id approval verifies the user AND their shops (unified KYC loop)", async () => {
    const { s, user, shop, v } = await setup("id");
    const out = await applyVerificationApproval(s, v.id, "admin1");
    assert.equal(out?.status, "approved");
    assert.equal((await s.findUserById(user.id))?.verified, true);
    assert.equal((await s.getShopBySlug(shop.slug))?.verified, true);
  });

  it("business approval verifies the user AND their shops", async () => {
    const { s, user, shop, v } = await setup("business");
    await applyVerificationApproval(s, v.id, "admin1");
    assert.equal((await s.findUserById(user.id))?.verified, true);
    assert.equal((await s.getShopBySlug(shop.slug))?.verified, true);
  });

  it("returns null for unknown verification ids", async () => {
    const { s } = await setup("id");
    assert.equal(await applyVerificationApproval(s, "nope", "admin1"), null);
  });
});
