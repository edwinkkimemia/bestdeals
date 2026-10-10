import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isAccountLocked,
  recordLoginFailure,
  clearLoginFailures,
  resetLoginGuard,
} from "../src/lib/login-guard.ts";
import { createPurposeToken, readPurposeToken, hashFingerprint } from "../src/lib/auth-tokens.ts";
import { BOOST_PRODUCTS, boostProductById } from "../src/data/catalog.ts";

describe("login-guard", () => {
  it("locks an account after 5 failures, leaves others alone", () => {
    resetLoginGuard();
    assert.equal(isAccountLocked("a@x.co.ke").locked, false);
    for (let i = 0; i < 4; i++) {
      const r = recordLoginFailure("a@x.co.ke");
      assert.equal(r.locked, false);
      assert.equal(r.remaining, 4 - i);
    }
    assert.equal(recordLoginFailure("a@x.co.ke").locked, true);
    const lock = isAccountLocked("a@x.co.ke");
    assert.equal(lock.locked, true);
    assert.ok((lock.retryAfterSec ?? 0) > 0);
    assert.equal(isAccountLocked("b@x.co.ke").locked, false);
  });
  it("treats email case-insensitively and clears on success", () => {
    resetLoginGuard();
    recordLoginFailure("User@X.co.ke");
    assert.equal(isAccountLocked("user@x.co.ke").locked, false);
    clearLoginFailures("USER@x.co.ke");
    assert.equal(isAccountLocked("user@x.co.ke").locked, false);
    // bucket restarts after clear
    assert.equal(recordLoginFailure("user@x.co.ke").remaining, 4);
    resetLoginGuard();
  });
});

describe("auth-tokens", () => {
  it("round-trips purpose tokens and rejects mismatched purpose", async () => {
    const t = await createPurposeToken({ purpose: "password-reset", userId: "u1", email: "a@x.co.ke", fingerprint: "fp1" });
    const d = await readPurposeToken(t, "password-reset");
    assert.equal(d?.userId, "u1");
    assert.equal(d?.email, "a@x.co.ke");
    assert.equal(d?.fingerprint, "fp1");
    assert.equal(await readPurposeToken(t, "email-verify"), null);
    assert.equal(await readPurposeToken("garbage", "password-reset"), null);
  });
  it("invalidates reset tokens when the password hash changes", async () => {
    const fpOld = hashFingerprint("hash-one");
    const fpNew = hashFingerprint("hash-two");
    assert.notEqual(fpOld, fpNew);
    const t = await createPurposeToken({ purpose: "password-reset", userId: "u1", email: "a@x.co.ke", fingerprint: fpOld });
    const d = await readPurposeToken(t, "password-reset");
    assert.equal(d?.fingerprint, fpOld);
    assert.notEqual(d?.fingerprint, fpNew);
  });
  it("round-trips email-verify tokens", async () => {
    const t = await createPurposeToken({ purpose: "email-verify", userId: "u9", email: "b@x.co.ke" });
    const d = await readPurposeToken(t, "email-verify");
    assert.equal(d?.userId, "u9");
    assert.equal(await readPurposeToken(t, "password-reset"), null);
  });
});

describe("boost-products", () => {
  it("lists fixed-price featured boosts", () => {
    assert.equal(BOOST_PRODUCTS.length, 2);
    for (const b of BOOST_PRODUCTS) {
      assert.ok(b.price > 0 && b.days > 0 && b.kind === "featured");
    }
    assert.equal(boostProductById("boost-7")?.price, 499);
    assert.equal(boostProductById("nope"), null);
  });
});
