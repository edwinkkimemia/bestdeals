import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ADSENSE_CLIENT_ID, isPathAllowed, adsAllowedOn, adsEnabled, getAdsConsent } from "../src/lib/ads.ts";
import { getAnalyticsConsent } from "../src/lib/consent.ts";

describe("consent defaults (no browser storage in tests)", () => {
  it("reports undecided when nothing is stored", () => {
    assert.equal(getAnalyticsConsent(), null);
    assert.equal(getAdsConsent(), null);
  });
});

describe("ads route policy", () => {
  it("uses the configured publisher ID (with a production default)", () => {
    assert.equal(ADSENSE_CLIENT_ID, process.env.NEXT_PUBLIC_ADSENSE_ID || "ca-pub-1165378217849279");
    assert.equal(adsEnabled(), true);
    assert.equal(adsAllowedOn("/"), true);
  });
  it("blocks transactional and account pages, allows browse content", () => {
    for (const p of [
      "/checkout",
      "/checkout?x=1",
      "/cart",
      "/dashboard",
      "/dashboard/plan",
      "/admin/shops",
      "/auth/signin",
      "/orders/abc",
      "/wishlist",
      "/sell",
      "/pricing",
      "/advertising",
      "/CHECKOUT",
    ]) {
      assert.equal(isPathAllowed(p), false, `expected no ads on ${p}`);
    }
    for (const p of ["/", "/browse", "/browse/phones-tablets", "/search?q=x", "/product/a", "/blog", "/blog/a", "/shops", "/shops/a", "/location/nairobi", "/deals"]) {
      assert.equal(isPathAllowed(p), true, `expected ads on ${p}`);
    }
  });
});
