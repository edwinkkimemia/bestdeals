import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getStore } from "@/lib/store";

export const metadata = { title: "Seller Dashboard" };

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/dashboard");
  const mine = await getStore().listListingsByOwner(user.id);
  // Verified flag can change after sign-in (admin approval) — read fresh.
  const fresh = await getStore().findUserById(user.id).catch(() => null);
  const verified = fresh?.verified ?? user.verified;
  return (
    <div className="container-bd py-8">
      <h1 className="section-title">Hello, {user.name.split(" ")[0]} 👋</h1>
      <p className="text-sm text-ink-500">Role: {user.role} · {verified ? "Verified ✓" : "Verification pending — complete it in Verification"}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/dashboard/listings/new", t: "Create listing", d: "Post in minutes" },
          { href: "/dashboard/listings", t: "My listings", d: `${mine.length} listings` },
          { href: "/dashboard/messages", t: "Enquiries", d: "Buyer messages" },
          { href: "/dashboard/verify", t: "Verification", d: verified ? "Verified ✓" : "Get the ✓ badge" },
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
            <li>Verify your ID in <Link href="/dashboard/verify" className="link-bd">Verification</Link></li>
            <li>Publish your first listing — drafts autosave</li>
            <li>Promote eligible listings from <Link href="/dashboard/promotion" className="link-bd">Promotion</Link></li>
          </ul>
        </div>
        <div className="card p-5">
          <p className="font-bold">Performance (demo)</p>
          <p className="text-sm text-ink-500">Views, enquiries and conversion appear here once you publish. Real data only — no fabricated stats.</p>
          <Link href="/dashboard/settings" className="link-bd text-sm">Notification & privacy settings →</Link>
        </div>
      </div>
    </div>
  );
}
