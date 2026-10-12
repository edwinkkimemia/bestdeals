import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Eye,
  Flag,
  Megaphone,
  Newspaper,
  Package,
  Receipt,
  Scale,
  ShieldCheck,
  Star,
  Store,
  Users,
} from "lucide-react";
import { getStore } from "@/lib/store";
import { formatKES } from "@/lib/format";
import { getPlatformAnalytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { LISTINGS, SHOPS } from "@/data/catalog";
import { SeedDatabaseButton } from "./seed-button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const store = getStore();
  const [pending, reports, disputes, reviews, verifications, orders, promos, users, shops, posts, views] = await Promise.all([
    store.listListingsByStatus("pending"),
    store.listReports("open"),
    store.listDisputes(),
    store.listPendingReviews(),
    store.listVerifications("pending"),
    store.listOrders(),
    store.listPromotions("pending_payment"),
    store.listUsers(),
    store.listShops(),
    store.listBlogPosts("published"),
    getPlatformAnalytics(30, 1).catch(() => ({ totalViews: 0, uniqueViewers: 0 })),
  ]);
  const openDisputes = disputes.filter((d) => !["resolved_refund", "resolved_reject", "cancelled"].includes(d.status));
  const revenue = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((s, o) => s + (o.total || 0), 0);

  const stats = [
    { t: "Product views · 30 days", v: views.totalViews.toLocaleString(), href: "/admin/analytics", Icon: Eye, tile: "bg-brand-50 text-brand-700" },
    { t: "Unique viewers · 30 days", v: views.uniqueViewers.toLocaleString(), href: "/admin/analytics", Icon: BarChart3, tile: "bg-brand-50 text-brand-700" },
    { t: "Listings awaiting review", v: String(pending.length), href: "/admin/listings", Icon: Package, tile: "bg-amber-50 text-amber-700" },
    { t: "Pending verifications", v: String(verifications.length), href: "/admin/verifications", Icon: BadgeCheck, tile: "bg-amber-50 text-amber-700" },
    { t: "Open disputes", v: String(openDisputes.length), href: "/admin/disputes", Icon: Scale, tile: "bg-red-50 text-red-700" },
    { t: "Open reports", v: String(reports.length), href: "/admin/reports", Icon: Flag, tile: "bg-red-50 text-red-700" },
    { t: "Pending reviews", v: String(reviews.length), href: "/admin/reviews", Icon: Star, tile: "bg-amber-50 text-amber-700" },
    { t: "Boosts awaiting payment", v: String(promos.length), href: "/admin/promotions", Icon: Megaphone, tile: "bg-brand-50 text-brand-700" },
    { t: "Total orders", v: String(orders.length), href: "/admin/orders", Icon: Receipt, tile: "bg-green-50 text-green-700" },
    { t: "Registered users", v: String(users.length), href: "/admin/users", Icon: Users, tile: "bg-green-50 text-green-700" },
    { t: "Shops", v: String(shops.length), href: "/admin/shops", Icon: Store, tile: "bg-green-50 text-green-700" },
    { t: "Published posts", v: String(posts.length), href: "/admin/blog", Icon: Newspaper, tile: "bg-green-50 text-green-700" },
    { t: "Paid revenue (KES)", v: formatKES(revenue), href: "/admin/orders", Icon: BarChart3, tile: "bg-green-50 text-green-700" },
  ];

  return (
    <div>
      <h1 className="section-title flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-brand-600" /> Platform control</h1>
      <p className="mt-1 text-sm text-ink-500">
        Live queues · every action records a reason + audit trail.
      </p>
      {users.length === 0 && shops.length === 0 && posts.length === 0 && orders.length === 0 && (
        <div className="card mt-4 border-amber-300 bg-amber-50 p-5">
          <p className="font-bold text-amber-900">Database is connected but empty</p>
          <p className="mt-1 text-sm text-amber-800">
            No users, shops, posts or orders yet — usually means the deploy seed never ran.
            One click fills it with the demo catalogue (re-runs are safe). Manual signups
            only appear here when made on this same deployment.
          </p>
          <SeedDatabaseButton />
        </div>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ t, v, href, Icon, tile }) => (
          <Link key={t} href={href} className="card group flex items-center gap-3 p-4 hover:border-brand-600">
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tile)}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-2xl font-extrabold leading-tight">{v}</span>
              <span className="block text-xs text-ink-500">{t} →</span>
            </span>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4 text-amber-600" /> Needs attention</h2>
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

      <h2 className="mt-8 flex items-center gap-2 font-bold"><Package className="h-4 w-4 text-ink-400" /> Storefront demo catalogue (static)</h2>
      <p className="mt-1 text-sm text-ink-500">
        {LISTINGS.length} listings · {SHOPS.length} shops of seed data power the public storefront.
        They are not database rows, so they never appear in the queues above — only seller-submitted
        listings, signups and orders do. Without <code>DATABASE_URL</code> the store is in-memory demo
        mode and resets on restart; set it + run migrations for persistent data.
      </p>
      <p className="mt-8 text-xs text-ink-400">Restricted area. Every admin action is logged with a reason.</p>
    </div>
  );
}
