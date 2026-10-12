import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { sanitizeHtml, htmlExcerpt } from "@/lib/sanitize";
import { slugify } from "@/lib/utils";

const isPublicImage = (u: string) =>
  u.length <= 2000 && (u.startsWith("https://") || u.startsWith("/uploads/") || u.startsWith("/api/files/"));

const schema = z.object({
  title: z.string().trim().min(3).max(140),
  slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9-]+$/).optional(),
  excerpt: z.string().trim().max(300).optional().nullable(),
  coverUrl: z.string().trim().max(2000).optional().nullable(),
  bodyHtml: z.string().min(1).max(100_000),
  status: z.enum(["draft", "published"]).optional(),
});

async function requireAdmin() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

async function uniqueSlug(base: string): Promise<string> {
  const store = getStore();
  let slug = slugify(base).slice(0, 80) || "post";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const taken = await store.getBlogPost(candidate).catch(() => null);
    if (!taken) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

/** Admin-only: list all posts (drafts + published). */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const items = await getStore().listBlogPosts("all");
  return NextResponse.json({ items });
}

/** Admin-only: create a post. Body is sanitized to an allowlist on write. */
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const rl = rateLimit(clientKey(req, `blog:${user.id}`), { limit: 30, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many updates. Try again later." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the form." }, { status: 400 });
  const d = parsed.data;
  if (d.coverUrl && !isPublicImage(d.coverUrl)) {
    return NextResponse.json({ error: "Cover must be an uploaded image (JPG/PNG/WebP)." }, { status: 400 });
  }
  const clean = sanitizeHtml(d.bodyHtml);
  if (!clean.replace(/<[^>]*>/g, "").trim()) {
    return NextResponse.json({ error: "Article body is empty." }, { status: 400 });
  }
  const slug = await uniqueSlug(d.slug || d.title);
  const post = await getStore().createBlogPost({
    slug,
    title: d.title,
    excerpt: d.excerpt?.trim() || htmlExcerpt(clean),
    coverUrl: d.coverUrl?.trim() || null,
    bodyHtml: clean,
    status: d.status ?? "draft",
    authorId: user.id,
    authorName: user.name,
  });
  return NextResponse.json({ ok: true, post });
}
