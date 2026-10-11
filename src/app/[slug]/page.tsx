import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { INFO_PAGES } from "@/content/info-pages";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { InfoSidebar } from "@/components/info-sidebar";
import { slugify } from "@/lib/utils";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return Object.keys(INFO_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const d = INFO_PAGES[params.slug];
  if (!d) return { title: "Page not found" };
  return {
    title: d.title,
    description: d.intro.slice(0, 160),
    alternates: { canonical: `https://chap.co.ke/${params.slug}` },
  };
}

export default function InfoPage({ params }: { params: { slug: string } }) {
  const d = INFO_PAGES[params.slug];
  if (!d) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbJsonLd([
        { name: "Home", url: "https://chap.co.ke/" },
        { name: d.title, url: `https://chap.co.ke/${params.slug}` },
      ]),
      ...(d.faqs && d.faqs.length > 0 ? [faqJsonLd(d.faqs)] : []),
    ],
  };

  return (
    <div className="container-bd py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: d.title }]} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <InfoSidebar current={`/${params.slug}`} />
        <div className="min-w-0 max-w-3xl">
      <h1 className="section-title mt-2">{d.title}</h1>
      <p className="mt-1 text-xs text-ink-400">Last updated: {d.updated}</p>
      <p className="mt-3 leading-relaxed text-ink-700">{d.intro}</p>

      {d.sections.length > 1 && (
        <nav aria-label="On this page" className="card mt-5 p-4">
          <p className="text-sm font-bold">On this page</p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {d.sections.map((s) => (
              <li key={s.heading}>
                <a href={`#${slugify(s.heading)}`} className="link-bd text-sm">{s.heading}</a>
              </li>
            ))}
            {d.faqs && d.faqs.length > 0 && (
              <li><a href="#faqs" className="link-bd text-sm">FAQs</a></li>
            )}
          </ul>
        </nav>
      )}

      {d.sections.map((s) => (
        <section key={s.heading} id={slugify(s.heading)} className="mt-8 scroll-mt-24">
          <h2 className="text-xl font-bold tracking-tight text-ink-900">{s.heading}</h2>
          <div className="mt-3 space-y-3">
            {s.blocks.map((b, i) => {
              if (b.type === "p") {
                return <p key={i} className="text-[15px] leading-relaxed text-ink-700">{b.text}</p>;
              }
              if (b.type === "list") {
                return (
                  <ul key={i} className="space-y-2">
                    {b.items.map((it, k) => (
                      <li key={k} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-700">
                        <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <div key={i} className="flex flex-wrap gap-2 pt-1">
                  {b.links.map((l) => (
                    <Link key={l.href} href={l.href} className="btn-secondary !h-9 !px-4 !text-[13px]">{l.label} →</Link>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {d.faqs && d.faqs.length > 0 && (
        <section id="faqs" className="mt-8 scroll-mt-24">
          <h2 className="text-xl font-bold tracking-tight text-ink-900">FAQs</h2>
          <div className="mt-3 space-y-2">
            {d.faqs.map((f) => (
              <details key={f.q} className="card group px-4 py-3">
                <summary className="cursor-pointer text-[15px] font-semibold text-ink-900 marker:text-brand-600">
                  {f.q}
                </summary>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <section className="card mt-8 bg-sand-50 p-5">
        <p className="text-sm font-bold">Keep reading</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {d.related.map((r) => (
            <Link key={r.href} href={r.href} className="chip hover:border-brand-600">{r.label} →</Link>
          ))}
        </div>
      </section>

      <Link href="/" className="link-bd mt-6 inline-block text-sm">← Back home</Link>
        </div>
      </div>
    </div>
  );
}
