import Image from "next/image";
import Link from "next/link";
import { storeRead } from "@/lib/store";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Brand social profiles — update hrefs if handles change.
const SOCIALS = [
  { label: "Chap on X", href: "https://x.com/chap_co_ke", Icon: XIcon },
  { label: "Chap on Facebook", href: "https://www.facebook.com/chap.co.ke", Icon: FacebookIcon },
  { label: "Chap on Instagram", href: "https://www.instagram.com/chap.co.ke", Icon: InstagramIcon },
  { label: "Chap on YouTube", href: "https://www.youtube.com/@chapcoke", Icon: YoutubeIcon },
];

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Marketplace",
    links: [
      { href: "/browse", label: "Browse Products" },
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
      { href: "/blog", label: "Blog" },
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/returns", label: "Returns & Refunds" },
      { href: "/shipping", label: "Shipping & Delivery" },
      { href: "/prohibited", label: "Prohibited Items" },
    ],
  },
];

export async function Footer() {
  // Support contacts are managed in Admin → Settings; email always visible via default.
  const support = await storeRead(async (s) => {
    const [email, phone, whatsapp] = await Promise.all([
      s.getSetting("support_email").catch(() => null),
      s.getSetting("support_phone").catch(() => null),
      s.getSetting("support_whatsapp").catch(() => null),
    ]);
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    return { email: str(email) ?? "support@chap.co.ke", phone: str(phone), whatsapp: str(whatsapp) };
  }, { email: "support@chap.co.ke", phone: null, whatsapp: null });
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-sand-50">
      <div className="container-bd grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Link href="/" aria-label="Chap home">
            <Image src="/chaplogo.png" alt="chap.co.ke" width={1147} height={287} className="h-9 w-auto" />
          </Link>
          <p className="mt-2 text-sm text-ink-500">Kenya&apos;s marketplace for everything. Find it. Sell it. Get the best deal.</p>
          {(support.email || support.phone || support.whatsapp) && (
            <p className="mt-2 text-sm text-ink-500">
              Support:{" "}
              {support.email && <a href={`mailto:${support.email}`} className="link-bd">{support.email}</a>}
              {support.email && (support.phone || support.whatsapp) && " · "}
              {support.phone && <a href={`tel:${support.phone.replace(/\s/g, "")}`} className="link-bd">{support.phone}</a>}
              {support.phone && support.whatsapp && " · "}
              {support.whatsapp && (
                <a href={`https://wa.me/${support.whatsapp.replace(/\D/g, "").replace(/^0/, "254")}`} target="_blank" rel="noreferrer" className="link-bd">WhatsApp</a>
              )}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2" aria-label="Follow Chap">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink-500 transition hover:border-brand-600 hover:text-brand-700">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
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
          <p>Cash on delivery · Buyer Safety · Seller Guidelines</p>
        </div>
      </div>
    </footer>
  );
}
