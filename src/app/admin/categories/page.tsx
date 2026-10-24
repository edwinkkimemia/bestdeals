import { LayoutGrid } from "lucide-react";
import { CATEGORIES, LISTINGS } from "@/data/catalog";
import { getCategoryAdminData } from "@/lib/categories";
import { storeRead } from "@/lib/store";
import { CategoryManager } from "./category-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories", robots: { index: false, follow: false } };

export default async function AdminCategoriesPage() {
  const { categories, hidden } = await getCategoryAdminData();
  const live = await storeRead((store) => store.listListingsByStatus("active"), []);
  const counts: Record<string, number> = {};
  for (const listing of [...LISTINGS, ...live]) {
    const slug = listing.categorySlug;
    if (!slug) continue;
    counts[slug] = (counts[slug] ?? 0) + 1;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-ink-500">
        <LayoutGrid className="h-4 w-4 text-brand-600" />
        Storefront taxonomy and category artwork.
      </div>
      <CategoryManager
        categories={categories}
        hidden={hidden}
        counts={counts}
        builtInSlugs={CATEGORIES.map((c) => c.slug)}
      />
    </div>
  );
}
