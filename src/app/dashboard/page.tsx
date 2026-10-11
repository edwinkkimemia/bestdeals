import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { ReferralPanel } from "@/components/referral-panel";
import { getSellerAnalyticsReport } from "@/lib/analytics";

export const metadata = { title: "Seller Dashboard" };

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/dashboard");
  const mine = await getStore().listListingsByOwner(user.id);
  const perf = await getSellerAnalyticsReport({ id: user.id, name: user.name }, 30).catch(() => null);
  // Name/role/verified can change after sign-in (profile edits, admin approval) — read fresh.
  const fresh = await getStore().findUserById(user.id).catch(() => null);
  const name = fresh?.name ?? user.name;
  const role = fresh?.role ?? user.role;
  const verified = fresh?.verified ?? user.verified;
  const emailVerified = fresh?.emailVerified ?? false;
  const kind = fresh?.sellerKind ?? "individual";
  const verifyHref = kind === "business" ? "/dashboard/verify?kind=business" : "/dashboard/verify";
  return (
    <div className="container-bd py-8">
      <h1 className="section-title">Hello, {name.split(" ")[0]} 👋</h1>
      <p className="text-sm text-ink-500">
        Role: {role} · {kind === "business" ? "Business account" : "Individual seller"} · {verified ? "Verified ✓" : "Verification pending — complete it in Verification"}
      </p>
      {!emailVerified && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Confirm your email to build buyer trust — <Link href="/dashboard/profile" className="link-bd">verify it in Profile →</Link>
        </p>
      )}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/sell", t: "Create listing", d: "Post in minutes" },
          { href: "/dashboard/listings", t: "My listings", d: `${mine.length} listings` },
          { href: "/dashboard/messages", t: "Enquiries", d: "Buyer messages" },
          { href: "/dashboard/analytics", t: "Analytics", d: perf && perf.totalViews > 0 ? `${perf.totalViews.toLocaleString()} views · 30d` : "Product views" },
          { href: verifyHref, t: "Verification", d: verified ? "Verified ✓" : "Get the ✓ badge" },
          { href: "/dashboard/shop", t: "My shop", d: "Storefront & plans" },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="card p-5 hover:border-brand-600">
            <p className="font-bold">{c.t}</p><p className="text-sm text-ink-500">{c.d}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <div className="card p-5">
          <p className="font-bold">Next actions</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
            {kind === "business" && !verified && (
              <li>Verify your business permit in <Link href={verifyHref} className="link-bd">Verification</Link>, then open your shop below</li>
            )}
            {kind === "business" && verified && (
              <li>Set up your storefront in <Link href="/dashboard/shop" className="link-bd">My shop</Link></li>
            )}
            {kind !== "business" && (
              <li>Verify your ID in <Link href={verifyHref} className="link-bd">Verification</Link></li>
            )}
            <li>Publish your first listing — drafts save on this device</li>
            <li>Promote eligible listings from <Link href="/dashboard/promotion" className="link-bd">Promotion</Link></li>
          </ul>
        </div>
        <div className="card p-5">
          <p className="font-bold">Performance</p>
          <p className="text-sm text-ink-500">
            {perf && perf.totalViews > 0 ? (
              <><strong>{perf.totalViews.toLocaleString()}</strong> views · <strong>{perf.uniqueViewers.toLocaleString()}</strong> viewers in the last 30 days across your products.</>
            ) : (
              <>Views, enquiries and conversion appear here once buyers open your products. Real data only — no fabricated stats.</>
            )}
          </p>
          <Link href="/dashboard/analytics" className="link-bd text-sm">View product analytics →</Link>
        </div>
        <ReferralPanel />
      </div>
    </div>
  );
}
