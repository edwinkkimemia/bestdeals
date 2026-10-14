import Link from "next/link";
import { SHOP_PLANS, BOOST_PRODUCTS, planListings } from "@/data/catalog";
import { formatKES } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { InfoSidebar } from "@/components/info-sidebar";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";

export const metadata = {
  title: "Business Shop Plans & Pricing",
  description: "Free, Silver and Gold shop plans in KES. Published limits, no surprise charges.",
  alternates: { canonical: "https://chap.co.ke/pricing" },
};

const FAQS = [
  { q: "Can I change or cancel anytime?", a: "Yes. Upgrades apply immediately, downgrades at the next cycle, and cancelling drops you to Free — your shop and listings stay intact within Free limits." },
  { q: "What happens if a payment fails?", a: "We retry and notify you; failed payments never count as revenue and never trigger surprise debits. Your shop stays readable throughout a grace period." },
  { q: "Do commissions apply to classifieds?", a: "No — person-to-person classified deals settle between buyer and seller. Commissions only apply to on-site checkout orders where configured." },
  { q: "Is Silver worth it?", a: "Free covers 5 listings forever. When you outgrow 5 listings or want featured boosts and better analytics, Silver pays for itself." },
];

export default function PricingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbJsonLd([
        { name: "Home", url: "https://chap.co.ke/" },
        { name: "Business Shop Plans", url: "https://chap.co.ke/pricing" },
      ]),
      faqJsonLd(FAQS),
    ],
  };
  return (
    <div className="container-bd pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Business Shop Plans" }]} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <InfoSidebar current="/pricing" />
        <div className="min-w-0">
      <h1 className="section-title">Business shop plans</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">Start free, upgrade when growth pays for itself. Prices in KES, limits published, and every charge shows plan, price, billing period, and renewal before you confirm. Individual sellers get the same Silver/Gold limits on their personal seller plan — no storefront needed.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SHOP_PLANS.map((p) => (
          <div key={p.id} className={`card flex flex-col p-6 ${p.id === "silver" ? "border-2 border-brand-600" : ""}`}>
            {p.id === "silver" && <Badge tone="blue">Most popular</Badge>}
            <p className="mt-2 text-xl font-bold">{p.name}</p>
            <p className="mt-1 text-3xl font-extrabold">{p.monthly === 0 ? "Free" : formatKES(p.monthly)}<span className="text-sm font-normal text-ink-400">/mo</span></p>
            <p className="text-xs text-ink-400">{p.monthly === 0 ? "forever free" : `${formatKES(p.annual)}/year (2 months free)`} · {Number.isFinite(p.listings) ? `up to ${planListings(p)} listings` : "unlimited listings"}</p>
            <ul className="mt-4 flex-1 space-y-1.5 text-sm">
              {p.features.map((f) => <li key={f}>✓ {f}</li>)}
            </ul>
            <Link href={`/dashboard/plan?plan=${p.id}`} className={p.id === "silver" ? "btn-primary mt-5 w-full" : "btn-secondary mt-5 w-full"}>Choose {p.name}</Link>
          </div>
        ))}
      </div>

      <div className="card mt-6 p-5 text-sm">
        <p className="font-bold">Beyond plans: pay only for extra growth</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-700">
          <li><strong>Featured listings & sponsored placements</strong> — clearly labelled, never overriding safety or relevance.</li>
          <li><strong>Transaction commissions</strong> — only where the checkout model supports them, configured per category and shown before you sell.</li>
          <li><strong>Wholesale enquiry tools</strong> — bulk-buyer inbox and quote workflows for institutional orders.</li>
        </ul>
      </div>

      <h2 className="section-title mt-10">Promote a single listing</h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">No plan needed — boost any active listing with a photo. Featured badge for the full window, pay once via M-Pesa.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {BOOST_PRODUCTS.map((b) => (
          <div key={b.id} className="card flex flex-col p-5">
            <p className="text-lg font-bold">{b.name} <Badge tone="green">Featured</Badge></p>
            <p className="mt-1 text-2xl font-extrabold">{formatKES(b.price)}<span className="text-sm font-normal text-ink-400"> one-time</span></p>
            <p className="mt-1 flex-1 text-sm text-ink-500">{b.blurb} Labelled Featured throughout.</p>
            <Link href="/dashboard/promotion" className="btn-primary mt-4 w-full">Boost a listing</Link>
          </div>
        ))}
      </div>

      <h2 className="section-title mt-10">Billing questions, answered</h2>
      <div className="mt-4 space-y-2">
        {FAQS.map((f) => (
          <details key={f.q} className="card group px-4 py-3">
            <summary className="cursor-pointer text-[15px] font-semibold marker:text-brand-600">{f.q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">{f.a}</p>
          </details>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/dashboard/shop" className="btn-primary">Open my shop</Link>
        <Link href="/advertising" className="btn-secondary">Advertising options</Link>
      </div>
        </div>
      </div>
    </div>
  );
}
