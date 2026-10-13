import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { attachVerificationUsers } from "../src/lib/verifications.ts";
import type { UserRecord, VerificationRecord } from "../src/lib/store.ts";

const user = (over: Partial<UserRecord> = {}): UserRecord => ({
  id: "u1",
  name: "Jane Wanjiku",
  businessName: "Jane Biz",
  email: "jane@example.co.ke",
  phone: "0712345678",
  role: "SELLER",
  verified: false,
  emailVerified: true,
  sellerKind: "business",
  passwordHash: "h",
  createdAt: "2026-10-01T00:00:00.000Z",
  ...over,
});

const verification = (over: Partial<VerificationRecord> = {}): VerificationRecord => ({
  id: "ver1",
  userId: "u1",
  kind: "business",
  phone: "0712345678",
  status: "pending",
  docPath: "private:db/2026-10/f.png",
  fileName: "permit.png",
  createdAt: "2026-10-13T00:00:00.000Z",
  ...over,
});

describe("attachVerificationUsers", () => {
  it("attaches the uploader profile to each row", () => {
    const [row] = attachVerificationUsers([verification()], [user()]);
    assert.equal(row.user?.name, "Jane Wanjiku");
    assert.equal(row.user?.email, "jane@example.co.ke");
    assert.equal(row.user?.phone, "0712345678");
    assert.equal(row.user?.sellerKind, "business");
    assert.equal(row.user?.businessName, "Jane Biz");
    assert.equal(row.id, "ver1");
  });

  it("marks rows from deleted accounts with a null user", () => {
    const [row] = attachVerificationUsers([verification({ userId: "gone" })], [user()]);
    assert.equal(row.user, null);
  });

  it("never exposes the password hash", () => {
    const [row] = attachVerificationUsers([verification()], [user()]);
    assert.equal("passwordHash" in (row.user ?? {}), false);
  });
});
