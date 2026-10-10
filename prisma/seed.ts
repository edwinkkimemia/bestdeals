/**
 * Seed: counties, categories, plans, coupons, demo shops/listings.
 * Clearly-marked demonstration data — never presented as real transactions.
 * Run: npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import { CATEGORIES, SHOPS, LISTINGS, SHOP_PLANS, COUPONS } from "../src/data/catalog";

const prisma = new PrismaClient();

async function main() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        slug: c.slug,
        name: c.name,
        blurb: c.blurb,
        imageUrl: c.image,
        attributes: {
          create: c.attributes.map((a) => ({ key: a.key, label: a.label, options: a.options ?? [] })),
        },
      },
    });
  }
  for (const p of SHOP_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, name: p.name, monthly: p.monthly, annual: p.annual, listings: p.listings, features: p.features },
    });
  }
  for (const c of Object.values(COUPONS)) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: { code: c.code, value: c.value, minSpend: c.minSpend },
    });
  }
  console.log(`Seeded ${CATEGORIES.length} categories, ${SHOP_PLANS.length} plans, ${Object.keys(COUPONS).length} coupons.`);
  console.log(`Demo catalogue ships in src/data/catalog.ts (${SHOPS.length} shops, ${LISTINGS.length} listings).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
