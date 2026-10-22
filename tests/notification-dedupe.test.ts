import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dedupeNotifications, type NotificationLike } from "../src/lib/notification-dedupe.ts";

const row = (over: Partial<NotificationLike> = {}): NotificationLike => ({
  type: "listing",
  title: "Listing approved 🎉",
  body: "“Boots” is now live.",
  link: "/dashboard/listings/l1",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("notification de-duplication", () => {
  it("collapses repeated listing updates even when they are far apart", () => {
    const items = [
      row({ createdAt: "2026-02-01T00:00:00.000Z" }),
      row({ createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    assert.equal(dedupeNotifications(items).length, 1);
  });

  it("only collapses identical chat messages inside a five-minute burst", () => {
    const burst = [
      row({ type: "message", title: "New message from Admin", body: "how much", link: "/dashboard/messages/1", createdAt: "2026-01-01T00:03:00.000Z" }),
      row({ type: "message", title: "New message from Admin", body: "how much", link: "/dashboard/messages/1", createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    assert.equal(dedupeNotifications(burst).length, 1);

    const later = [
      row({ type: "message", title: "New message from Admin", body: "how much", link: "/dashboard/messages/1", createdAt: "2026-01-01T00:10:00.000Z" }),
      row({ type: "message", title: "New message from Admin", body: "how much", link: "/dashboard/messages/1", createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    assert.equal(dedupeNotifications(later).length, 2);
  });

  it("keeps updates for different listings or links", () => {
    const items = [
      row({ link: "/dashboard/listings/l1" }),
      row({ link: "/dashboard/listings/l2" }),
      row({ link: "/dashboard/listings/l1", body: "“Shoes” is now live." }),
    ];
    assert.equal(dedupeNotifications(items).length, 3);
  });
});
