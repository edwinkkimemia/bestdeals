import Link from "next/link";
import type { Metadata } from "next";
import { storeRead } from "@/lib/store";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { BlogSidebar } from "@/components/blog-sidebar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description: "Guides, safety tips and marketplace news from Chap — Kenya's marketplace for everything.",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default async function BlogIndex() {
  const posts = await storeRead((s) => s.listBlogPosts("published"), []);
  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Blog" }]} />
      <h1 className="section-title mt-2">Chap blog</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">Guides, safety tips and marketplace news from the Chap team.</p>
      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
      {posts.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-bold">No articles yet</p>
          <p className="mt-1 text-sm text-ink-500">Check back soon — our first guides are on the way.</p>
          <Link href="/" className="btn-primary mt-4">Back home</Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="card overflow-hidden hover:shadow-lg">
              {p.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverUrl} alt="" loading="lazy" className="h-40 w-full object-cover" />
              ) : (
                <div aria-hidden className="flex h-24 w-full items-center justify-center bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 text-3xl font-black text-white/80">
                  {p.title.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="p-4">
                <p className="font-bold leading-snug">{p.title}</p>
                <p className="clamp-2 mt-1 text-sm text-ink-500">{p.excerpt ?? ""}</p>
                <p className="mt-2 text-xs text-ink-400">
                  {fmtDate(p.publishedAt ?? p.createdAt)}{p.authorName ? ` · ${p.authorName}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
      <BlogSidebar />
      </div>
    </div>
  );
}
