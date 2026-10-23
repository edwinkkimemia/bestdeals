import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
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

  const whatsappHref = support.whatsapp
    ? `https://wa.me/${support.whatsapp.replace(/\D/g, "").replace(/^0/, "254")}`
    : null;

  return (
    <footer className="relative mt-16 border-t border-neutral-200 bg-sand-50">
      <div className="container-bd">
        <div className="grid gap-8 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12 lg:py-12">
          <div>
            <Link href="/" aria-label="Chap home" className="inline-flex">
              <Image src="/chaplogo.png" alt="chap.co.ke" width={1147} height={287} className="h-8 w-auto sm:h-9" />
            </Link>
            <h2 className="mt-5 max-w-2xl text-3xl font-black leading-[1.08] tracking-tight text-ink-900 sm:text-4xl">
              Find it. Sell it. <span className="text-brand-600">Get the best deal.</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-500">
              Shop trusted businesses, discover local services, or turn what you have into your next sale — all in one Kenyan marketplace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/browse"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50"
              >
                Browse products <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/start-selling"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-ink-900 transition hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50"
              >
                Start selling
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-500">
              <a href={`mailto:${support.email}`} className="inline-flex items-center gap-1.5 transition hover:text-brand-700">
                <Mail className="h-4 w-4" /> {support.email}
              </a>
              {support.phone && (
                <a href={`tel:${support.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 transition hover:text-brand-700">
                  <Phone className="h-4 w-4" /> {support.phone}
                </a>
              )}
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-brand-700">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
            </div>
            <div className="mt-5 flex items-center gap-2" aria-label="Follow Chap">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  title={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink-500 transition hover:border-brand-600 hover:text-brand-700"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">Deals by email</p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-ink-900">The best of Chap, in your inbox.</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">
              Fresh finds and local offers, sent when they&apos;re worth opening.
            </p>
            <form action="/api/newsletter" method="post" className="mt-4 space-y-2.5" data-newsletter>
              <label htmlFor="nl-email" className="sr-only">Email address</label>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-2">
                <input
                  id="nl-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  inputMode="email"
                  spellCheck={false}
                  enterKeyHint="send"
                  required
                  placeholder="you@example.co.ke"
                  className="h-12 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-5 text-base text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 sm:h-11 sm:px-4 sm:text-sm"
                />
                <button
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:h-11"
                  type="submit"
                >
                  Join <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-500">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                <span>
                  We email only with your consent. Read our{" "}
                  <Link href="/privacy" className="underline decoration-neutral-300 underline-offset-2 transition hover:text-brand-600">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </p>
            </form>
          </div>
        </div>

        <div className="grid gap-4 border-y border-neutral-200 py-5 sm:grid-cols-3 sm:gap-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">Verified businesses</p>
              <p className="mt-0.5 text-xs text-ink-500">Look for verified sellers.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Smartphone className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">M-Pesa & cash on delivery</p>
              <p className="mt-0.5 text-xs text-ink-500">Check out the way that suits you.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">Made for Kenya</p>
              <p className="mt-0.5 text-xs text-ink-500">Local sellers, counties and services.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden bg-ink-900 text-white">
        <div aria-hidden className="h-1 bg-gradient-to-r from-brand-700 via-brand-500 to-accent-500" />
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-32 h-72 w-72 rounded-full bg-brand-600/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-accent-500/10 blur-3xl" />
        </div>
        <div className="container-bd relative">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 py-9 sm:grid-cols-4">
            {COLS.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">{c.title}</p>
                <ul className="mt-3 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.href + l.label}>
                      <Link href={l.href} className="text-sm text-white/60 transition hover:text-white hover:underline">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} chap.co.ke — Nairobi, Kenya. All prices in KES.</p>
            <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-2">
              <Link href="/safety" className="transition hover:text-white hover:underline">Buyer Safety</Link>
              <Link href="/sellers" className="transition hover:text-white hover:underline">Seller Guidelines</Link>
              <Link href="/terms" className="transition hover:text-white hover:underline">Terms</Link>
              <Link href="/privacy" className="transition hover:text-white hover:underline">Privacy</Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
