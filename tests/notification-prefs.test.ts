import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_NOTIFICATION_PREFS, normalizeNotificationPrefs } from "../src/lib/notification-prefs.ts";
import { getNotificationPrefs, pushEnabledFor } from "../src/lib/notification-preferences.ts";
import { freshDemoStore } from "../src/lib/store.ts";

describe("notification preferences", () => {
  it("normalizes partial bad input to safe defaults", () => {
    const prefs = normalizeNotificationPrefs({ message: false, order: "yes", promotion: true });
    assert.equal(prefs.message, false);
    assert.equal(prefs.order, DEFAULT_NOTIFICATION_PREFS.order);
    assert.equal(prefs.promotion, true);
  });

  it("reads per-type push preferences with high-signal defaults", async () => {
    const store = freshDemoStore();
    await store.setSetting("notification_prefs:u1", { message: false });
    const prefs = await getNotificationPrefs("u1", store);
    assert.equal(prefs.message, false);
    assert.equal(prefs.order, true);
    assert.equal(await pushEnabledFor("u1", "message", store), false);
    assert.equal(await pushEnabledFor("u1", "order", store), true);
  });
});
