import { describe, it } from "node:test";
import assert from "node:assert/strict";

delete process.env.DATABASE_URL;

import { freshDemoStore } from "../src/lib/store.ts";
import { DEMO_USERS, ensureDemoUsers, isDemoEmail, demoPassword } from "../src/lib/demo-users.ts";
import { hashPassword, verifyPassword } from "../src/lib/auth.ts";
import { clearLoginFailures, recordLoginFailure, isAccountLocked } from "../src/lib/login-guard.ts";

describe("demo logins", () => {
  it("roster covers shops + sellers + buyer with matching seed emails", () => {
    assert.ok(DEMO_USERS.length >= 17);
    const emails = DEMO_USERS.map((u) => u.email);
    for (const want of ["fonzone.nairobi@demo.chap.co.ke", "rift.hardware.ltd@demo.chap.co.ke", "demo.buyer@demo.chap.co.ke"]) {
      assert.ok(emails.includes(want), want);
    }
    assert.ok(DEMO_USERS.every((u) => isDemoEmail(u.email)));
    assert.ok(!isDemoEmail("admin@chap.co.ke"));
  });
  it("ensureDemoUsers provisions the roster and logs in with the demo password", async () => {
    const store = freshDemoStore();
    assert.equal(await store.findUserByEmail("fonzone.nairobi@demo.chap.co.ke"), null);
    const r = await ensureDemoUsers(store);
    assert.equal(r.created, DEMO_USERS.length);
    const u = await store.findUserByEmail("FonZone.Nairobi@demo.chap.co.ke");
    assert.ok(u, "lookup is case-insensitive");
    assert.equal(await verifyPassword(demoPassword(), u!.passwordHash), true);
    assert.equal(await verifyPassword("wrong-password", u!.passwordHash), false);
    // Idempotent second run creates nothing.
    assert.equal((await ensureDemoUsers(store)).created, 0);
  });
  it("lockout clears via clearLoginFailures (admin unlock path)", () => {
    const email = "locked@x.co.ke";
    clearLoginFailures(email);
    for (let i = 0; i < 5; i++) recordLoginFailure(email);
    assert.equal(isAccountLocked(email).locked, true);
    clearLoginFailures(email);
    assert.equal(isAccountLocked(email).locked, false);
  });
  it("freshly hashed passwords verify (signup/signin round-trip shape)", async () => {
    const h = await hashPassword("MyAdminPass123");
    assert.equal(await verifyPassword("MyAdminPass123", h), true);
    assert.equal(await verifyPassword("myadminpass123", h), false);
  });
});
