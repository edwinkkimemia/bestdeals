"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
  Package,
  Plus,
  Settings,
  Store,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", Icon: LayoutDashboard, exact: true },
  { href: "/dashboard/listings", label: "My listings", Icon: Package },
  { href: "/dashboard/messages", label: "Messages", Icon: MessageCircle },
  { href: "/dashboard/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/dashboard/promotion", label: "Promotion", Icon: Megaphone },
  { href: "/dashboard/verify", label: "Verification", Icon: BadgeCheck },
  { href: "/dashboard/shop", label: "My shop", Icon: Store },
  { href: "/dashboard/profile", label: "Profile", Icon: User },
  { href: "/dashboard/settings", label: "Settings", Icon: Settings },
];

export function DashboardSidebar({ unread }: { unread: number }) {
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
    <aside aria-label="Dashboard" className="contents lg:block lg:w-60 lg:shrink-0">
      {/* Desktop: full-height panel anchored under the sticky header (not a floating card) */}
      <div className="sticky top-[110px] hidden w-60 shrink-0 flex-col self-start border-r border-neutral-200 bg-white py-5 pr-4 lg:flex">
        <nav aria-label="Dashboard sections" className="space-y-1">
          {NAV.map(({ href, label, Icon, exact }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href, exact) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium",
                isActive(href, exact) ? "bg-brand-50 font-bold text-brand-700" : "text-ink-700 hover:bg-sand-100"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {href === "/dashboard/messages" && unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-1.5 pt-3">
          <Link href="/sell" className="btn-primary w-full !py-2 text-sm">
            <Plus className="h-4 w-4" /> Sell an item
          </Link>
          <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>

      {/* Mobile/tablet: horizontal section scroller */}
      <nav aria-label="Dashboard sections" className="flex gap-1.5 overflow-x-auto py-4 lg:hidden">
        {NAV.map(({ href, label, Icon, exact }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href, exact) ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium",
              isActive(href, exact)
                ? "border-brand-600 bg-brand-50 font-bold text-brand-700"
                : "border-neutral-200 bg-white text-ink-700"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {href === "/dashboard/messages" && unread > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
