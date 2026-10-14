import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { s3Get, isS3Configured } from "../src/lib/storage.ts";

const KEYS = ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_ENDPOINT", "UPLOAD_DRIVER"] as const;
const saved: Record<string, string | undefined> = {};
for (const k of KEYS) saved[k] = process.env[k];
delete process.env.UPLOAD_DRIVER;
delete process.env.S3_ENDPOINT;

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function s3Env() {
  process.env.S3_BUCKET = "chap-media";
  process.env.S3_REGION = "eu-west-1";
  process.env.S3_ACCESS_KEY = "AKID";
  process.env.S3_SECRET_KEY = "SECRET";
}

describe("s3Get (private verification docs)", () => {
  it("signs a GET and returns the bytes", async () => {
    s3Env();
    assert.equal(isS3Configured(), true);
    let seen: { url: string; method?: string; auth?: string } = { url: "" };
    globalThis.fetch = (async (url: unknown, init?: { method?: string; headers?: Record<string, string> }) => {
      seen = { url: String(url), method: init?.method, auth: init?.headers?.Authorization };
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }) as typeof fetch;
    const buf = await s3Get("private/2026-10/doc123-id.jpg");
    assert.ok(buf);
    assert.equal(Buffer.compare(buf!, Buffer.from([1, 2, 3])), 0);
    assert.equal(seen.method, "GET");
    assert.ok(seen.url.includes("/chap-media/private/2026-10/doc123-id.jpg"));
    assert.ok(seen.auth?.startsWith("AWS4-HMAC-SHA256 Credential=AKID/"));
  });

  it("returns null on 404 instead of throwing", async () => {
    s3Env();
    globalThis.fetch = (async () => new Response("nope", { status: 404 })) as typeof fetch;
    assert.equal(await s3Get("private/2026-10/gone.jpg"), null);
  });

  it("throws on transport errors", async () => {
    s3Env();
    globalThis.fetch = (async () => new Response("denied", { status: 403 })) as typeof fetch;
    await assert.rejects(() => s3Get("private/2026-10/x.jpg"), /S3 download failed \(403\)/);
  });
});
