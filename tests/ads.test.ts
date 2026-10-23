import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPathAllowed, adsAllowedOn, adsEnabled, getAdsConsent } from "../src/lib/ads.ts";
import { getAnalyticsConsent } from "../src/lib/consent.ts";

describe("consent defaults (no browser storage in tests)", () => {
  it("reports undecided when nothing is stored", () => {
    assert.equal(getAnalyticsConsent(), null);
    assert.equal(getAdsConsent(), null);
  });
});

describe("ads route policy", () => {
  it("stays off without a publisher ID", () => {
    assert.equal(adsEnabled(), process.env.NEXT_PUBLIC_ADSENSE_ID?.startsWith("ca-pub-") ?? false);
    assert.equal(adsAllowedOn("/"), adsEnabled());
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
