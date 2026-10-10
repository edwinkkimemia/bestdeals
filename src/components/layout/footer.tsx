import Image from "next/image";
import Link from "next/link";

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Marketplace",
    links: [
      { href: "/shop", label: "Shop Products" },
      { href: "/classifieds", label: "Classifieds" },
      { href: "/shops", label: "Business Shops" },
      { href: "/services", label: "Services" },
      { href: "/deals", label: "Best Deals" },
    ],
  },
  {
    title: "Selling",
    links: [
      { href: "/start-selling", label: "Sell on Chap" },
      { href: "/pricing", label: "Business Shop Plans" },
      { href: "/sell", label: "Create a Listing" },
      { href: "/advertising", label: "Advertising" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help Centre" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQs" },
      { href: "/safety", label: "Buyer Safety" },
      { href: "/sellers", label: "Seller Guidelines" },
    ],
  },
  {
    title: "Company & Legal",
    links: [
      { href: "/about", label: "About Chap" },
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/returns", label: "Returns & Refunds" },
      { href: "/shipping", label: "Shipping & Delivery" },
      { href: "/prohibited", label: "Prohibited Items" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-sand-50">
      <div className="container-bd grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Link href="/" aria-label="Chap home">
            <Image src="/chaplogo.png" alt="chap.co.ke" width={1147} height={287} className="h-9 w-auto" />
          </Link>
          <p className="mt-2 text-sm text-ink-500">Kenya&apos;s marketplace for everything. Find it. Sell it. Get the best deal.</p>
          <form action="/api/newsletter" method="post" className="mt-4 space-y-2" data-newsletter>
            <label htmlFor="nl-email" className="text-sm font-medium">Get deals by email (opt-in)</label>
            <div className="flex gap-2">
              <input id="nl-email" name="email" type="email" required placeholder="you@example.co.ke" className="input-bd" />
              <button className="btn-primary shrink-0" type="submit">Join</button>
            </div>
            <p className="text-xs text-ink-400">We email only with your consent. Unsubscribe anytime.</p>
          </form>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="mb-3 text-sm font-bold text-ink-900">{c.title}</p>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-sm text-ink-500 hover:text-brand-700 hover:underline">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-neutral-200">
        <div className="container-bd flex flex-col items-center justify-between gap-2 py-4 text-xs text-ink-400 sm:flex-row">
          <p>© {new Date().getFullYear()} chap.co.ke — Nairobi, Kenya. All prices in KES.</p>
          <p>M-Pesa payments via Daraja when configured. Never share your PIN.</p>
        </div>
      </div>
    </footer>
  );
}
