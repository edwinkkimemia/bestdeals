import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Force the in-memory backend (no DATABASE_URL in test env).
delete process.env.DATABASE_URL;
import {
  aggregateDaily,
  summarizeListing,
  topReferrers,
  referrerSource,
  isBotUserAgent,
  dayKey,
  lastNDates,
  recordListingView,
  getListingsStats,
  getPlatformAnalytics,
  getListingViewCount,
  resetAnalyticsMemory,
  type ViewEvent,
} from "../src/lib/analytics.ts";
import { avgRatingOf, ratingLabel } from "../src/lib/ratings.ts";

const NOW = new Date("2026-10-11T12:00:00Z").getTime();

function evt(partial: Partial<ViewEvent> & { listingId: string; createdAt: string }): ViewEvent {
  return { id: `v-${Math.random().toString(36).slice(2)}`, ...partial };
}

describe("analytics helpers", () => {
  it("buckets days in UTC and counts uniques per visitor", () => {
    const events: ViewEvent[] = [
      evt({ listingId: "p1", createdAt: "2026-10-11T08:00:00Z", sessionId: "s1" }),
      evt({ listingId: "p1", createdAt: "2026-10-11T09:00:00Z", sessionId: "s1" }),
      evt({ listingId: "p1", createdAt: "2026-10-10T08:00:00Z", sessionId: "s2" }),
      evt({ listingId: "p1", createdAt: "2026-09-01T08:00:00Z", sessionId: "s3" }), // outside 7d
    ];
    const daily = aggregateDaily(events, 7, NOW);
    assert.equal(daily.length, 7);
    assert.equal(daily[daily.length - 1].date, "2026-10-11");
    assert.equal(daily[daily.length - 1].views, 2);
    assert.equal(daily[daily.length - 1].uniques, 1);
    assert.equal(daily[daily.length - 2].views, 1);
    assert.equal(dayKey(new Date("2026-10-11T23:59:59Z")), "2026-10-11");
    assert.equal(lastNDates(3, NOW).join(","), "2026-10-09,2026-10-10,2026-10-11");
  });

  it("prefers viewerId over sessionId for identity", () => {
    const events: ViewEvent[] = [
      evt({ listingId: "p1", createdAt: "2026-10-11T08:00:00Z", viewerId: "u1", sessionId: "s1" }),
      evt({ listingId: "p1", createdAt: "2026-10-11T09:00:00Z", viewerId: "u1", sessionId: "s2" }),
    ];
    const s = summarizeListing(events, "p1", 7, NOW);
    assert.equal(s.views, 2);
    assert.equal(s.uniques, 1);
    assert.equal(s.views7, 2);
  });

  it("labels referrer sources and ranks them", () => {
    assert.equal(referrerSource(undefined), "Direct");
    assert.equal(referrerSource("https://www.google.com/search?q=x"), "Google");
    assert.equal(referrerSource("https://chap.co.ke/product/y"), "Chap browse");
    assert.equal(referrerSource("https://facebook.com/z"), "Facebook");
    assert.equal(referrerSource("not a url"), "Direct");
    const events: ViewEvent[] = [
      evt({ listingId: "p1", createdAt: "2026-10-11T08:00:00Z", referrer: "https://www.google.com/" }),
      evt({ listingId: "p1", createdAt: "2026-10-11T08:00:00Z", referrer: "https://www.google.com/" }),
      evt({ listingId: "p1", createdAt: "2026-10-11T08:00:00Z" }),
    ];
    assert.deepEqual(topReferrers(events, 5), [
      { source: "Google", count: 2 },
      { source: "Direct", count: 1 },
    ]);
  });

  it("detects bots, ignores humans", () => {
    assert.equal(isBotUserAgent("Googlebot/2.1"), true);
    assert.equal(isBotUserAgent("facebookexternalhit/1.1"), true);
    assert.equal(
      isBotUserAgent("Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"),
      false
    );
    assert.equal(isBotUserAgent(null), false);
  });
});

describe("analytics recording (in-memory)", () => {
  it("dedupes same visitor + listing inside 30 min", async () => {
    resetAnalyticsMemory();
    const first = await recordListingView({ listingId: "p1", sessionId: "sess-a" });
    assert.equal(first.deduped, false);
    const second = await recordListingView({ listingId: "p1", sessionId: "sess-a" });
    assert.equal(second.deduped, true);
    const other = await recordListingView({ listingId: "p2", sessionId: "sess-a" });
    assert.equal(other.deduped, false);
    const counts = await getListingViewCount("p1");
    assert.equal(counts.views, 1);
    assert.equal(counts.uniques, 1);
  });

  it("rolls up seller and platform stats", async () => {
    resetAnalyticsMemory();
    await recordListingView({ listingId: "p1", sessionId: "s1" });
    await recordListingView({ listingId: "p1", sessionId: "s2" });
    await recordListingView({ listingId: "p2", sessionId: "s1" });

    const seller = await getListingsStats(["p1", "p2"], 30);
    assert.equal(seller.totalViews, 3);
    assert.equal(seller.uniqueViewers, 2);
    assert.equal(seller.perListing.find((p) => p.listingId === "p1")?.views, 2);
    assert.equal(seller.daily.length, 30);

    const platform = await getPlatformAnalytics(30, 10);
    assert.equal(platform.totalViews, 3);
    assert.equal(platform.viewedListings, 2);
    assert.equal(platform.topListings[0].listingId, "p1");
    assert.equal(platform.topListings[0].views, 2);
  });

  it("ignores empty listing ids", async () => {
    resetAnalyticsMemory();
    assert.deepEqual(await recordListingView({ listingId: "" }), { deduped: true });
    assert.deepEqual(await getListingViewCount("missing"), { views: 0, uniques: 0 });
  });
});

describe("shop ratings (real reviews only)", () => {
  it("averages approved reviews, never invents a score", () => {
    assert.equal(avgRatingOf([]), null);
    assert.equal(ratingLabel([]), "No reviews yet");
    assert.deepEqual(avgRatingOf([{ rating: 5 }, { rating: 4 }, { rating: 5 }]), { avg: 4.7, count: 3 });
    assert.equal(ratingLabel([{ rating: 5 }, { rating: 4 }, { rating: 5 }]), "★ 4.7 (3)");
    assert.equal(ratingLabel([{ rating: 3 }]), "★ 3.0 (1)");
  });
});
