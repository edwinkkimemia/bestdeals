import Link from "next/link";
import { cn } from "@/lib/utils";

const GROUPS: { title: string; links: { href: string; label: string }[] }[] = [
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

/**
 * Guide sidebar for static pages (Selling / Support / Company & Legal).
 * Sticky rail on desktop, accordion on mobile. `current` highlights the page.
 */
export function InfoSidebar({ current }: { current: string }) {
  return (
    <>
      <details className="card px-4 py-3 lg:hidden">
        <summary className="cursor-pointer text-sm font-bold">Browse guides & policies</summary>
        <div className="mt-3 space-y-4">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">{g.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={current === l.href ? "page" : undefined}
                    className={cn(
                      "chip hover:border-brand-600",
                      current === l.href && "!border-brand-600 !bg-brand-50 !text-brand-700 font-bold"
                    )}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
      <aside className="hidden lg:block">
        <div className="sticky top-36 space-y-5">
          {GROUPS.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">{g.title}</p>
              <ul className="space-y-0.5 border-l border-neutral-200">
                {g.links.map((l) => {
                  const active = current === l.href;
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "-ml-px block border-l-2 py-1 pl-3 text-sm",
                          active
                            ? "border-brand-600 font-semibold text-brand-700"
                            : "border-transparent text-ink-500 hover:border-brand-300 hover:text-brand-700"
                        )}
                      >
                        {l.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>
      </aside>
    </>
  );
}
