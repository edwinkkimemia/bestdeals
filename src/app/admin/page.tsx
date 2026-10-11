import Link from "next/link";
import { getStore } from "@/lib/store";
import { formatKES } from "@/lib/format";
import { getPlatformAnalytics } from "@/lib/analytics";

export default async function AdminPage() {
  const store = getStore();
  const [pending, reports, disputes, reviews, verifications, orders, promos, users, views, coupons] = await Promise.all([
    store.listListingsByStatus("pending"),
    store.listReports("open"),
    store.listDisputes(),
    store.listPendingReviews(),
    store.listVerifications("pending"),
    store.listOrders(),
    store.listPromotions("pending_payment"),
    store.listUsers(),
    getPlatformAnalytics(30, 1).catch(() => ({ totalViews: 0, uniqueViewers: 0 })),
    store.listCoupons(),
  ]);
  const openDisputes = disputes.filter((d) => !["resolved_refund", "resolved_reject", "cancelled"].includes(d.status));
  const revenue = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((s, o) => s + (o.total || 0), 0);

  const stats = [
    { t: "Product views · 30 days", v: views.totalViews.toLocaleString(), href: "/admin/analytics" },
    { t: "Unique viewers · 30 days", v: views.uniqueViewers.toLocaleString(), href: "/admin/analytics" },
    { t: "Listings awaiting review", v: String(pending.length), href: "/admin/listings" },
    { t: "Pending verifications", v: String(verifications.length), href: "/admin/verifications" },
    { t: "Open disputes", v: String(openDisputes.length), href: "/admin/disputes" },
    { t: "Open reports", v: String(reports.length), href: "/admin/reports" },
    { t: "Pending reviews", v: String(reviews.length), href: "/admin/reviews" },
    { t: "Boosts awaiting payment", v: String(promos.length), href: "/admin/promotions" },
    { t: "Active coupons", v: String(coupons.filter((c) => c.active).length), href: "/admin/coupons" },
    { t: "Total orders", v: String(orders.length), href: "/admin/orders" },
    { t: "Registered users", v: String(users.length), href: "/admin/users" },
    { t: "Paid revenue (KES)", v: formatKES(revenue), href: "/admin/orders" },
  ];

  return (
    <div>
      <h1 className="section-title">Platform control</h1>
      <p className="text-sm text-ink-500">
        Live queues from the {process.env.DATABASE_URL ? "PostgreSQL" : "demo"} store · every action records a reason + audit trail.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.t} href={s.href} className="card p-5 hover:border-brand-600">
            <p className="text-3xl font-extrabold">{s.v}</p>
            <p className="text-sm text-ink-500">{s.t} →</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 font-bold">Needs attention</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {pending.slice(0, 3).map((l) => (
          <li key={l.id}><strong>{l.title}</strong> <span className="text-ink-400">· {l.sellerName}</span> — <Link href="/admin/listings" className="link-bd">review</Link></li>
        ))}
        {verifications.slice(0, 3).map((v) => (
          <li key={v.id}><strong>{v.kind}</strong> verification · user {v.userId} — <Link href="/admin/verifications" className="link-bd">decide</Link></li>
        ))}
        {openDisputes.slice(0, 3).map((d) => (
          <li key={d.id}>Order <strong>{d.orderId}</strong> · {d.reason} — <Link href="/admin/disputes" className="link-bd">resolve</Link></li>
        ))}
        {pending.length + verifications.length + openDisputes.length === 0 && <li>All queues clear ✓</li>}
      </ul>
      <p className="mt-8 text-xs text-ink-400">Admin access via ADMIN_EMAILS in .env. RBAC enforced server-side on every action.</p>
    </div>
  );
}
