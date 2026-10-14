/**
 * Seed: counties, categories, plans, demo shops/listings.
 * Clearly-marked demonstration data — never presented as real transactions.
 * Run: npx prisma db seed (also runs automatically on Vercel deploys).
 *
 * Idempotent: everything upserts by stable keys and never overwrites
 * admin/moderator changes (prices, statuses, blog edits are left alone on
 * re-seeds; only missing rows/images are backfilled).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIES, SHOPS, LISTINGS, SHOP_PLANS } from "../src/data/catalog";
import { BLOG_POSTS } from "../src/data/blog-posts";

const prisma = new PrismaClient();

export type SeedCounts = {
  skipped: boolean;
  categories: number;
  plans: number;
  posts: number;
  users: number;
  admins: number;
  shops: number;
  listings: number;
};

async function main(): Promise<SeedCounts> {
  // Unreachable database (e.g. preview builds without Postgres): skip loudly,
  // don't fail the deploy — the app falls back to demo mode.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.warn("[seed] no database reachable — skipping (demo mode).");
    return { skipped: true, categories: 0, plans: 0, posts: 0, users: 0, admins: 0, shops: 0, listings: 0 };
  }
  // Unreachable database (e.g. preview builds without Postgres): skip loudly,
  // don't fail the deploy — the app falls back to demo mode.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.warn("[seed] no database reachable — skipping (demo mode).");
    return { skipped: true, categories: 0, plans: 0, posts: 0, users: 0, admins: 0, shops: 0, listings: 0 };
  }

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
    // Plans are catalogue source-of-truth: pricing follows code on re-seed.
    // Gold "unlimited" is stored as -1 (Prisma Int can't hold Infinity).
    const listings = Number.isFinite(p.listings) ? p.listings : -1;
    await prisma.subscriptionPlan.upsert({
      where: { id: p.id },
      update: { name: p.name, monthly: p.monthly, annual: p.annual, listings, features: p.features },
      create: { id: p.id, name: p.name, monthly: p.monthly, annual: p.annual, listings, features: p.features },
    });
  }
  // Blog launch library — published once; re-seeds never overwrite admin edits.
  for (const p of BLOG_POSTS) {
    await prisma.blogPost.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        coverUrl: p.coverUrl,
        bodyHtml: p.bodyHtml,
        status: "published",
        authorName: "Chap Team",
        publishedAt: new Date(),
      },
    });
  }

  const users = await seedUsers();
  const admins = await seedAdmins();
  const shops = await seedShops(users);
  const listings = await seedListings(users, shops);

  console.log(`Seeded ${CATEGORIES.length} categories, ${SHOP_PLANS.length} plans, ${BLOG_POSTS.length} blog posts.`);
  console.log(`Seeded ${users.size} users (${admins} admins), ${shops.size} shops, ${listings} product listings.`);
  console.log(`Demo catalogue ships in src/data/catalog.ts (${SHOPS.length} shops, ${LISTINGS.length} listings).`);
  return {
    skipped: false,
    categories: CATEGORIES.length,
    plans: SHOP_PLANS.length,
    posts: BLOG_POSTS.length,
    users: users.size,
    admins,
    shops: shops.size,
    listings,
  };
}

const slugifyName = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "").slice(0, 40) || "seller";

/**
 * Demo accounts: one per distinct catalogue seller name (+ a buyer).
 * Passwords are public demo credentials — override with SEED_USER_PASSWORD.
 * Never used for admins: claim those via signup with an ADMIN_EMAILS address.
 */
async function seedUsers(): Promise<Map<string, { id: string; profileId: string | null }>> {
  const password = process.env.SEED_USER_PASSWORD || "ChapDemo123!";
  const passwordHash = await bcrypt.hash(password, 10);
  const names = new Map<string, { kind: "individual" | "business"; phone: string }>();
  for (const l of LISTINGS) {
    if (!names.has(l.sellerName)) {
      names.set(l.sellerName, {
        kind: l.sellerType === "business" ? "business" : "individual",
        phone: l.sellerPhone ?? "0700000000",
      });
    }
  }
  names.set("Demo Buyer", { kind: "individual", phone: "0712345678" });

  const out = new Map<string, { id: string; profileId: string | null }>();
  for (const [name, meta] of names) {
    const email = `${slugifyName(name)}@demo.chap.co.ke`;
    // Demo accounts use PUBLIC credentials, so new ones are created with the
    // current SEED_USER_PASSWORD — but existing passwords are NEVER touched:
    // re-seeding (every deploy) must not revert password changes, otherwise
    // logins mysteriously say "wrong password" right after a redeploy.
    // To rotate a demo password, use PUT /api/admin/users as an admin.
    const user = await prisma.user.upsert({
      where: { email },
      update: { verified: name === "Demo Buyer" ? false : true, emailVerified: true, phone: meta.phone },
      create: {
        name,
        email,
        phone: meta.phone,
        passwordHash,
        role: "SELLER",
        verified: name === "Demo Buyer" ? false : true,
        emailVerified: true,
        sellerKind: meta.kind,
        seller: { create: { displayName: name } },
      },
    });
    // Demo plan floor from the static catalogue count (≤5 free, 6–30
    // silver, 31+ gold): sellers like Baraka T (6 listings) must show Silver
    // + checkmark instead of Free. Upgrades only — an admin downgrade is never
    // reverted by re-seeding (same rule as passwords above).
    const staticCount = LISTINGS.filter((l) => l.sellerName === name).length;
    const floor = staticCount > 30 ? "gold" : staticCount > 5 ? "silver" : "free";
    const rank = (p: string | null | undefined) => ["free", "silver", "gold"].indexOf(p ?? "free");
    if (rank(floor) > rank(user.planId)) {
      await prisma.user.update({ where: { email }, data: { planId: floor } });
      console.log(`[seed] ${email} holds ${staticCount} catalogue listings → ${floor} plan.`);
    }
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
    out.set(name, { id: user.id, profileId: profile?.id ?? null });
  }
  console.log(`[seed] demo users ready (password: ${process.env.SEED_USER_PASSWORD ? "(from SEED_USER_PASSWORD)" : "ChapDemo123!"} — e.g. ${slugifyName([...names.keys()][0])}@demo.chap.co.ke).`);
  return out;
}

