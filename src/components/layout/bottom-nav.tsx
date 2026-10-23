"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Plus, ShoppingCart, User } from "lucide-react";
import { useCart } from "../cart-provider";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const path = usePathname();
  const { count } = useCart();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);

  const tabs = [
    { href: "/", label: "Home", Icon: Home },
    { href: "/browse", label: "Browse", Icon: LayoutGrid },
    { href: "/sell", label: "Sell", Icon: Plus, fab: true },
    { href: "/cart", label: "Cart", Icon: ShoppingCart, badge: count },
    { href: "/dashboard", label: "Account", Icon: User },
  ];

  return (
    <>
      {/* spacer so footer content clears the fixed bar */}
      <div aria-hidden className="h-[76px] md:hidden" />
      <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
          {tabs.map(({ href, label, Icon, badge, fab }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg py-1 text-[11px] font-medium",
                isActive(href) ? "text-brand-700" : "text-ink-400"
              )}
            >
              <span className={cn("relative flex h-9 w-9 items-center justify-center rounded-full", fab && "bg-accent-500 text-white shadow-lg")}>
                <Icon className="h-5 w-5" />
                {!!badge && badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
