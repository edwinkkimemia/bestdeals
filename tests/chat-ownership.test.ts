import { describe, it } from "node:test";
import assert from "node:assert/strict";

delete process.env.DATABASE_URL;

import { freshDemoStore } from "../src/lib/store.ts";
import { identityOf, isParticipant, mineOf, isChatSeller, resolveThreadSeller } from "../src/lib/chat-access.ts";

const ME = { id: "u_me", name: "Buyer Bob", role: "SELLER", phone: "0712345678" };
const OTHER_PHONE = "0799999999";

async function guestChat(store: ReturnType<typeof freshDemoStore>, phone: string) {
  return store.createConversation({
    listingId: "general",
    listingTitle: "General enquiry",
    sellerName: "Seller Sam",
    sellerId: undefined,
    buyerId: `phone:${phone}`,
    buyerName: "Guest",
    buyerPhone: phone,
    firstMessage: { senderId: `phone:${phone}`, senderLabel: "Guest", body: "Hi, is this available?", bodyHtml: "Hi, is this available?" },
  });
}

describe("chat ownership (sender lockout regression)", () => {
  it("guest sender keeps history via phone identity", async () => {
    const store = freshDemoStore();
    const c = await guestChat(store, ME.phone);
    const id = identityOf(null, ME.phone)!;
    assert.ok(id, "guest identity resolves");
    assert.equal(isParticipant(c, id, null), `phone:${ME.phone}`);
    const inbox = await store.listConversations({ phone: ME.phone });
    assert.equal(inbox.length, 1, "inbox shows the chat");
    const msgs = await store.listMessages(c.id);
    assert.equal(msgs.length, 1, "first message persisted");
    assert.equal(mineOf(msgs[0].senderId, `phone:${ME.phone}`), true);
  });
  it("signed-in sender with a different chat phone is NOT locked out via altPhone", async () => {
    const store = freshDemoStore();
    const c = await guestChat(store, OTHER_PHONE);
    // Signed in, no phone hint: correctly unknown (can't prove the number).
    const bare = identityOf({ id: ME.id, phone: ME.phone }, "")!;
    assert.equal(isParticipant(c, bare, ME), null);
    // With the chat phone supplied (?phone= or remembered): access granted.
    const withAlt = identityOf({ id: ME.id, phone: ME.phone }, OTHER_PHONE)!;
    assert.deepEqual(withAlt.altPhone, OTHER_PHONE);
    assert.equal(isParticipant(c, withAlt, ME), ME.id);
    // Own pre-sign-in message still renders as mine.
    assert.equal(mineOf(`phone:${OTHER_PHONE}`, ME.id, ME.phone), false);
    assert.equal(mineOf(`phone:${OTHER_PHONE}`, ME.id, OTHER_PHONE), true);
  });
  it("sign-in claims guest chats on the account number", async () => {
    const store = freshDemoStore();
    const user = await store.createUser({
      name: ME.name, email: "bob@x.co.ke", phone: ME.phone,
      role: "SELLER", verified: false, passwordHash: "h",
    });
    await guestChat(store, ME.phone);
    assert.equal((await store.listConversations({ userId: user.id })).length, 0, "not linked before claim");
    assert.equal(await store.claimGuestConversations(user.id, ME.phone), 1);
    const inbox = await store.listConversations({ userId: user.id, phone: ME.phone, sellerName: ME.name });
    assert.equal(inbox.length, 1, "chat survives sign-in");
    const id = identityOf({ id: user.id, phone: ME.phone }, "")!;
    const convo = await store.getConversation(inbox[0].id);
    assert.equal(isParticipant(convo!, id, ME), user.id);
  });
  it("strangers are still rejected, admins pass", async () => {
    const store = freshDemoStore();
    const c = await guestChat(store, ME.phone);
    const stranger = identityOf({ id: "u_stranger", phone: "0711111111" }, "")!;
    assert.equal(isParticipant(c, stranger, { id: "u_stranger", name: "Stranger", role: "SELLER" }), null);
    const admin = identityOf({ id: "u_admin", phone: "0711111111" }, "")!;
    assert.equal(isParticipant(c, admin, { id: "u_admin", name: "Admin", role: "ADMIN" }), "u_admin");
  });
    it("seller fallback resolves via listing owner", async () => {    const store = freshDemoStore();
    const seller = await store.createUser({
      name: "Seller Sam", email: "sam@x.co.ke", phone: "0722000000",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    const listing = await store.createListing({
      title: "Test sofa for chat sellers", description: "A sofa used to test seller chat access end to end",
      type: "classified", price: 5000, compareAt: null, condition: "used_good", txMethod: "contact_seller",
      negotiable: false, stock: 1, county: "Nairobi", town: "CBD", images: [], attributes: {},
      ownerId: seller.id, sellerName: "Seller Sam",
    });
    await store.setListingStatus(listing.id, "active");
    const convo = await store.createConversation({
      listingId: listing.id, listingTitle: listing.title, sellerName: "Seller Sam",
      sellerId: undefined, buyerId: "phone:0712345678", buyerName: "Guest", buyerPhone: "0712345678",
      firstMessage: { senderId: "phone:0712345678", senderLabel: "Guest", body: "Hi", bodyHtml: "Hi" },
    });
    const sellerId = identityOf({ id: seller.id, phone: "0722000000" }, "")!;
    assert.equal(isParticipant(convo, sellerId, { id: seller.id, name: "Seller Sam", role: "SELLER" }), seller.id, "display-name link works where stored");
    // Backend without a persisted sellerName (Prisma): listing owner still counts.
    const bare = { ...convo, sellerName: undefined };
    assert.equal(isParticipant(bare, sellerId, { id: seller.id, name: "Seller Sam", role: "SELLER" }), null, "no raw link without sellerName");
    assert.equal(await isChatSeller(store, bare, { id: seller.id, name: "Seller Sam", role: "SELLER" }), true, "listing owner counts as seller");
    assert.equal(await isChatSeller(store, bare, { id: "u_nope", name: "Nope", role: "SELLER" }), false);
  });
  it("heals legacy generic threads to the real seller/shop", async () => {
    const store = freshDemoStore();
    // Catalogue listing chat stored pre-fix as "Seller".
    const legacy = await store.createConversation({
      listingId: "p4", listingTitle: "General enquiry", sellerName: "Seller",
      sellerId: undefined, buyerId: "phone:0712345678", buyerName: "Guest", buyerPhone: "0712345678",
      firstMessage: { senderId: "phone:0712345678", senderLabel: "Guest", body: "Hi", bodyHtml: "Hi" },
    });
    const healed = await resolveThreadSeller(store, legacy);
    assert.equal(healed.name, "Mama Fua Styles", "ankara listing resolves to its seller");
    assert.equal(healed.phone, "0733987654", "snapshot contact resolves too");
    // Real names are left untouched.
    const kept = await resolveThreadSeller(store, { ...legacy, sellerName: "Mama Fua Styles" });
    assert.equal(kept.name, "Mama Fua Styles");
    // Unresolvable stays generic (never fabricates).
    const vague = await resolveThreadSeller(store, { listingId: "general", sellerName: "Seller" });
    assert.equal(vague.name, "Seller");
    assert.equal(vague.phone, undefined);
  });
  it("same pair + listing reuses one thread (no duplicate chats)", async () => {
    const store = freshDemoStore();
    const buyer = "phone:0710000301";
    const first = await store.createConversation({
      listingId: "p1", listingTitle: "Phone", sellerName: "Seller Sam",
      sellerId: undefined, buyerId: buyer, buyerName: "Guest", buyerPhone: "0710000301",
      firstMessage: { senderId: buyer, senderLabel: "Guest", body: "Hi", bodyHtml: "Hi" },
    });
    const match = await store.findConversationMatch({
      buyerIds: [buyer], sellerId: undefined, sellerName: "Seller Sam", listingId: "p1",
    });
    assert.equal(match?.id, first.id, "same triple matches");
    assert.equal(
      await store.findConversationMatch({ buyerIds: [buyer], sellerName: "Seller Sam", listingId: "p2" }),
      null,
      "different listing is a new thread"
    );
    assert.equal(
      await store.findConversationMatch({ buyerIds: ["phone:0799999999"], sellerName: "Seller Sam", listingId: "p1" }),
      null,
      "different buyer is a new thread"
    );
    // Seller account linked later still matches by stored name.
    const linked = await store.findConversationMatch({
      buyerIds: [buyer], sellerId: "u_seller1", sellerName: "Seller Sam", listingId: "p1",
    });
    assert.equal(linked?.id, first.id, "name fallback bridges pre-link threads");
  });
  it("listing owner inbox survives renames (stale sellerName still delivered)", async () => {
    const store = freshDemoStore();
    const a = await store.createUser({
      name: "Account Alpha", email: "alpha2@x.co.ke", phone: "0710000201",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    const b = await store.createUser({
      name: "Totally Different Beta", email: "beta2@x.co.ke", phone: "0710000202",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    const listing = await store.createListing({
      title: "Test sofa for rename inbox", description: "A sofa used to test seller inbox delivery after rename",
      type: "classified", price: 5000, compareAt: null, condition: "used_good", txMethod: "contact_seller",
      negotiable: false, stock: 1, county: "Nairobi", town: "CBD", images: [], attributes: {},
      ownerId: b.id, sellerName: "Old Name",
    });
    await store.setListingStatus(listing.id, "active");
    // Legacy thread stored before owner pinning existed (sellerId unset, stale name).
    const c = await store.createConversation({
      listingId: listing.id, listingTitle: listing.title, sellerName: "Old Name",
      sellerId: undefined, buyerId: a.id, buyerName: a.name, buyerPhone: a.phone,
      firstMessage: { senderId: a.id, senderLabel: a.name, body: "Hello B", bodyHtml: "Hello B" },
    });
    const inboxB = await store.listConversations({ userId: b.id, phone: b.phone, sellerName: b.name });
    assert.ok(inboxB.some((x) => x.id === c.id), "owner still receives the chat after rename");
    assert.equal(await isChatSeller(store, c, { id: b.id, name: b.name, role: "SELLER" }), true, "owner can open the thread");
    await store.addMessage({ conversationId: c.id, senderId: b.id, senderLabel: b.name, body: "Hi A", bodyHtml: "Hi A" });
    assert.equal((await store.listMessages(c.id)).length, 2, "reply delivered");
  });
  it("two accounts message each other directly (explicit target, no name match needed)", async () => {
    const store = freshDemoStore();
    const a = await store.createUser({
      name: "Account Alpha", email: "alpha@x.co.ke", phone: "0710000201",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    const b = await store.createUser({
      name: "Totally Different Beta", email: "beta@x.co.ke", phone: "0710000202",
      role: "SELLER", verified: true, passwordHash: "h",
    });
    // Direct chat: seller side pinned to B's account id at creation.
    const c = await store.createConversation({
      listingId: "general", listingTitle: "Direct message", sellerName: "Totally Different Beta",
      sellerId: b.id, buyerId: a.id, buyerName: a.name, buyerPhone: a.phone,
      firstMessage: { senderId: a.id, senderLabel: a.name, body: "Hello B", bodyHtml: "Hello B" },
    });
    // B's inbox contains it (seller side, no display-name coincidence).
    const inboxB = await store.listConversations({ userId: b.id, phone: b.phone, sellerName: b.name });
    assert.ok(inboxB.some((x) => x.id === c.id), "seller receives the chat");
    // B reads + replies; A sees both messages with correct mine flags.
    await store.addMessage({ conversationId: c.id, senderId: b.id, senderLabel: b.name, body: "Hi A", bodyHtml: "Hi A" });
    const idA = identityOf({ id: a.id, phone: a.phone }, "")!;
    assert.equal(isParticipant(c, idA, { id: a.id, name: a.name, role: "SELLER" }), a.id);
    const msgs = await store.listMessages(c.id);
    assert.equal(msgs.length, 2);
    assert.equal(mineOf(msgs[0].senderId, a.id, a.phone), true);
    assert.equal(mineOf(msgs[1].senderId, a.id, a.phone), false);
  });
});
