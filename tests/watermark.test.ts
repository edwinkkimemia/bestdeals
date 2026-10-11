import { describe, it } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { watermarkBuffer, sniffContentType, wmImageSrc, wmCacheKey, WATERMARK_VERSION } from "../src/lib/watermark.ts";

describe("watermark", () => {
  it("bakes a visible pill into jpeg and png photos", async () => {
    for (const format of ["jpeg", "png"] as const) {
      const input = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#999" } })
        [format]()
        .toBuffer();
      const out = await watermarkBuffer(input);
      assert.ok(out.length > 0);
      assert.notDeepEqual(out, input);
      assert.equal(sniffContentType(out), `image/${format}`);
    }
  });
  it("passes non-images through untouched", async () => {
    const buf = Buffer.from("not an image at all");
    assert.deepEqual(await watermarkBuffer(buf), buf);
    assert.equal(sniffContentType(Buffer.from([0xff, 0xd8, 0x00])), "image/jpeg");
    assert.equal(sniffContentType(Buffer.from([0x89, 0x50, 0x00])), "image/png");
  });
  it("routes display images through the watermark endpoint", () => {
    assert.equal(
      wmImageSrc("https://x.co/i.jpg"),
      "/api/images/download?src=https%3A%2F%2Fx.co%2Fi.jpg"
    );
    assert.ok(wmImageSrc("/uploads/2026/a.jpg", true).endsWith("&dl=1"));
    assert.equal(wmImageSrc(""), "");
    assert.equal(wmImageSrc("data:image/png;base64,xx"), "data:image/png;base64,xx");
  });
  it("keys the disk cache stably per source and version", () => {
    assert.equal(wmCacheKey("https://x.co/i.jpg"), wmCacheKey("https://x.co/i.jpg"));
    assert.notEqual(wmCacheKey("https://x.co/a.jpg"), wmCacheKey("https://x.co/b.jpg"));
    assert.ok(wmCacheKey("https://x.co/i.jpg").includes(WATERMARK_VERSION));
  });
});
