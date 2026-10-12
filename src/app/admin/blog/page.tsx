import Link from "next/link";
import { Newspaper, Plus } from "lucide-react";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog", robots: { index: false, follow: false } };

export default async function AdminBlog({ searchParams }: { searchParams: { status?: string } }) {
  const tabs = ["all", "published", "draft"] as const;
  const tab = (tabs as readonly string[]).includes(searchParams.status ?? "") ? searchParams.status! : "all";
  const items = await getStore().listBlogPosts(tab === "all" ? undefined : tab);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="section-title flex items-center gap-2"><Newspaper className="h-6 w-6 text-brand-600" /> Blog ({items.length})</h1>
        <Link href="/admin/blog/new" className="btn-primary !py-2 text-sm"><Plus className="h-4 w-4" /> New post</Link>
      </div>
      <p className="mt-1 text-sm text-ink-500">Admin-authored articles with a rich-text editor. Only <strong>published</strong> posts appear on <Link href="/blog" className="link-bd">/blog</Link>.</p>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist">
        {tabs.map((t) => (
          <Link key={t} href={`/admin/blog?status=${t}`} className={`chip ${tab === t ? "!border-brand-600 !text-brand-700" : ""}`}>{t}</Link>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="card mt-4 p-6 text-center text-sm">
          <p className="font-bold">No posts {tab === "all" ? "yet" : tab}</p>
          <Link href="/admin/blog/new" className="btn-primary mt-3">Write the first post</Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((p) => (
            <li key={p.id} className="card flex flex-wrap items-center gap-3 p-3 text-sm">
              {p.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverUrl} alt="" className="h-11 w-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg bg-sand-100 text-lg font-black text-ink-400">
                  {p.title.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <strong>{p.title}</strong>{" "}
                <span className="text-ink-400">· /blog/{p.slug}</span>{" "}
                <span className="chip">{p.status}</span>
                <span className="block truncate text-xs text-ink-400">{p.excerpt ?? "No excerpt"}</span>
              </span>
              <Link href={`/admin/blog/${p.id}`} className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs">Edit</Link>
              <Link href={p.status === "published" ? `/blog/${p.slug}` : `/admin/blog/${p.id}`} className="link-bd text-xs">
                {p.status === "published" ? "View →" : "Preview →"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
