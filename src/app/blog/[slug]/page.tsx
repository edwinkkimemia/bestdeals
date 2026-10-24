import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { storeRead } from "@/lib/store";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { ShareRow } from "@/components/share-row";
import { BlogSidebar } from "@/components/blog-sidebar";
import { InArticleAd } from "@/components/ads";
import { AD_SLOTS } from "@/lib/ads";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await storeRead((s) => s.getBlogPost(params.slug), null);
  if (!post || post.status !== "published") return { title: "Article not found", robots: { index: false, follow: true } };
  const description = (post.excerpt ?? "").slice(0, 160) || post.title;
  const canonical = `https://chap.co.ke/blog/${post.slug}`;
  return {
    title: post.title,
    description,
    keywords: [post.title, "Kenya marketplace", "buying guide Kenya", "chap.co.ke"],
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: canonical,
      siteName: "chap.co.ke",
      locale: "en_KE",
      ...(post.publishedAt ? { publishedTime: post.publishedAt } : {}),
      ...(post.updatedAt ? { modifiedTime: post.updatedAt } : {}),
      ...(post.coverUrl ? { images: [{ url: post.coverUrl, alt: post.title }] } : {}),
    },
    twitter: { card: "summary_large_image", title: post.title, description, ...(post.coverUrl ? { images: [post.coverUrl] } : {}) },
    robots: { index: true, follow: true },
  };
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

export default async function BlogArticle({ params }: { params: { slug: string } }) {
  const post = await storeRead((s) => s.getBlogPost(params.slug), null);
  if (!post || post.status !== "published") notFound();
  const more = (await storeRead((s) => s.listBlogPosts("published"), [])).filter((p) => p.id !== post.id).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      articleJsonLd({
        title: post.title,
        description: post.excerpt ?? post.title,
        url: `https://chap.co.ke/blog/${post.slug}`,
        image: post.coverUrl ?? undefined,
        datePublished: post.publishedAt ?? post.createdAt ?? undefined,
        dateModified: post.updatedAt ?? post.publishedAt ?? undefined,
        authorName: post.authorName ?? undefined,
      }),
      breadcrumbJsonLd([
        { name: "Home", url: "https://chap.co.ke/" },
        { name: "Blog", url: "https://chap.co.ke/blog" },
        { name: post.title, url: `https://chap.co.ke/blog/${post.slug}` },
      ]),
    ],
  };
  return (
    <div className="container-bd py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { href: "/blog", label: "Blog" }, { label: post.title.slice(0, 40) }]} />
      <div className="mt-4 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-3xl">{post.title}</h1>
        <p className="mt-2 text-xs text-ink-400">
          {fmtDate(post.publishedAt ?? post.createdAt)}{post.authorName ? ` · By ${post.authorName}` : ""}
        </p>
        {post.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverUrl} alt="" className="mt-4 max-h-96 w-full rounded-card object-cover" />
        )}
        {/* bodyHtml is sanitized to an allowlist on write (admin API) */}
        <div className="blog-body mt-5 text-[15px] leading-relaxed text-ink-700" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
        <InArticleAd slot={AD_SLOTS.article} />
        <div className="mt-6"><ShareRow title={post.title} text={post.excerpt ?? post.title} /></div>
      </article>
      {more.length > 0 && (
        <section className="mx-auto mt-10 max-w-3xl">
          <h2 className="font-bold">More articles</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {more.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="card p-4 hover:border-brand-600">
                <p className="text-sm font-bold leading-snug">{p.title}</p>
                <p className="clamp-2 mt-1 text-xs text-ink-500">{p.excerpt ?? ""}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      </div>
      <BlogSidebar latestPosts={more.map((p) => ({ slug: p.slug, title: p.title }))} />
      </div>
    </div>
  );
}
