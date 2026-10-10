import Link from "next/link";
import { SHOP_PLANS } from "@/data/catalog";
import { formatKES } from "@/lib/format";

export const metadata = {
  title: "Sell on Chap",
  description: "List free as an individual or open a branded business shop. Photos from your phone, M-Pesa payouts, buyers across all 47 counties.",
};

export default function SellPage() {
  return (
    <div className="container-bd py-10">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Sell on <span className="text-brand-600">Chap</span></h1>
      <p className="mt-2 max-w-2xl text-ink-500">Free entry, paid growth. List as an individual in minutes, or open a branded shop for your business — buyers across all 47 counties, payouts via M-Pesa.</p>
      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <div className="card p-5"><p className="font-bold">1. Create free account</p><p className="mt-1 text-sm text-ink-500">Email + Kenyan phone number, verified by code. Accept the seller terms — individuals and shops alike.</p></div>
        <div className="card p-5"><p className="font-bold">2. List your item</p><p className="mt-1 text-sm text-ink-500">Daylight photos (4–8), honest description and condition, fair KES price, county & town. Uploads work straight from your phone; listings clear moderation within hours.</p></div>
        <div className="card p-5"><p className="font-bold">3. Get enquiries & orders</p><p className="mt-1 text-sm text-ink-500">Answer messages fast, deliver or meet safely, collect verified reviews — then grow into a shop plan when volume justifies it.</p></div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/auth/signup" className="btn-primary !h-12 !px-7">Create free account</Link>
        <Link href="/dashboard/listings/new" className="btn-secondary !h-12 !px-7">Post a listing</Link>
        <Link href="/pricing" className="btn-secondary !h-12 !px-7">Compare shop plans</Link>
      </div>

      <h2 className="section-title mt-10">Individual vs Business shop</h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="card p-5">
          <p className="font-bold">Individual sellers — free forever</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
            <li>Unlimited classified + product listings with moderation</li>
            <li>Buyer enquiries & messaging with spam protection</li>
            <li>Appear in combined search, related rails, and deal feeds</li>
            <li>Optional paid boosting for eligible listings</li>
          </ul>
          <Link href="/auth/signup" className="btn-secondary mt-4">Start free</Link>
        </div>
        <div className="card border-brand-600 p-5">
          <p className="font-bold">Business shops — from {formatKES(SHOP_PLANS[1].monthly)}/mo</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
            <li>Branded storefront at chap.co.ke/shops/your-name</li>
            <li>Catalogue, bulk CSV upload & inventory management</li>
            <li>Per-seller suborders, wholesale enquiry inbox, analytics</li>
            <li>Verified-business badge after permit review</li>
          </ul>
          <Link href="/pricing" className="btn-primary mt-4">See plans →</Link>
        </div>
      </div>

      <h2 className="section-title mt-10">What it costs — plainly</h2>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs text-ink-400">
              <th className="p-3">Action</th><th className="p-3">Individual</th><th className="p-3">Starter shop</th><th className="p-3">Growth / Pro</th>
            </tr>
          </thead>
          <tbody className="text-ink-700">
            <tr className="border-b border-neutral-100"><td className="p-3 font-semibold">List an item</td><td className="p-3">Free</td><td className="p-3">Free</td><td className="p-3">Free</td></tr>
            <tr className="border-b border-neutral-100"><td className="p-3 font-semibold">Storefront + plans</td><td className="p-3">—</td><td className="p-3">Free</td><td className="p-3">{formatKES(SHOP_PLANS[1].monthly)} / {formatKES(SHOP_PLANS[2].monthly)}/mo</td></tr>
            <tr className="border-b border-neutral-100"><td className="p-3 font-semibold">Buyer enquiries</td><td className="p-3">Free</td><td className="p-3">Free</td><td className="p-3">Free + bulk inbox</td></tr>
            <tr><td className="p-3 font-semibold">Featured visibility</td><td className="p-3">Pay per boost</td><td className="p-3">Pay per boost</td><td className="p-3">Credits included</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-400">Plan, price, billing period, and renewal are always shown before you confirm — no surprise debits. Failed or refunded payments are never counted as revenue.</p>

      <h2 className="section-title mt-10">Sellers who win do this</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "Photos sell", d: "Daylight, 4–8 shots, flaws shown. Listings with honest photos clear moderation fastest." },
          { t: "Price fairly", d: "Check the related-sellers rail for market price. 'Was' prices must be genuine." },
          { t: "Reply in minutes", d: "Response speed is the top sales driver. Enquiry alerts land by SMS and email." },
          { t: "Get verified", d: "ID or business permit → ✓ badge → buyer filters and more enquiries." },
        ].map((c) => (
          <div key={c.t} className="card p-4">
            <p className="font-bold">{c.t}</p>
            <p className="mt-1 text-sm text-ink-500">{c.d}</p>
          </div>
        ))}
      </div>

      <h2 className="section-title mt-10">Seller FAQs</h2>
      <div className="mt-4 space-y-2">
        {[
          { q: "How fast do listings go live?", a: "Moderation usually clears listings within hours. You'll see pending / active / rejected with reasons in your dashboard." },
          { q: "Do I need a shop to sell?", a: "No. Individuals sell free with full search visibility. Open a shop when you want branding, bulk tools, and wholesale enquiries." },
          { q: "How do I get paid?", a: "Shop checkout pays via M-Pesa, card, or cash on delivery. Classifieds are person-to-person: inspect, then pay face-to-face — never in advance." },
          { q: "What can't I sell?", a: "Weapons, drugs, counterfeits sold as genuine, stolen goods, scams, and the rest of the prohibited list. Violations mean removal or bans." },
        ].map((f) => (
          <details key={f.q} className="card group px-4 py-3">
            <summary className="cursor-pointer text-[15px] font-semibold marker:text-brand-600">{f.q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">{f.a}</p>
          </details>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/sellers" className="btn-secondary">Full seller guidelines</Link>
        <Link href="/prohibited" className="btn-secondary">Prohibited items</Link>
        <Link href="/dashboard/verify" className="btn-primary">Get verified</Link>
      </div>
    </div>
  );
}
