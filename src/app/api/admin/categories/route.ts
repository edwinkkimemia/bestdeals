import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  deleteCategory,
  getCategories,
  getCategoryAdminData,
  isBuiltInCategory,
  restoreCategory,
  saveCategory,
} from "@/lib/categories";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { CATEGORIES } from "@/data/catalog";

const publicImage = (url: string) =>
  url.startsWith("https://") || url.startsWith("/uploads/") || url.startsWith("/api/files/");

const categorySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug is too short.")
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only."),
  name: z.string().trim().min(2, "Name is too short.").max(80),
  icon: z.string().trim().min(1).max(40).default("LayoutGrid"),
  blurb: z.string().trim().max(240).default(""),
  image: z.string().trim().min(1, "Add a category image.").max(2000),
  subcategories: z.array(z.string().trim().min(1).max(60)).min(1, "Add at least one subcategory.").max(30),
  attributes: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(40),
        label: z.string().trim().min(1).max(60),
        options: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
      })
    )
    .max(20)
    .default([]),
});

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    originalSlug: z.string().trim().max(60).optional(),
    category: categorySchema,
  }),
  z.object({ action: z.literal("delete"), slug: z.string().trim().min(1).max(60) }),
  z.object({ action: z.literal("restore"), slug: z.string().trim().min(1).max(60) }),
]);

async function requireAdmin() {
  const user = await currentUser().catch(() => null);
  return user && user.role === "ADMIN" ? user : null;
}

/** Admin-only: effective category list + hidden built-ins for the editor. */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { categories, hidden } = await getCategoryAdminData();
  return NextResponse.json({
    categories,
    hidden,
    builtInSlugs: CATEGORIES.map((c) => c.slug),
  });
}

/** Admin-only: create/update a category, hide/delete one, or restore a hidden built-in. */
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const rl = rateLimit(clientKey(req, `categories:${user.id}`), { limit: 60, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many category changes. Try again shortly." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the category details." }, { status: 400 });
  }

  if (parsed.data.action === "restore") {
    await restoreCategory(parsed.data.slug);
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "category.restore",
      entity: "category",
      entityId: parsed.data.slug,
    }).catch(() => {});
    revalidateCategoryPages();
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "delete") {
    await deleteCategory(parsed.data.slug);
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "category.delete",
      entity: "category",
      entityId: parsed.data.slug,
    }).catch(() => {});
    revalidateCategoryPages();
    return NextResponse.json({ ok: true });
  }

  const { category, originalSlug } = parsed.data;
  if (!publicImage(category.image)) {
    return NextResponse.json({ error: "Use an uploaded image or an https:// image URL." }, { status: 400 });
  }
  if (originalSlug && originalSlug !== category.slug) {
    return NextResponse.json({ error: "Category slugs can't be changed after creation." }, { status: 400 });
  }

  const effective = await getCategories();
  const slugTaken = effective.some((c) => c.slug === category.slug && c.slug !== originalSlug);
  if (!originalSlug && slugTaken) {
    return NextResponse.json({ error: "A category with that slug already exists." }, { status: 409 });
  }
  if (originalSlug && !effective.some((c) => c.slug === originalSlug) && !isBuiltInCategory(originalSlug)) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }
  const nameTaken = effective.some(
    (c) => c.slug !== originalSlug && c.name.toLowerCase() === category.name.toLowerCase()
  );
  if (nameTaken) {
    return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
  }

  const normalizedSubcategories = [...new Set(category.subcategories.map((s) => s.trim()).filter(Boolean))];
  if (normalizedSubcategories.length === 0) {
    return NextResponse.json({ error: "Add at least one subcategory." }, { status: 400 });
  }

  const saved = await saveCategory({
    ...category,
    subcategories: normalizedSubcategories,
  });
  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: originalSlug ? "category.update" : "category.create",
    entity: "category",
    entityId: saved.slug,
    reason: saved.name,
  }).catch(() => {});
  revalidateCategoryPages();
  return NextResponse.json({ ok: true, category: saved });
}

function revalidateCategoryPages() {
  try {
    revalidatePath("/", "layout");
  } catch {}
  try {
    revalidatePath("/sitemap.xml");
  } catch {}
}
