import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SHOP_PLANS } from "@/data/catalog";
import { formatKES } from "@/lib/format";

export const metadata = { title: "My Shop" };

export default async function ShopDash({ searchParams }: { searchParams: { plan?: string } }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/dashboard/shop");
  const plan = SHOP_PLANS.find((p) => p.id === (searchParams.plan ?? "starter")) ?? SHOP_PLANS[0];
  return (
    <div className="container-bd py-8">
      <h1 className="section-title">My shop</h1>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="card p-5">
          <p className="font-bold">Storefront</p>
          <p className="text-sm text-ink-500">Your public URL will be <code>chap.co.ke/shops/your-name</code> with availability check & safe slugs.</p>
          <Link href="/shops/fon-zone-nairobi" className="link-bd text-sm">See an example storefront →</Link>
          <form action="/api/shops" method="post" className="mt-3 space-y-2">
            <input name="name" required placeholder="Business name" className="input-bd" aria-label="Business name" />
            <button className="btn-primary w-full" formAction="/api/shops" type="submit">Check availability & create</button>
          </form>
          <div className="mt-3 rounded-xl bg-sand-50 p-3 text-sm">
            <p className="font-semibold">Bulk upload (Growth+)</p>
            <p className="text-ink-500">Download the <a className="link-bd" href="/api/shops">CSV template</a>, fill rows, then upload here. Tenant-isolated: you can only touch your own catalogue.</p>
            <input type="file" accept=".csv" className="mt-2 text-sm" aria-label="Upload catalogue CSV" />
          </div>
        </div>
        <div className="card border-brand-600 p-5">
          <p className="font-bold">Current plan: {plan.name} ({plan.monthly === 0 ? "Free" : `${formatKES(plan.monthly)}/mo`})</p>
          <ul className="mt-2 space-y-1 text-sm">{plan.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
          <div className="mt-3 flex gap-2">
            <Link href="/pricing" className="btn-secondary">Change plan</Link>
            <Link href="/dashboard/promotion" className="btn-primary">Promote products</Link>
          </div>
          <p className="mt-2 text-xs text-ink-400">Billing records, invoices & renewal reminders live here. Failed or refunded payments are never counted as revenue.</p>
        </div>
      </div>
    </div>
  );
}
