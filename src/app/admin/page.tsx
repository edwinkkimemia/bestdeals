import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { AdminButtons } from "./actions";

export const metadata = { title: "Admin Dashboard", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const store = getStore();
  const [pending, reports, disputes, reviews, verifications, orders] = await Promise.all([
    store.listListingsByStatus("pending"),
    store.listReports("open"),
    store.listDisputes(),
    store.listPendingReviews(),
    store.listVerifications("pending"),
    store.listOrders(),
  ]);
  const openDisputes = disputes.filter((d) => !["resolved_refund", "resolved_reject", "cancelled"].includes(d.status));

  const stats = [
    { t: "Listings awaiting review", v: String(pending.length) },
    { t: "Open reports", v: String(reports.length) },
    { t: "Open disputes", v: String(openDisputes.length) },
    { t: "Pending reviews", v: String(reviews.length) },
    { t: "Pending verifications", v: String(verifications.length) },
    { t: "Total orders", v: String(orders.length) },
  ];

  return (
    <div className="container-bd py-8">
      <h1 className="section-title">Platform control</h1>
      <p className="text-sm text-ink-500">
        Live queues from the {process.env.DATABASE_URL ? "PostgreSQL" : "demo"} store · every action records a reason + audit trail.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.t} className="card p-5">
            <p className="text-3xl font-extrabold">{s.v}</p><p className="text-sm text-ink-500">{s.t}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-bold">Listings awaiting review ({pending.length})</h2>
      {pending.length === 0 ? <p className="text-sm text-ink-500">Queue clear ✓</p> : (
        <ul className="mt-2 space-y-2">
          {pending.map((l) => (
            <li key={l.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className="flex-1"><strong>{l.title}</strong> <span className="text-ink-400">· {l.type} · {l.sellerName} · {l.town}, {l.county}</span></span>
              <AdminButtons kind="listing" id={l.id} />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 font-bold">Verification requests ({verifications.length})</h2>
      {verifications.length === 0 ? <p className="text-sm text-ink-500">None pending.</p> : (
        <ul className="mt-2 space-y-2">
          {verifications.map((v) => (
            <li key={v.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className="flex-1"><strong>{v.kind}</strong> · user {v.userId} · {v.fileName ?? "document"}</span>
              {v.docPath && <Link href={`/api/admin/verifications/${v.id}/doc`} target="_blank" className="link-bd">View doc</Link>}
              <AdminButtons kind="verify" id={v.id} />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 font-bold">Disputes ({openDisputes.length} open)</h2>
      {openDisputes.length === 0 ? <p className="text-sm text-ink-500">None open.</p> : (
        <ul className="mt-2 space-y-2">
          {openDisputes.map((d) => (
            <li key={d.id} className="card space-y-1 p-3 text-sm">
              <p><strong>Order {d.orderId}</strong> · {d.reason} · <span className="chip">{d.status}</span></p>
              {d.details && <p className="text-ink-700">{d.details}</p>}
              {d.response && <p className="rounded-lg bg-sand-50 p-2">Seller: {d.response}</p>}
              <AdminButtons kind="dispute" id={d.id} />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 font-bold">Reviews awaiting moderation ({reviews.length})</h2>
      {reviews.length === 0 ? <p className="text-sm text-ink-500">None pending.</p> : (
        <ul className="mt-2 space-y-2">
          {reviews.map((r) => (
            <li key={r.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className="flex-1">{"★".repeat(r.rating)} by <strong>{r.authorName}</strong> {r.sellerName ? `for ${r.sellerName}` : ""}{r.shopSlug ? `· shop ${r.shopSlug}` : ""}{r.verifiedPurchase ? " · ✓ purchase" : ""}{r.body ? ` — ${r.body}` : ""}</span>
              <AdminButtons kind="review" id={r.id} />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 font-bold">Open reports ({reports.length})</h2>
      {reports.length === 0 ? <p className="text-sm text-ink-500">None open.</p> : (
        <ul className="mt-2 space-y-2">
          {reports.map((r) => (
            <li key={r.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className="flex-1">Listing {r.listingId ?? "—"}: {r.reason}</span>
              <AdminButtons kind="report" id={r.id} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-ink-400">Admin access via ADMIN_EMAILS in .env. RBAC enforced server-side on every action.</p>
    </div>
  );
}
