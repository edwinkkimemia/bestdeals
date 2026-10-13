import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDbDocRef, dbDocKey, stageDbDoc, readDbDoc } from "../src/lib/privdocs.ts";
import { freshDemoStore } from "../src/lib/store.ts";

describe("db doc refs", () => {
  it("accepts only well-formed private:db refs", () => {
    assert.equal(isDbDocRef("private:db/2026-10/abc123-id.png"), true);
    assert.equal(isDbDocRef("private:2026-10/abc.png"), false);
    assert.equal(isDbDocRef("https://x.co/i.png"), false);
    assert.equal(isDbDocRef(null), false);
    assert.ok(dbDocKey("private:db/2026-10/abc123-id.png")?.startsWith("privdoc:"));
    assert.equal(dbDocKey("private:db/2026-10/../evil.png"), null);
    assert.equal(dbDocKey("private:db/x"), null);
    assert.equal(dbDocKey("private:2026-10/abc.png"), null);
  });

  it("round-trips staged docs through the shared store", async () => {
    const store = freshDemoStore();
    const bytes = Buffer.from("fake-image-bytes");
    const ref = await stageDbDoc(store, {
      name: "mv69-test-id.png",
      stamp: "2026-10",
      mime: "image/png",
      base64: bytes.toString("base64"),
      by: "u1",
    });
    assert.equal(ref, "private:db/2026-10/mv69-test-id.png");
    const back = await readDbDoc(store, ref!);
    assert.ok(back);
    assert.equal(back!.mime, "image/png");
    assert.equal(back!.by, "u1");
    assert.equal(Buffer.compare(back!.bytes, bytes), 0);
    // Unknown refs miss.
    assert.equal(await readDbDoc(store, "private:db/2026-10/nope.png"), null);
    assert.equal(await readDbDoc(store, "private:2026-10/nope.png"), null);
  });

  it("rejects oversized, unowned-shape, or bad-mime payloads", async () => {
    const store = freshDemoStore();
    assert.equal(
      await stageDbDoc(store, { name: "a.png", stamp: "2026-10", mime: "image/png", base64: "", by: "u1" }),
      null
    );
    assert.equal(
      await stageDbDoc(store, { name: "a.png", stamp: "2026-10", mime: "application/pdf", base64: "eA==", by: "u1" }),
      null
    );
    assert.equal(
      await stageDbDoc(store, { name: "a.png", stamp: "2026-10", mime: "image/png", base64: "eA==", by: "" }),
      null
    );
    assert.equal(
      await stageDbDoc(store, { name: "a.png", stamp: "2026-10", mime: "image/png", base64: "x".repeat(7_500_001), by: "u1" }),
      null
    );
  });
});
