import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KENYA_COUNTIES } from "../src/lib/kenya.ts";
import { COUNTY_CENTROIDS, nearestCounty } from "../src/lib/kenya-geo.ts";

describe("county geolocation", () => {
  it("covers every county exactly once", () => {
    assert.equal(COUNTY_CENTROIDS.length, KENYA_COUNTIES.length);
    const names = new Set(COUNTY_CENTROIDS.map((c) => c.county));
    assert.equal(names.size, COUNTY_CENTROIDS.length);
    for (const county of KENYA_COUNTIES) assert.ok(names.has(county.county), `${county.county} missing`);
  });

  it("resolves known coordinates to the nearest county", () => {
    assert.equal(nearestCounty(-1.2864, 36.8172), "Nairobi");
    assert.equal(nearestCounty(-4.0435, 39.6682), "Mombasa");
    assert.equal(nearestCounty(-0.0917, 34.768), "Kisumu");
    assert.equal(nearestCounty(Number.NaN, 36), null);
  });
});
