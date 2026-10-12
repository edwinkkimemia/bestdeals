import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Flag, Megaphone, Package, Receipt, Scale, Star, Store, Ticket, Users } from "lucide-react";
import { normalizePlan } from "@/lib/plans";
import { getStore } from "@/lib/store";
import { formatKES } from "@/lib/format";
import { LISTINGS } from "@/data/catalog";
import { AdminButtons, PromoButtons } from "../actions";
import { CouponForm } from "../coupon-form";

const SECTION_ICONS: Record<string, typeof Package> = {
  listings: Package,
  verifications: BadgeCheck,
  users: Users,
  shops: Store,
  orders: Receipt,
  disputes: Scale,
  reports: Flag,
  reviews: Star,
  promotions: Megaphone,
  coupons: Ticket,
};

export const dynamic = "force-dynamic";

const SECTIONS = ["listings", "verifications", "users", "shops", "orders", "disputes", "reports", "reviews", "promotions", "coupons"] as const;
export function generateStaticParams() {
  return SECTIONS.map((section) => ({ section }));
}

const TITLES: Record<string, string> = {
  listings: "Listing moderation",
  verifications: "Seller verifications",
  users: "Users",
  shops: "Shops",
  orders: "Orders",
  disputes: "Disputes",
  reports: "Reports",
  reviews: "Review moderation",
  promotions: "Promotions & boosts",
  coupons: "Coupons & campaigns",
};

export const metadata = { title: "Admin section", robots: { index: false, follow: false } };

function SectionTitle({ section, children }: { section: string; children: React.ReactNode }) {
  const Icon = SECTION_ICONS[section] ?? Package;
  return (
    <h1 className="section-title flex items-center gap-2">
      <Icon className="h-6 w-6 text-brand-600" /> {children}
    </h1>
  );
}

function Tabs({ base, tabs, current }: { base: string; tabs: string[]; current: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2" role="tablist">
      {tabs.map((t) => (
        <Link key={t} href={`${base}?status=${t}`} className={`chip ${current === t ? "!border-brand-600 !text-brand-700" : ""}`}>{t}</Link>
      ))}
    </div>
  );
}

