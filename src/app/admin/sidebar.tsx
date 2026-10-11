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
  Package,
  Receipt,
  Scale,
  Shield,
  Star,
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
  { href: "/admin/orders", label: "Orders", Icon: Receipt },
  { href: "/admin/disputes", label: "Disputes", Icon: Scale },
  { href: "/admin/reports", label: "Reports", Icon: Flag },
  { href: "/admin/reviews", label: "Reviews", Icon: Star },
  { href: "/admin/promotions", label: "Promotions", Icon: Megaphone },
  { href: "/admin/coupons", label: "Coupons", Icon: Ticket },
];

export function AdminSidebar({ email }: { email: string }) {
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
    <aside aria-label="Admin" className="contents lg:block lg:w-60 lg:shrink-0">
      {/* Desktop: full-height panel anchored under the sticky header */}
      <div className="sticky top-[110px] hidden w-60 shrink-0 flex-col self-start border-r border-neutral-200 bg-white py-5 pr-4 lg:flex">
        <div className="flex items-center gap-2.5 px-3 pb-4">
          <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-white">
            <Shield className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">Admin control</p>
            <p className="truncate text-xs text-ink-400">{email}</p>
          </div>
        </div>
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

      {/* Mobile/tablet: horizontal section scroller */}
      <nav aria-label="Admin sections" className="flex gap-1.5 overflow-x-auto py-4 lg:hidden">
        {NAV.map(({ href, label, Icon, exact }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href, exact) ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium",
              isActive(href, exact)
                ? "border-ink-900 bg-ink-900 font-bold text-white"
                : "border-neutral-200 bg-white text-ink-700"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