/**
 * Admin survival across redeploys.
 *
 * Root cause of "admin deleted after redeploy": without DATABASE_URL the app
 * runs on in-memory DemoStore (wiped every restart), and even with Postgres
 * a fresh/branch database has no admin row until someone signs up. The deploy
 * seed (`vercel-build`: migrate deploy + seed) is the one hook guaranteed to
 * run on every deploy, so it must ensure admins exist:
 * - Existing rows whose email is in ADMIN_EMAILS are PROMOTED to ADMIN
 *   (never demoted, never touches passwordHash). This also heals accounts
 *   created via signup before ADMIN_EMAILS was configured (they'd be SELLER).
 * - Missing rows are CREATED only when ADMIN_PASSWORD (or SEED_USER_PASSWORD
 *   fallback) is set — never with a hardcoded default, so a fresh prod DB
 *   doesn't grow a well-known admin login. Without it we log and skip: create
 *   the admin once via signup with an ADMIN_EMAILS address.
 */
async function seedAdmins(): Promise<number> {
  const emails = (process.env.ADMIN_EMAILS || "admin@chap.co.ke")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return 0;
  const initialPassword = (process.env.ADMIN_PASSWORD || process.env.SEED_USER_PASSWORD || "").trim();
  const passwordHash = initialPassword ? await bcrypt.hash(initialPassword, 10) : null;
  let n = 0;
  for (const email of emails) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role !== "ADMIN") {
        await prisma.user.update({ where: { email }, data: { role: "ADMIN", verified: true, emailVerified: true } });
        console.log(`[seed] promoted ${email} to ADMIN (was ${String(existing.role)}).`);
      }
      n += 1;
      continue;
    }
    if (!passwordHash) {
      console.warn(`[seed] admin ${email} not found — sign up once at /auth/signup, or set ADMIN_PASSWORD to auto-create it on deploy.`);
      continue;
    }
    await prisma.user.create({
      data: {
        name: "Admin",
        email,
        phone: "0700000000",
        passwordHash,
        role: "ADMIN",
        verified: true,
        emailVerified: true,
        sellerKind: "individual",
        seller: { create: { displayName: "Admin" } },
      },
    });
    console.log(`[seed] created ADMIN ${email} (initial password from ${process.env.ADMIN_PASSWORD ? "ADMIN_PASSWORD" : "SEED_USER_PASSWORD"} — change it after first login).`);
    n += 1;
  }
  return n;
}

/** Demo shops with owner memberships derived from their catalogue listings. */
async function seedShops(users: Map<string, { id: string; profileId: string | null }>): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const s of SHOPS) {
    const shop = await prisma.shop.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        slug: s.slug,
        name: s.name,
        description: s.description,
        businessCategory: s.businessCategory,
        county: s.county,
        town: s.town,
        phone: s.phone,
        logoUrl: s.logo,
        coverUrl: s.cover,
        verified: s.verified,
      },
    });
    ids.set(s.slug, shop.id);
    const ownerListing = LISTINGS.find((l) => l.shopSlug === s.slug);
    const owner = ownerListing ? users.get(ownerListing.sellerName) : undefined;
    if (owner) {
      await prisma.shopMember.upsert({
        where: { shopId_userId: { shopId: shop.id, userId: owner.id } },
        update: {},
        create: { shopId: shop.id, userId: owner.id, role: "owner" },
      });
    }
  }
  return ids;
}

/** Demo product listings: live + moderated, images backfilled, never overwritten. */
async function seedListings(
  users: Map<string, { id: string; profileId: string | null }>,
  shops: Map<string, string>
): Promise<number> {
  let n = 0;
  for (const l of LISTINGS) {
    const owner = users.get(l.sellerName);
    const rec = await prisma.listing.upsert({
      where: { slug: l.slug },
      update: {},
      create: {
        slug: l.slug,
        title: l.title,
        description: l.description,
        type: l.listingType as never,
        status: "active" as never,
        price: l.price,
        compareAt: l.compareAt ?? null,
        condition: l.condition as never,
        txMethod: l.transactionMethod as never,
        negotiable: l.negotiable,
        stock: l.stock,
        county: l.county,
        town: l.town,
        sellerName: l.sellerName,
        sellerPhone: l.sellerPhone ?? null,
        sellerProfileId: owner?.profileId ?? null,
        shopId: (l.shopSlug && shops.get(l.shopSlug)) || null,
        categorySlug: l.categorySlug,
        subcategory: l.subcategory ?? null,
        featured: l.featured ?? false,
        attributes: l.attributes ?? {},
      },
    });
    n += 1;
    const imgCount = await prisma.listingImage.count({ where: { listingId: rec.id } });
    if (imgCount === 0 && l.images.length > 0) {
      await prisma.listingImage.createMany({
        data: l.images.map((url, i) => ({ listingId: rec.id, url, position: i })),
      });
    }
  }
  return n;
}

/** Importable for the admin one-click seed; direct execution for CLI/Vercel builds. */
export async function runSeed(): Promise<SeedCounts> {
  try {
    return await main();
  } finally {
    await prisma.$disconnect().catch(() => null);
  }
}

const isCli = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("seed.ts");
if (isCli) {
  runSeed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
