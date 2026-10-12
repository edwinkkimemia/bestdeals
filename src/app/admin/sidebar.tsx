"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  ExternalLink,
  Flag,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Newspaper,
  Package,
  Receipt,
  Scale,
  Settings,
  Star,
  Store,
  Ticket,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard, exact: true },
  { href: "/admin/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/admin/listings", label: "Listings", Icon: Package },
  { href: "/admin/verifications", label: "Verifications", Icon: BadgeCheck },
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/shops", label: "Shops", Icon: Store },
  { href: "/admin/orders", label: "Orders", Icon: Receipt },
  { href: "/admin/disputes", label: "Disputes", Icon: Scale },
  { href: "/admin/reports", label: "Reports", Icon: Flag },
  { href: "/admin/reviews", label: "Reviews", Icon: Star },
  { href: "/admin/promotions", label: "Promotions", Icon: Megaphone },
  { href: "/admin/coupons", label: "Coupons", Icon: Ticket },
  { href: "/admin/blog", label: "Blog", Icon: Newspaper },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
];

export function AdminSidebar() {
  const path = usePathname();
  const router = useRouter();
  const isActive = (href: string, exact?: boolean) =>
    exact ? path === href : path === href || path.startsWith(`${href}/`);

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST", headers: { "Content-Type": "application/json" } });
    } catch {}
    router.push("/");
    router.refresh();
  };

  return (
    <aside aria-label="Admin" className="block min-w-0 lg:w-60 lg:shrink-0">
      {/* Desktop: full-height panel anchored under the sticky admin header */}
      <div className="sticky top-[72px] hidden w-60 shrink-0 flex-col self-start border-r border-neutral-200 bg-white py-5 pr-4 lg:flex">
        <nav aria-label="Admin sections" className="space-y-1">
          {NAV.map(({ href, label, Icon, exact }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href, exact) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium",
                isActive(href, exact) ? "bg-ink-900 font-bold text-white" : "text-ink-700 hover:bg-sand-100"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-1.5 pt-3">
          <Link href="/" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-700 hover:bg-sand-100">
            <ExternalLink className="h-4 w-4" /> View site
          </Link>
          <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>

      {/* Mobile: slim icon-only sidebar rail */}
      <nav aria-label="Admin sections" className="sticky top-[62px] flex flex-col items-center gap-1 self-start py-4 lg:hidden">
        {NAV.map(({ href, label, Icon, exact }) => (
          <Link
            key={href}
            href={href}
            title={label}
            aria-label={label}
            aria-current={isActive(href, exact) ? "page" : undefined}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              isActive(href, exact) ? "bg-ink-900 font-bold text-white" : "text-ink-700 hover:bg-sand-100"
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </Link>
        ))}
        <Link
          href="/"
          title="View site"
          aria-label="View site"
          className="mt-2 flex h-10 w-10 items-center justify-center rounded-xl text-ink-700 hover:bg-sand-100"
        >
          <ExternalLink className="h-5 w-5" aria-hidden />
        </Link>
        <button
          onClick={signOut}
          title="Sign out"
          aria-label="Sign out"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-red-700 hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" aria-hidden />
        </button>
      </nav>
    </aside>
  );
}
