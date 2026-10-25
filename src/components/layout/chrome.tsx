"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminFooter } from "@/components/layout/admin-footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import type { Category } from "@/data/catalog";

type ChromeUser = { name: string; role: string } | null;
type AdminUser = { name: string; email: string } | null;

/**
 * Storefront chrome vs admin chrome. /admin routes get the dedicated dark
 * admin header + minimal footer (no shop search, cart, or bottom nav).
 */
export function Chrome({
  user,
  adminUser,
  announcement,
  categories,
  initialCounty,
  footer,
  children,
}: {
  user: ChromeUser;
  adminUser: AdminUser;
  announcement: string | null;
  categories: Category[];
  initialCounty?: string | null;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const isAdmin = path?.startsWith("/admin") ?? false;

  if (isAdmin) {
    return (
      <>
        <AdminHeader user={adminUser} />
        <main className="min-h-[70vh]">{children}</main>
        <AdminFooter />
      </>
    );
  }
  return (
    <>
      {announcement && <AnnouncementBar text={announcement} />}
      <Header user={user} categories={categories} initialCounty={initialCounty} />
      <main className="min-h-[60vh]">{children}</main>
      {footer}
      <BottomNav />
    </>
  );
}
