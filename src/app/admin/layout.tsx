import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin Dashboard", robots: { index: false, follow: false } };

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/verifications", label: "Verifications" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/coupons", label: "Coupons" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="container-bd py-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Admin · {user.email}</p>
      <nav aria-label="Admin sections" className="mt-2 flex flex-wrap gap-1.5">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="chip hover:border-brand-600 hover:text-brand-700">
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4">{children}</div>
    </div>
  );
}
