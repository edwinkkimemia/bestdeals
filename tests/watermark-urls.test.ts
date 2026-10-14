import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { wmImageSrc } from "../src/lib/watermark.ts";
import { isAllowedListingImage, normalizeListingImages } from "../src/lib/image-urls.ts";

describe("watermark URL coverage", () => {
  it("routes every stored upload form through the watermark endpoint", () => {
    for (const src of [
      "/uploads/2026-10/a.jpg",
      "/api/files/2026-10/a.jpg",
      "/api/files/db/2026-10/a.jpg",
      "https://example.com/a.jpg",
    ]) {
      assert.ok(
        wmImageSrc(src).startsWith("/api/images/download?src="),
        `${src} should be watermarked`
      );
    }
  });

  it("keeps DB-fallback image URLs instead of stripping them", () => {
    assert.deepEqual(
      normalizeListingImages([
        "/api/files/db/2026-10/a.jpg",
        "/api/files/2026-10/b.jpg",
        "/uploads/2026-10/c.jpg",
        "https://x/y.jpg",
        "/tmp/z.jpg",
      ]),
      [
        "/api/files/db/2026-10/a.jpg",
        "/api/files/2026-10/b.jpg",
        "/uploads/2026-10/c.jpg",
        "https://x/y.jpg",
      ]
    );
  });

  it("still passes brand assets and data URIs through unwatermarked", () => {
    assert.equal(wmImageSrc("/chaplogo.png"), "/chaplogo.png");
    assert.equal(wmImageSrc("data:image/png;base64,xx"), "data:image/png;base64,xx");
    assert.equal(isAllowedListingImage("/chaplogo.png"), false);
  });
});
