import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { sanitizeHtml, htmlExcerpt } from "@/lib/sanitize";

const isPublicImage = (u: string) =>
  u.length <= 2000 && (u.startsWith("https://") || u.startsWith("/uploads/") || u.startsWith("/api/files/"));

const schema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9-]+$/).optional(),
  excerpt: z.string().trim().max(300).optional().nullable(),
  coverUrl: z.string().trim().max(2000).optional().nullable(),
  bodyHtml: z.string().min(1).max(100_000).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

async function requireAdmin() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

/** Admin-only: update a post. Body is re-sanitized on write. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the form." }, { status: 400 });
  const store = getStore();
  const existing = await store.getBlogPost(params.id);
  if (!existing) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  const d = parsed.data;
  if (d.slug && d.slug !== existing.slug) {
    const taken = await store.getBlogPost(d.slug).catch(() => null);
    if (taken && taken.id !== existing.id) return NextResponse.json({ error: "That slug is taken." }, { status: 409 });
  }
  if (d.coverUrl && !isPublicImage(d.coverUrl)) {
    return NextResponse.json({ error: "Cover must be an uploaded image (JPG/PNG/WebP)." }, { status: 400 });
  }
  let clean: string | undefined;
  if (d.bodyHtml !== undefined) {
    clean = sanitizeHtml(d.bodyHtml);
    if (!clean.replace(/<[^>]*>/g, "").trim()) {
      return NextResponse.json({ error: "Article body is empty." }, { status: 400 });
    }
  }
  const post = await store.updateBlogPost(existing.id, {
    ...(d.title !== undefined ? { title: d.title } : {}),
    ...(d.slug !== undefined ? { slug: d.slug } : {}),
    ...(d.excerpt !== undefined ? { excerpt: d.excerpt?.trim() || (clean ? htmlExcerpt(clean) : null) } : {}),
    ...(d.coverUrl !== undefined ? { coverUrl: d.coverUrl?.trim() || null } : {}),
    ...(clean !== undefined ? { bodyHtml: clean } : {}),
    ...(d.status !== undefined ? { status: d.status } : {}),
  });
  if (!post) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  return NextResponse.json({ ok: true, post });
}

/** Admin-only: delete a post. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  await getStore().deleteBlogPost(params.id);
  return NextResponse.json({ ok: true });
}
