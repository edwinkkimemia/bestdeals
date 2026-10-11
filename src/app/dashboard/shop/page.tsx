import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { normalizePlan } from "@/lib/plans";
import { getStore } from "@/lib/store";
import { PlanPanel, BulkPanel, StaffPanel } from "./panels";

export const metadata = { title: "My Shop" };
export const dynamic = "force-dynamic";

export default async function ShopDash({ searchParams }: { searchParams: { plan?: string; new?: string } }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/dashboard/shop");
  const store = getStore();
  const fresh = await store.findUserById(user.id).catch(() => null);
  const kind = fresh?.sellerKind ?? "individual";
  const verified = fresh?.verified ?? user.verified;
  const owned = await store.listShopsByOwner(user.id).catch(() => []);
  const active = owned[0] ?? null;
  const activePlan = active ? normalizePlan((active as { planId?: unknown }).planId) : "free";
  const members = active ? await store.listShopMembers(active.slug).catch(() => []) : [];
  const isOwner =
    user.role === "ADMIN" ||
    active?.ownerId === user.id ||
    members.some((m) => m.userId === user.id && m.role === "owner");
  return (
    <div className="container-bd py-8">
      <h1 className="section-title">My shop</h1>
      {searchParams.new === "business" && (
        <p className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
          Welcome aboard ✓ — two steps to open your shop: 1) verify your business below, 2) create your storefront.
        </p>
      )}
      {!verified && (
        <div className="card mt-4 border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-bold text-amber-900">
            {kind === "business" ? "Verify your business to open your shop" : "Verify before you open a shop"}
          </p>
          <p className="mt-1 text-amber-800">
            {kind === "business"
              ? "Submit your business permit or KRA PIN — it becomes your verified-business ✓ badge."
              : "Every seller is verified (national ID + email + phone) before posting or opening a shop."}
          </p>
          <Link href={kind === "business" ? "/dashboard/verify?kind=business" : "/dashboard/verify"} className="btn-primary mt-3">
            {kind === "business" ? "Verify business" : "Get verified"}
          </Link>
        </div>
      )}
      <div className="mt-4 grid items-start gap-3 lg:grid-cols-2">
        <div className="card p-5">
          <p className="font-bold">Storefront{active ? ` · ${active.name}` : ""}</p>
          <p className="text-sm text-ink-500">Your public URL will be <code>chap.co.ke/shops/your-name</code> with availability check & safe slugs.</p>
          {active ? (
            <p className="mt-2 text-sm"><Link href={`/shops/${active.slug}`} className="link-bd">View your storefront →</Link></p>
          ) : (
            <Link href="/shops/fon-zone-nairobi" className="link-bd text-sm">See an example storefront →</Link>
          )}
          <form action="/api/shops" method="post" className="mt-3 space-y-2">
            <input name="name" required placeholder="Business name" className="input-bd" aria-label="Business name" />
            <button className="btn-primary w-full" formAction="/api/shops" type="submit">Check availability & create</button>
          </form>
          {active && <BulkPanel shopName={active.name} isGold={activePlan === "gold"} />}
        </div>
        <div>
          <PlanPanel
            shops={owned.map((s) => ({ slug: s.slug, name: s.name, planId: normalizePlan((s as { planId?: unknown }).planId) }))}
            activeSlug={active?.slug ?? ""}
          />
          {active && (
            <StaffPanel
              shopSlug={active.slug}
              shopName={active.name}
              isGold={activePlan === "gold"}
              isOwner={isOwner}
              initial={members.map((m) => ({ userId: m.userId, role: m.role, name: m.name, email: m.email }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
