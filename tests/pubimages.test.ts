import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDbPubImageUrl, dbPubImageKey, stageDbPubImage, readDbPubImage } from "../src/lib/pubimages.ts";
import { freshDemoStore } from "../src/lib/store.ts";

describe("db public images", () => {
  it("accepts only well-formed /api/files/db refs", () => {
    assert.equal(isDbPubImageUrl("/api/files/db/2026-10/abc123-id.jpg"), true);
    assert.equal(isDbPubImageUrl("/api/files/2026-10/abc.jpg"), false);
    assert.equal(isDbPubImageUrl("/uploads/2026-10/abc.jpg"), false);
    assert.equal(isDbPubImageUrl("https://x.co/i.jpg"), false);
    assert.equal(isDbPubImageUrl(null), false);
    assert.ok(dbPubImageKey("/api/files/db/2026-10/abc123-id.jpg")?.startsWith("pubimg:"));
    assert.equal(dbPubImageKey("/api/files/db/2026-10/../evil.jpg"), null);
    assert.equal(dbPubImageKey("/api/files/db/x"), null);
    assert.equal(dbPubImageKey("/api/files/2026-10/abc.jpg"), null);
  });

  it("round-trips staged images through the shared store", async () => {
    const store = freshDemoStore();
    const bytes = Buffer.from("fake-public-bytes");
    const url = await stageDbPubImage(store, {
      name: "mv69-test-cover.jpg",
      stamp: "2026-10",
      mime: "image/jpeg",
      base64: bytes.toString("base64"),
      by: "u1",
    });
    assert.equal(url, "/api/files/db/2026-10/mv69-test-cover.jpg");
    const back = await readDbPubImage(store, url!);
    assert.ok(back);
    assert.equal(back!.mime, "image/jpeg");
    assert.equal(Buffer.compare(back!.bytes, bytes), 0);
    assert.equal(await readDbPubImage(store, "/api/files/db/2026-10/nope.jpg"), null);
  });

  it("keeps small PNG/WebP bytes under matching extensions", async () => {
    const store = freshDemoStore();
    for (const [name, mime] of [["art-work.png", "image/png"], ["shot-photo.webp", "image/webp"]] as const) {
      const bytes = Buffer.from(`bytes-for-${name}`);
      const url = await stageDbPubImage(store, {
        name, stamp: "2026-10", mime, base64: bytes.toString("base64"),
      });
      assert.ok(url?.endsWith(`/${name}`), `URL keeps the source extension (got ${url})`);
      const back = await readDbPubImage(store, url!);
      assert.ok(back);
      assert.equal(back!.mime, mime);
      assert.equal(Buffer.compare(back!.bytes, bytes), 0);
    }
  });

  it("falls back to jpeg when a stored mime is tampered", async () => {
    const store = freshDemoStore();
    const url = await stageDbPubImage(store, {
      name: "tampered.jpg", stamp: "2026-10", mime: "image/jpeg",
      base64: Buffer.from("img").toString("base64"),
    });
    assert.ok(url);
    const { dbPubImageKey } = await import("../src/lib/pubimages.ts");
    const key = dbPubImageKey(url!);
    assert.ok(key);
    await store.setSetting(key!, { mime: "text/html", base64: Buffer.from("img").toString("base64"), by: "", at: "" });
    const back = await readDbPubImage(store, url!);
    assert.ok(back);
    assert.equal(back!.mime, "image/jpeg");
  });

  it("rejects oversized, empty, or bad-mime payloads", async () => {
    const store = freshDemoStore();
    assert.equal(
      await stageDbPubImage(store, { name: "a.jpg", stamp: "2026-10", mime: "image/jpeg", base64: "" }),
      null
    );
    assert.equal(
      await stageDbPubImage(store, { name: "a.jpg", stamp: "2026-10", mime: "application/pdf", base64: "eA==" }),
      null
    );
    assert.equal(
      await stageDbPubImage(store, { name: "a.jpg", stamp: "2026-10", mime: "image/jpeg", base64: "x".repeat(2_200_001) }),
      null
    );
  });
});
