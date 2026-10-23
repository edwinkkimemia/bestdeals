import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshDemoStore } from "../src/lib/store.ts";
import {
  getInvoiceForUser,
  listInvoicesForOwner,
  recordPromotionInvoice,
  saveInvoiceRecord,
} from "../src/lib/invoices.ts";
import { buildInvoicePdf } from "../src/lib/invoice-pdf.ts";
import { invoiceEmailHtml } from "../src/lib/invoice-email.ts";

async function fixture() {
  const store = freshDemoStore();
  const owner = await store.createUser({
    name: "Invoice Seller",
    businessName: "Invoice Home",
    email: "invoices@example.co.ke",
    phone: "0712345678",
    role: "SELLER",
    verified: true,
    passwordHash: "h",
  });
  const shop = await store.createShop({
    slug: "invoice-home",
    name: "Invoice Home",
    description: "Invoice fixture shop",
    businessCategory: "Home & Furniture",
    county: "Nairobi",
    town: "Westlands",
    phone: "0712345678",
    ownerId: owner.id,
  });
  const listing = await store.createListing({
    title: "Sisal basket set",
    description: "Handwoven baskets",
    type: "product",
    price: 2500,
    compareAt: null,
    condition: "new",
    txMethod: "contact_seller",
    negotiable: false,
    stock: 4,
    county: "Nairobi",
    town: "Westlands",
    images: [],
    attributes: {},
    ownerId: owner.id,
    sellerName: shop.name,
    categorySlug: "home-furniture",
    shopSlug: shop.slug,
  });
  return { store, owner, shop, listing };
}

describe("invoices", () => {
  it("combines plan and promotion invoices for the owner", async () => {
    const { store, owner, shop, listing } = await fixture();
    await saveInvoiceRecord(
      {
        id: "INV-PLAN-1",
        kind: "plan",
        ownerId: owner.id,
        shopSlug: shop.slug,
        shopName: shop.name,
        planId: "silver",
        amount: 499,
        at: new Date("2026-10-01T10:00:00Z").toISOString(),
        renewsAt: new Date("2026-10-31T10:00:00Z").toISOString(),
        method: "wallet",
        status: "paid",
        customerEmail: owner.email,
      },
      store
    );
    const promo = await store.createPromotion({
      listingId: listing.id,
      ownerId: owner.id,
      kind: "featured",
      days: 7,
      amount: 299,
    });
    await recordPromotionInvoice(
      {
        promo,
        ownerId: owner.id,
        ownerName: owner.name,
        ownerEmail: owner.email,
        listingTitle: listing.title,
        method: "mpesa",
        status: "pending",
      },
      store
    );

    const items = await listInvoicesForOwner(owner.id, store);
    assert.equal(items.length, 2);
    assert.equal(items.find((i) => i.kind === "plan")?.status, "paid");
    const boost = items.find((i) => i.kind === "promotion");
    assert.equal(boost?.status, "pending");
    assert.equal(boost?.statusLabel, "Unpaid");
    assert.equal(boost?.listing?.title, listing.title);
    assert.match(boost?.downloadUrl ?? "", /^\/api\/invoices\/promo%3A/);
  });

  it("keeps billing details when a promotion is activated later", async () => {
    const { store, owner, listing } = await fixture();
    const promo = await store.createPromotion({
      listingId: listing.id,
      ownerId: owner.id,
      kind: "featured",
      days: 7,
      amount: 299,
    });
    const pending = await recordPromotionInvoice(
      {
        promo,
        ownerId: owner.id,
        ownerName: owner.businessName,
        ownerEmail: owner.email,
        listingTitle: listing.title,
        method: "mpesa",
        status: "pending",
      },
      store
    );
    await store.activatePromotion(promo.id);
    const active = (await store.getPromotion(promo.id))!;
    const paid = await recordPromotionInvoice(
      {
        promo: active,
        method: "mpesa",
        status: "paid",
        providerRef: "RC-123",
      },
      store
    );

    assert.equal(paid.id, pending.id);
    assert.equal(paid.status, "paid");
    assert.equal(paid.customerEmail, owner.email);
    assert.equal(paid.customerName, owner.businessName);
    assert.equal(paid.providerRef, "RC-123");
    assert.equal(paid.listingTitle, listing.title);
  });

  it("builds a branded PDF and HTML receipt", async () => {
    const { store, owner, shop } = await fixture();
    await saveInvoiceRecord(
      {
        id: "INV-PDF-1",
        kind: "plan",
        ownerId: owner.id,
        shopSlug: shop.slug,
        shopName: shop.name,
        planId: "gold",
        amount: 999,
        at: new Date("2026-10-01T10:00:00Z").toISOString(),
        paidAt: new Date("2026-10-01T10:01:00Z").toISOString(),
        method: "mpesa",
        status: "paid",
        providerRef: "SJ41KD8XYZ",
        customerName: owner.businessName,
        customerEmail: owner.email,
        description: "Gold shop plan - monthly subscription",
      },
      store
    );
    const invoice = (await listInvoicesForOwner(owner.id, store))[0];
    assert.ok(invoice);
    const bytes = await buildInvoicePdf(invoice);
    assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), "%PDF-");
    assert.ok(bytes.byteLength > 10_000);

    const html = invoiceEmailHtml(invoice, "https://chap.co.ke");
    assert.match(html, /INV-PDF-1/);
    assert.match(html, /PAID/);
    assert.match(html, /Gold shop plan/);
    assert.match(html, /https:\/\/chap\.co\.ke\/chaplogo\.png/);
  });

  it("limits downloads and emails to the owner or an admin", async () => {
    const { store, owner, shop } = await fixture();
    await saveInvoiceRecord(
      {
        id: "INV-PRIVATE-1",
        kind: "plan",
        ownerId: owner.id,
        shopSlug: shop.slug,
        shopName: shop.name,
        planId: "silver",
        amount: 499,
        at: new Date().toISOString(),
        method: "wallet",
        status: "paid",
      },
      store
    );
    assert.ok(await getInvoiceForUser("INV-PRIVATE-1", { id: owner.id, role: "SELLER" }, store));
    assert.ok(await getInvoiceForUser("INV-PRIVATE-1", { id: "someone-else", role: "SELLER" }, store) === null);
    assert.ok(await getInvoiceForUser("INV-PRIVATE-1", { id: "admin-1", role: "ADMIN" }, store));
  });
});
