import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshDemoStore } from "../src/lib/store.ts";

describe("notifications centre", () => {
  it("creates, lists newest-first, counts unread", async () => {
    const s = freshDemoStore();
    await s.createNotification({ userId: "u1", type: "message", title: "New message", body: "Hi there", link: "/dashboard/messages/x" });
    await s.createNotification({ userId: "u1", type: "listing", title: "Approved", body: "Live now" });
    await s.createNotification({ userId: "u2", type: "order", title: "Other user", body: "hidden" });
    const mine = await s.listNotifications("u1");
    assert.equal(mine.length, 2);
    assert.equal(mine[0].title, "Approved");
    assert.equal(await s.countUnreadNotifications("u1"), 2);
    assert.equal(await s.countUnreadNotifications("u2"), 1);
  });

  it("marks one + all as read, scopes by user", async () => {
    const s = freshDemoStore();
    const a = await s.createNotification({ userId: "u1", type: "system", title: "A", body: "a" });
    await s.createNotification({ userId: "u1", type: "system", title: "B", body: "b" });
    await s.markNotificationRead(a.id, "u2"); // wrong user: no-op
    assert.equal(await s.countUnreadNotifications("u1"), 2);
    await s.markNotificationRead(a.id, "u1");
    assert.equal(await s.countUnreadNotifications("u1"), 1);
    const unreadOnly = await s.listNotifications("u1", { unreadOnly: true });
    assert.equal(unreadOnly.length, 1);
    const marked = await s.markAllNotificationsRead("u1");
    assert.equal(marked, 1);
    assert.equal(await s.countUnreadNotifications("u1"), 0);
  });

  it("caps demo history at 200 per user", async () => {
    const s = freshDemoStore();
    for (let i = 0; i < 205; i++) {
      await s.createNotification({ userId: "u1", type: "system", title: `N${i}`, body: "x" });
    }
    const all = await s.listNotifications("u1", { limit: 100 });
    assert.equal(all.length, 100);
    assert.equal(all[0].title, "N204");
  });
});
