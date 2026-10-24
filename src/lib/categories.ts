/**
 * Category registry: built-in catalogue categories + admin edits.
 *
 * The base taxonomy lives in `src/data/catalog.ts` so demo data and tests keep
 * working without a database. Admin changes are stored as one settings row
 * (works in both DemoStore and Postgres) and merged on read, which keeps
 * existing static category helpers as a safe fallback.
 */
import { cache } from "react";
import { CATEGORIES, type Category } from "@/data/catalog";
import { getStore, storeRead } from "@/lib/store";
import { slugify } from "@/lib/utils";

export const CATEGORY_REGISTRY_KEY = "catalog_categories_v1";

export type CategoryRegistry = {
  /** Full replacement values for built-in categories, keyed by slug. */
  edits: Record<string, Category>;
  /** Admin-created categories (appended after the built-ins). */
  custom: Category[];
  /** Built-in slugs hidden from the storefront without losing their listings. */
  removed: string[];
};

const EMPTY_REGISTRY: CategoryRegistry = { edits: {}, custom: [], removed: [] };

const cleanText = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** Defensive parse for values coming from the settings table. */
export function normalizeCategory(input: unknown): Category | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const slug = slugify(cleanText(raw.slug, 80)).slice(0, 60);
  const name = cleanText(raw.name, 80);
  const image = cleanText(raw.image, 2000);
  if (!slug || !name || !image) return null;

  const subcategories = Array.isArray(raw.subcategories)
    ? [...new Set(raw.subcategories.map((s) => cleanText(s, 60)).filter(Boolean))].slice(0, 30)
    : [];
  const attributes = Array.isArray(raw.attributes)
    ? raw.attributes
        .map((a) => {
          if (!a || typeof a !== "object") return null;
          const attr = a as Record<string, unknown>;
          const key = slugify(cleanText(attr.key, 40)).slice(0, 40);
          const label = cleanText(attr.label, 60);
          if (!key || !label) return null;
          const options = Array.isArray(attr.options)
            ? [...new Set(attr.options.map((o) => cleanText(o, 60)).filter(Boolean))].slice(0, 30)
            : undefined;
          return { key, label, ...(options && options.length > 0 ? { options } : {}) };
        })
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
        .slice(0, 20)
    : [];

  return {
    slug,
    name,
    icon: cleanText(raw.icon, 40) || "LayoutGrid",
    blurb: cleanText(raw.blurb, 240),
    image,
    subcategories: subcategories.length > 0 ? subcategories : ["General"],
    attributes,
  };
}

/** Merge the built-in taxonomy with an admin registry (pure, testable). */
export function mergeCategories(
  registry: CategoryRegistry,
  base: Category[] = CATEGORIES
): Category[] {
  const removed = new Set(registry.removed);
  const out: Category[] = [];
  const seen = new Set<string>();

  for (const category of base) {
    if (removed.has(category.slug)) continue;
    const effective = registry.edits[category.slug] ?? category;
    if (seen.has(effective.slug)) continue;
    out.push(effective);
    seen.add(effective.slug);
  }

  for (const category of registry.custom) {
    if (removed.has(category.slug) || seen.has(category.slug)) continue;
    out.push(category);
    seen.add(category.slug);
  }

  return out;
}

async function readRegistry(): Promise<CategoryRegistry> {
  const raw = await storeRead((store) => store.getSetting(CATEGORY_REGISTRY_KEY), null);
  if (!raw || typeof raw !== "object") return EMPTY_REGISTRY;
  const data = raw as Record<string, unknown>;

  const edits: Record<string, Category> = {};
  if (data.edits && typeof data.edits === "object" && !Array.isArray(data.edits)) {
    for (const [slug, value] of Object.entries(data.edits as Record<string, unknown>)) {
      const category = normalizeCategory(value);
      if (category && category.slug === slug) edits[slug] = category;
    }
  }

  const custom = Array.isArray(data.custom)
    ? data.custom
        .map(normalizeCategory)
        .filter((c): c is Category => Boolean(c))
    : [];

  const removed = Array.isArray(data.removed)
    ? [...new Set(data.removed.filter((s): s is string => typeof s === "string" && s.length > 0))]
    : [];

  return { edits, custom, removed };
}

/** Per-request dedupe in Next's server runtime; plain Node (tests/scripts) gets a no-op. */
const requestCache = <T,>(fn: T): T =>
  typeof cache === "function" ? (cache as unknown as (f: T) => T)(fn) : fn;

/** All storefront categories after admin edits, additions and removals. */
export const getCategories = requestCache(async (): Promise<Category[]> => {
  return mergeCategories(await readRegistry());
});

export const getCategoryBySlug = requestCache(async (slug: string): Promise<Category | undefined> => {
  if (!slug) return undefined;
  return (await getCategories()).find((c) => c.slug === slug);
});

/** Registry + hidden built-ins for the admin screen. */
export const getCategoryAdminData = requestCache(async () => {
  const registry = await readRegistry();
  const categories = mergeCategories(registry);
  const hidden = CATEGORIES.filter((c) => registry.removed.includes(c.slug));
  return { registry, categories, hidden };
});

export const isBuiltInCategory = (slug: string): boolean =>
  CATEGORIES.some((category) => category.slug === slug);

/** Persist a new or edited category. Slug changes are not supported for safety. */
export async function saveCategory(category: Category): Promise<Category> {
  const registry = await readRegistry();
  const normalized = normalizeCategory(category);
  if (!normalized) throw new Error("Category name, slug and image are required.");

  if (isBuiltInCategory(normalized.slug)) {
    registry.edits[normalized.slug] = normalized;
    registry.removed = registry.removed.filter((slug) => slug !== normalized.slug);
  } else {
    registry.custom = [
      ...registry.custom.filter((c) => c.slug !== normalized.slug),
      normalized,
    ];
    registry.removed = registry.removed.filter((slug) => slug !== normalized.slug);
  }

  await getStore().setSetting(CATEGORY_REGISTRY_KEY, registry);
  return normalized;
}

/** Hide a built-in category or remove an admin-created one. Listings are untouched. */
export async function deleteCategory(slug: string): Promise<void> {
  const registry = await readRegistry();
  const clean = slugify(slug);
  if (!clean) throw new Error("Category slug is required.");

  if (isBuiltInCategory(clean)) {
    delete registry.edits[clean];
    if (!registry.removed.includes(clean)) registry.removed.push(clean);
  } else {
    registry.custom = registry.custom.filter((category) => category.slug !== clean);
    registry.removed = registry.removed.filter((removed) => removed !== clean);
  }

  await getStore().setSetting(CATEGORY_REGISTRY_KEY, registry);
}

/** Bring a hidden built-in category back with its original values. */
export async function restoreCategory(slug: string): Promise<void> {
  const registry = await readRegistry();
  const clean = slugify(slug);
  if (!isBuiltInCategory(clean)) return;
  delete registry.edits[clean];
  registry.removed = registry.removed.filter((removed) => removed !== clean);
  await getStore().setSetting(CATEGORY_REGISTRY_KEY, registry);
}

/** Server-side validation for listing intake against the effective taxonomy. */
export async function categorySelectionError(
  categorySlug: string,
  subcategory?: string | null
): Promise<string | null> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return "Choose a valid category.";
  const sub = (subcategory ?? "").trim();
  if (!sub) return null;
  const valid = category.subcategories.some((s) => s.toLowerCase() === sub.toLowerCase());
  return valid ? null : "Pick a subcategory from the list.";
}
