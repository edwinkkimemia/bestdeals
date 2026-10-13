import Link from "next/link";
import { notFound } from "next/navigation";
import { Newspaper } from "lucide-react";
import { getStore } from "@/lib/store";
import { BlogForm } from "@/components/admin/blog-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog editor", robots: { index: false, follow: false } };

export default async function AdminBlogEdit({ params }: { params: { id: string } }) {
  if (params.id === "new") {
    return (
      <div>
        <h1 className="section-title flex items-center gap-2"><Newspaper className="h-6 w-6 text-brand-600" /> New post</h1>
        <div className="mt-4">
          <BlogForm initial={{ slug: "", title: "", excerpt: null, coverUrl: null, bodyHtml: "", status: "draft" }} />
        </div>
      </div>
    );
  }
  const post = await getStore().getBlogPost(params.id);
  if (!post) notFound();
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="section-title flex items-center gap-2"><Newspaper className="h-6 w-6 text-brand-600" /> Edit post</h1>
        {post.status === "published" && (
          <Link href={`/blog/${post.slug}`} className="link-bd text-sm">View live →</Link>
        )}
      </div>
      <div className="mt-4">
        <BlogForm
          initial={{
            id: post.id,
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            coverUrl: post.coverUrl,
            bodyHtml: post.bodyHtml,
            status: post.status,
          }}
        />
      </div>
    </div>
  );
}
