import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { formatKES } from "@/lib/format";
import { AdminButtons, PromoButtons } from "../actions";
import { CouponForm } from "../coupon-form";

export const dynamic = "force-dynamic";

const SECTIONS = ["listings", "verifications", "users", "orders", "disputes", "reports", "reviews", "promotions", "coupons"] as const;
export function generateStaticParams() {
  return SECTIONS.map((section) => ({ section }));
}

const TITLES: Record<string, string> = {
  listings: "Listing moderation",
  verifications: "Seller verifications",
  users: "Users",
  orders: "Orders",
  disputes: "Disputes",
  reports: "Reports",
  reviews: "Review moderation",
  promotions: "Promotions & boosts",
  coupons: "Coupons & campaigns",
};

export const metadata = { title: "Admin section", robots: { index: false, follow: false } };

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
        <h1 className="section-title">{TITLES.listings} ({items.length})</h1>
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
        <h1 className="section-title">{TITLES.verifications} ({items.length})</h1>
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
        <h1 className="section-title">{TITLES.users} ({users.length})</h1>
        <p className="mt-1 text-sm text-ink-500">Grant or revoke the seller ✓ (ID verification). Email verification is self-serve and can&apos;t be granted here.</p>
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

  if (section === "orders") {
    const orders = await store.listOrders();
    const paid = orders.filter((o) => o.paymentStatus === "paid").length;
    return (
      <div>
        <h1 className="section-title">{TITLES.orders} ({orders.length} · {paid} paid)</h1>
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
        <h1 className="section-title">{TITLES.disputes} ({open.length} open)</h1>
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
        <h1 className="section-title">{TITLES.reports} ({items.length})</h1>
        <Tabs base="/admin/reports" tabs={tabs} current={status} />
        {items.length === 0 ? <p className="mt-4 text-sm text-ink-500">None {status}.</p> : (
          <ul className="mt-4 space-y-2">
            {items.map((r) => (
              <li key={r.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="flex-1">Listing {r.listingId ?? "—"}: {r.reason} · <span className="chip">{r.status}</span></span>
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
        <h1 className="section-title">{TITLES.reviews} ({items.length})</h1>
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
        <h1 className="section-title">{TITLES.promotions} ({items.length})</h1>
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
      <h1 className="section-title">{TITLES.coupons} ({coupons.length})</h1>
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
