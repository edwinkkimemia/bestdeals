import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { freshDemoStore } from "../src/lib/store.ts";
import {
  countPushSubscriptions,
  getPushPublicKey,
  removePushSubscription,
  savePushSubscription,
  sendPushToUser,
} from "../src/lib/push.ts";

const sub = (endpoint: string) => ({
  endpoint,
  expirationTime: null,
  keys: { p256dh: "B".repeat(65), auth: "a".repeat(16) },
});

describe("web push subscriptions", () => {
  it("stores multiple devices, replaces duplicates and removes them", async () => {
    const store = freshDemoStore();
    await savePushSubscription("u1", sub("https://push.example.com/one"), "Phone", store);
    await savePushSubscription("u1", sub("https://push.example.com/two"), "Laptop", store);
    assert.equal(await countPushSubscriptions("u1", store), 2);

    // Same endpoint updates rather than duplicating.
    await savePushSubscription("u1", sub("https://push.example.com/one"), "Phone updated", store);
    assert.equal(await countPushSubscriptions("u1", store), 2);

    assert.equal(await removePushSubscription("u1", "https://push.example.com/one", store), 1);
    assert.equal(await countPushSubscriptions("u1", store), 1);
    assert.equal(await removePushSubscription("u1", undefined, store), 1);
    assert.equal(await countPushSubscriptions("u1", store), 0);
  });

  it("creates a stable VAPID key pair", async () => {
    const store = freshDemoStore();
    const first = await getPushPublicKey(store);
    const second = await getPushPublicKey(store);
    assert.ok(first.length > 40, "public key is present");
    assert.equal(second, first, "key pair is stable");
  });

  it("sends nothing when a user has no registered device", async () => {
    const store = freshDemoStore();
    assert.equal(await sendPushToUser("nobody", { title: "Hello", body: "World" }, store), 0);
  });
});