export default async function AdminSection({
  params,
  searchParams,
}: {
  params: { section: string };
  searchParams: { status?: string };
}) {
  const { section } = params;
  if (!(SECTIONS as readonly string[]).includes(section)) notFound();
  const store = getStore();

  if (section === "listings") {
    const statuses = ["pending", "active", "rejected", "hidden", "sold"];
    const status = statuses.includes(searchParams.status ?? "") ? searchParams.status! : "pending";
    const items = await store.listListingsByStatus(status);
    return (
      <div>
        <SectionTitle section="listings">{TITLES.listings} ({items.length})</SectionTitle>
        <p className="mt-1 text-sm text-ink-500">Seller-submitted listings only — the {LISTINGS.length} static demo-catalogue listings on the storefront don&apos;t need moderation and aren&apos;t listed here.</p>
        <Tabs base="/admin/listings" tabs={statuses} current={status} />
        {items.length === 0 ? <p className="mt-4 text-sm text-ink-500">Nothing {status} ✓</p> : (
          <ul className="mt-4 space-y-2">
            {items.map((l) => (
              <li key={l.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="flex-1"><strong>{l.title}</strong> <span className="text-ink-400">· {l.type} · {formatKES(l.price)} · {l.sellerName} · {l.town}, {l.county}</span></span>
                <AdminButtons kind="listing" id={l.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (section === "verifications") {
    const tabs = ["pending", "approved", "rejected", "all"];
    const status = tabs.includes(searchParams.status ?? "") ? searchParams.status! : "pending";
    const items = await store.listVerifications(status === "all" ? undefined : status);
    return (
      <div>
        <SectionTitle section="verifications">{TITLES.verifications} ({items.length})</SectionTitle>
        <Tabs base="/admin/verifications" tabs={tabs} current={status} />
        {items.length === 0 ? <p className="mt-4 text-sm text-ink-500">None {status}.</p> : (
          <ul className="mt-4 space-y-2">
            {items.map((v) => (
              <li key={v.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="flex-1"><strong>{v.kind}</strong> · user {v.userId} · ☎ {v.phone ?? "no phone"} · {v.fileName ?? "document"} · <span className="chip">{v.status}</span></span>
                {v.docPath && <Link href={`/api/admin/verifications/${v.id}/doc`} target="_blank" className="link-bd">View doc</Link>}
                {v.status === "pending" && <AdminButtons kind="verify" id={v.id} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (section === "users") {
    const users = await store.listUsers();
    return (
      <div>
        <SectionTitle section="users">{TITLES.users} ({users.length})</SectionTitle>
        <p className="mt-1 text-sm text-ink-500">Grant or revoke the seller ✓ (ID verification). Email verification is self-serve and can&apos;t be granted here. Registered accounts only — seller display names on listings aren&apos;t accounts.</p>
        {users.length === 0 && <p className="mt-4 text-sm text-ink-500">No registered accounts yet — signups appear here. In-memory demo mode (no DATABASE_URL) resets on restart.</p>}
        <ul className="mt-4 space-y-2">
          {users.map((u) => (
            <li key={u.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className="flex-1">
                <strong>{u.name}</strong>{u.businessName ? <span> · 🏪 {u.businessName}</span> : null} <span className="text-ink-400">· {u.email} · {u.phone} · {u.role}</span>
                <span className="ml-2 chip">{u.sellerKind === "business" ? "business" : "individual"}</span>
                <span className="chip">{u.verified ? "✓ seller" : "unverified"}</span>
                <span className="chip">{u.emailVerified ? "✓ email" : "no email ✓"}</span>
              </span>
              <AdminButtons kind="user" id={u.id} extra={{ verified: u.verified }} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (section === "shops") {
    const tabs = ["all", "verified", "pending"];
    const tab = tabs.includes(searchParams.status ?? "") ? searchParams.status! : "all";
    const all = await store.listShops();
    const items = tab === "all" ? all : all.filter((s) => (tab === "verified" ? s.verified : !s.verified));
    const owners = new Map((await store.listUsers().catch(() => [])).map((u) => [u.id, u.name]));
    return (
      <div>
        <SectionTitle section="shops">{TITLES.shops} ({items.length})</SectionTitle>
        <p className="mt-1 text-sm text-ink-500">Every seller shop: verify the business badge, check the plan, jump to the live storefront.</p>
        <Tabs base="/admin/shops" tabs={tabs} current={tab} />
        {items.length === 0 ? <p className="mt-4 text-sm text-ink-500">No shops {tab === "all" ? "yet" : tab}.</p> : (
          <ul className="mt-4 space-y-2">
            {items.map((s) => (
              <li key={s.slug} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sand-100 font-black text-ink-400">
                  {s.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    s.name.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <strong>{s.name}</strong> <span className="text-ink-400">· /shops/{s.slug} · {s.ownerId ? owners.get(s.ownerId) ?? "owner" : "no owner"} · {normalizePlan(s.planId)} · {s.town}, {s.county}</span>{" "}
                  <span className="chip">{s.verified ? "✓ verified" : "pending"}</span>
                </span>
                <Link href={`/shops/${s.slug}`} className="link-bd text-xs">View →</Link>
                <AdminButtons kind="shop" id={s.slug} extra={{ verified: s.verified }} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (section === "orders") {
    const orders = await store.listOrders();
    const paid = orders.filter((o) => o.paymentStatus === "paid").length;
    return (
      <div>
        <SectionTitle section="orders">{TITLES.orders} ({orders.length} · {paid} paid)</SectionTitle>
        <ul className="mt-4 space-y-2">
          {orders.map((o) => (
            <li key={o.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className="flex-1">
                <strong>{o.id}</strong> · {o.name} · {formatKES(o.total)} · <span className="chip">{o.status}</span> <span className="chip">{o.paymentStatus}</span>
                <span className="text-ink-400"> · {o.createdAt.slice(0, 10)}</span>
              </span>
            </li>
          ))}
        </ul>
        {orders.length === 0 && <p className="mt-4 text-sm text-ink-500">No orders yet.</p>}
      </div>
    );
  }

  if (section === "disputes") {
    const all = await store.listDisputes();
    const open = all.filter((d) => !["resolved_refund", "resolved_reject", "cancelled"].includes(d.status));
    const done = all.filter((d) => ["resolved_refund", "resolved_reject", "cancelled"].includes(d.status));
    return (
      <div>
        <SectionTitle section="disputes">{TITLES.disputes} ({open.length} open)</SectionTitle>
        {open.length === 0 ? <p className="mt-4 text-sm text-ink-500">None open.</p> : (
          <ul className="mt-4 space-y-2">
            {open.map((d) => (
              <li key={d.id} className="card space-y-1 p-3 text-sm">
                <p><strong>Order {d.orderId}</strong> · {d.reason} · <span className="chip">{d.status}</span></p>
                {d.details && <p className="text-ink-700">{d.details}</p>}
                {d.response && <p className="rounded-lg bg-sand-50 p-2">Seller: {d.response}</p>}
                <AdminButtons kind="dispute" id={d.id} />
              </li>
            ))}
          </ul>
        )}
        {done.length > 0 && (
          <>
            <h2 className="mt-6 font-bold">Resolved ({done.length})</h2>
            <ul className="mt-2 space-y-2">
              {done.slice(0, 20).map((d) => (
                <li key={d.id} className="card p-3 text-sm text-ink-500">Order {d.orderId} · {d.reason} · <span className="chip">{d.status}</span></li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }

  if (section === "reports") {
    const tabs = ["open", "closed", "all"];
    const status = tabs.includes(searchParams.status ?? "") ? searchParams.status! : "open";
    const items = await store.listReports(status === "all" ? undefined : status);
    return (
      <div>
        <SectionTitle section="reports">{TITLES.reports} ({items.length})</SectionTitle>
        <Tabs base="/admin/reports" tabs={tabs} current={status} />
        {items.length === 0 ? <p className="mt-4 text-sm text-ink-500">None {status}.</p> : (
          <ul className="mt-4 space-y-2">
            {items.map((r) => (
              <li key={r.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="flex-1">Listing {r.listingId ?? "—"}: {r.reason} · <span className="chip">{r.status}</span> <span className="text-ink-400">· {r.createdAt.slice(0, 10)}</span></span>
                {r.status === "open" && <AdminButtons kind="report" id={r.id} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (section === "reviews") {
    const items = await store.listPendingReviews();
    return (
      <div>
        <SectionTitle section="reviews">{TITLES.reviews} ({items.length})</SectionTitle>
        {items.length === 0 ? <p className="mt-4 text-sm text-ink-500">None pending.</p> : (
          <ul className="mt-4 space-y-2">
            {items.map((r) => (
              <li key={r.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="flex-1">{"★".repeat(r.rating)} by <strong>{r.authorName}</strong> {r.sellerName ? `for ${r.sellerName}` : ""}{r.shopSlug ? `· shop ${r.shopSlug}` : ""}{r.verifiedPurchase ? " · ✓ purchase" : ""}{r.body ? ` — ${r.body}` : ""}</span>
                <AdminButtons kind="review" id={r.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // promotions
  const tabs = ["pending_payment", "active", "cancelled", "expired", "all"];
  const status = tabs.includes(searchParams.status ?? "") ? searchParams.status! : "pending_payment";
  if (section === "promotions") {
    await store.sweepExpiredPromotions().catch(() => null);
    const items = await store.listPromotions(status === "all" ? undefined : status);
    return (
      <div>
        <SectionTitle section="promotions">{TITLES.promotions} ({items.length})</SectionTitle>
        <p className="mt-1 text-sm text-ink-500">Confirm M-Pesa payment to activate a boost; the listing gets its Featured badge.</p>
        <Tabs base="/admin/promotions" tabs={tabs} current={status} />
        {items.length === 0 ? <p className="mt-4 text-sm text-ink-500">None {status}.</p> : (
          <ul className="mt-4 space-y-2">
            {items.map((p) => (
              <li key={p.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="flex-1">
                  <strong>{p.kind}</strong> · listing {p.listingId} · {p.days}d · {formatKES(p.amount)} · <span className="chip">{p.status}</span>
                  <span className="text-ink-400"> · till {p.endsAt.slice(0, 10)}</span>
                </span>
                <PromoButtons id={p.id} status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // coupons
  const coupons = await store.listCoupons();
  return (
    <div>
      <SectionTitle section="coupons">{TITLES.coupons} ({coupons.length})</SectionTitle>
      <p className="mt-1 text-sm text-ink-500">Codes apply at cart + checkout (server-verified). Active codes are advertised on the homepage banner.</p>
      <CouponForm />
      <ul className="mt-4 space-y-2">
        {coupons.map((c) => (
          <li key={c.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
            <span className="flex-1">
              <strong className="font-mono">{c.code}</strong> · −{formatKES(c.value)}
              {c.minSpend > 0 && <span className="text-ink-400"> · min {formatKES(c.minSpend)}</span>}
              {" "}<span className="chip">{c.active ? "active" : "off"}</span>
            </span>
            <AdminButtons kind="coupon" id={c.code} extra={{ active: c.active }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
