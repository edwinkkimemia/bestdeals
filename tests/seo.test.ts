import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { CATEGORIES, LISTINGS, categoryBySlug } from "../src/data/catalog.ts";
import { countySlug, resolveCountyEntry } from "../src/lib/kenya.ts";
import {
  categoryFaqs,
  categoryJsonLd,
  categoryKeywords,
  categoryPath,
  listingKeywords,
  priceRangeOf,
  productSchema,
  subcategoryBySlug,
  subcategorySlug,
  topBrandsOf,
  topCountiesOf,
} from "../src/lib/category-seo.ts";
import { collectionJsonLd, productJsonLd, serviceJsonLd } from "../src/lib/seo.ts";

describe("county URL slugs", () => {
  it("makes stable slugs and resolves them back to the county", () => {
    assert.equal(countySlug("Homa Bay"), "homa-bay");
    assert.equal(countySlug("Uasin Gishu"), "uasin-gishu");
    assert.equal(countySlug("Nairobi"), "nairobi");
    assert.equal(resolveCountyEntry("homa-bay")?.county, "Homa Bay");
    assert.equal(resolveCountyEntry("Homa%20Bay")?.county, "Homa Bay");
    assert.equal(resolveCountyEntry("uasin-gishu")?.county, "Uasin Gishu");
    assert.equal(resolveCountyEntry("not-a-county"), undefined);
  });
});

describe("category landing helpers", () => {
  const category = categoryBySlug("phones-tablets")!;
  const phones = LISTINGS.filter((l) => l.categorySlug === "phones-tablets");
  const phonesOnly = LISTINGS.filter((l) => l.categorySlug === "phones-tablets" && (l.attributes?.brand ?? ""));

  it("builds readable category and subcategory URLs", () => {
    assert.equal(subcategorySlug("Smart TVs"), "smart-tvs");
    assert.equal(subcategorySlug("Décor"), "decor");
    assert.equal(subcategoryBySlug(category, "smartwatches"), "Smartwatches");
    assert.equal(subcategoryBySlug(category, "not-real"), undefined);
    assert.equal(categoryPath(category), "/browse/phones-tablets");
    assert.equal(categoryPath(category, "Smart TVs"), "/browse/phones-tablets/smart-tvs");
  });

  it("derives market data from real listings", () => {
    const prices = priceRangeOf(phones);
    assert.ok(prices && prices.min > 0 && prices.max >= prices.min);
    const counties = topCountiesOf(phones);
    assert.ok(counties.length > 0);
    assert.ok(counties[0].count >= 1);
    assert.ok(topBrandsOf(phonesOnly).includes("Samsung"));
    assert.equal(priceRangeOf([]), null);
  });

  it("writes unique keyword phrases and useful FAQs", () => {
    const keywords = categoryKeywords(category, "Smartphones");
    assert.equal(new Set(keywords).size, keywords.length);
    assert.ok(keywords.includes("buy Smartphones in Kenya"));
    const faqs = categoryFaqs(category, "Smartphones", 7, priceRangeOf(phones), topCountiesOf(phones));
    assert.equal(faqs.length, 5);
    assert.ok(faqs[0].a.includes("KES") || faqs[0].a.includes("Ksh"));
    assert.ok(faqs.some((f) => f.q.includes("How many smartphones")));
  });

  it("emits CollectionPage + ItemList + breadcrumb + FAQ structured data", () => {
    const faqs = categoryFaqs(category, undefined, phones.length, priceRangeOf(phones), topCountiesOf(phones));
    const jsonLd = categoryJsonLd({
      category,
      description: "Compare phones across Kenya.",
      items: phones,
      faqs,
    });
    const graph = (jsonLd as { "@graph": { "@type": string }[] })["@graph"];
    const types = graph.map((g) => g["@type"]);
    assert.ok(types.includes("CollectionPage"));
    assert.ok(types.includes("BreadcrumbList"));
    assert.ok(types.includes("FAQPage"));
    const collection = graph.find((g) => g["@type"] === "CollectionPage") as {
      mainEntity: { "@type": string; itemListElement: { url: string }[] };
    };
    assert.equal(collection.mainEntity["@type"], "ItemList");
    assert.ok(collection.mainEntity.itemListElement[0].url.startsWith("https://chap.co.ke/product/"));
  });

  it("keeps every category/subcategory pair valid for the sitemap", () => {
    for (const c of CATEGORIES) {
      for (const sub of c.subcategories) {
        const slug = subcategorySlug(sub);
        assert.ok(slug.length > 0, `${c.slug}/${sub} produced an empty slug`);
        assert.equal(subcategoryBySlug(c, slug), sub);
      }
    }
  });
});

describe("listing structured data", () => {
  const item = LISTINGS.find((l) => l.listingType === "product" && l.price > 0)!;

  it("strips condition, stock, brand and seller into Product/Offer", () => {
    const schema = productSchema(item) as {
      "@type": string;
      sku: string;
      itemCondition: string;
      offers: { price: number; availability: string; seller: { url: string } };
      image: string[];
    };
    assert.equal(schema["@type"], "Product");
    assert.equal(schema.sku, item.id);
    assert.ok(schema.itemCondition.startsWith("https://schema.org/"));
    assert.equal(schema.offers.price, item.price);
    assert.equal(schema.offers.availability, "https://schema.org/InStock");
    assert.ok(schema.offers.seller.url.startsWith("/") || schema.offers.seller.url.startsWith("http"));
    assert.ok(schema.image.every((u) => u.startsWith("http")));
  });

  it("marks out-of-stock products correctly and keeps service offers valid", () => {
    const out = productJsonLd({
      name: "Out",
      description: "d",
      image: ["/uploads/a.jpg"],
      price: 10,
      url: "/product/out",
      stock: 0,
    }) as { image: string[]; offers: { availability: string } };
    assert.equal(out.offers.availability, "https://schema.org/OutOfStock");
    assert.equal(out.image[0], "https://chap.co.ke/uploads/a.jpg");

    const service = serviceJsonLd({
      name: "Plumber",
      description: "d",
      url: "/services/plumber",
      price: 1500,
      providerName: "Kamau",
    }) as { "@type": string; offers: { price: number } };
    assert.equal(service["@type"], "Service");
    assert.equal(service.offers.price, 1500);
  });

  it("builds an absolute listing keyword set", () => {
    const keywords = listingKeywords(item);
    assert.ok(keywords.includes("chap.co.ke"));
    assert.ok(keywords.every((k) => k.length > 0));
  });

  it("builds an ItemList with absolute URLs", () => {
    const jsonLd = collectionJsonLd({
      name: "Phones",
      description: "d",
      url: "/browse/phones-tablets",
      items: [{ name: item.title, url: `/product/${item.slug}` }],
    }) as { mainEntity: { itemListElement: { url: string }[] } };
    assert.equal(jsonLd.mainEntity.itemListElement[0].url, `https://chap.co.ke/product/${item.slug}`);
  });
});
