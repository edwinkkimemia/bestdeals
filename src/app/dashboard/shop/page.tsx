import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, Store } from "lucide-react";
import { normalizePlan } from "@/lib/plans";
import { getStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { WmImage } from "@/components/ui/wm-image";
import { formatKES } from "@/lib/format";
import { BulkPanel, StaffPanel, ShopHeaderForm } from "./panels";

export const metadata = { title: "My Shop" };
export const dynamic = "force-dynamic";

const publicPath = (l: { type: string; slug: string }) =>
  `/${l.type === "classified" ? "classifieds" : l.type === "service" ? "services" : "product"}/${l.slug}`;

export default async function ShopDash({ searchParams }: { searchParams: { new?: string } }) {
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
  const catalogue = active ? await store.listListingsByShop(active.slug).catch(() => []) : [];
  const liveCount = catalogue.filter((l) => l.status === "active").length;
  const isOwner =
    user.role === "ADMIN" ||
    active?.ownerId === user.id ||
    members.some((m) => m.userId === user.id && m.role === "owner");
  const { isDbConfigured } = await import("@/lib/db");
  return (
    <div>
      <h1 className="section-title flex items-center gap-2"><Store className="h-6 w-6 text-brand-600" /> My shop</h1>
      {!isDbConfigured() && (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Demo storage is active (no DATABASE_URL) — shops, logos and covers reset on restart/redeploy. Set DATABASE_URL + run migrations to keep them.
        </p>
      )}
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
              ? "Submit your business permit and owner ID — they become your verified-business ✓ badge."
              : "Every seller is verified (national ID + email + phone) before posting or opening a shop."}
          </p>
          <Link href={kind === "business" ? "/dashboard/verify?kind=business" : "/dashboard/verify"} className="btn-primary mt-3">
            {kind === "business" ? "Verify business" : "Get verified"}
          </Link>
        </div>
      )}
      <div className="mt-4 grid items-start gap-3 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="card min-w-0 p-5">
            <p className="font-bold">Storefront{active ? ` · ${active.name}` : ""}</p>
            <p className="text-sm text-ink-500">Your public URL will be <code className="break-all">chap.co.ke/shops/your-name</code> with availability check &amp; safe slugs.</p>
            {active ? (
              <p className="mt-2 text-sm"><Link href={`/shops/${active.slug}`} className="link-bd">View your storefront →</Link></p>
            ) : (
              <Link href="/shops/fon-zone-nairobi" className="link-bd text-sm">See an example storefront →</Link>
            )}
            <form action="/api/shops" method="post" className="mt-3 space-y-2">
              <input name="name" required placeholder="Business name" defaultValue={fresh?.businessName ?? ""} className="input-bd" aria-label="Business name" />
              <button className="btn-primary w-full" formAction="/api/shops" type="submit">Check availability & create</button>
            </form>
            {active && <BulkPanel shopName={active.name} isGold={activePlan === "gold"} />}
          </div>
          {active && (
            <div className="card mt-3 p-5">
              <p className="font-bold">Shop listings ({catalogue.length} · {liveCount} live)</p>
              <p className="mt-0.5 text-xs text-ink-500">Everything attached to this storefront — pending items go live after moderation.</p>
              {catalogue.length === 0 ? (
                <p className="mt-3 text-sm text-ink-500">Nothing here yet. <Link href="/sell" className="link-bd">List your first item →</Link></p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {catalogue.slice(0, 20).map((l) => (
                    <li key={l.id} className="min-w-0 rounded-xl border border-neutral-200 p-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {l.images[0] ? (
                          <WmImage src={l.images[0]} alt="" className="h-11 w-14 shrink-0 rounded-lg bg-sand-100 object-cover" />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src="/chaplogo.png" alt="" className="h-11 w-14 shrink-0 rounded-lg bg-sand-100 object-cover" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{l.title}</span>
                          <span className="block text-xs text-ink-400">{formatKES(l.price)}</span>
                        </span>
                        <Badge tone={l.status === "active" ? "green" : l.status === "pending" ? "amber" : l.status === "rejected" ? "red" : "neutral"}>{l.status}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link href={publicPath(l)} className="btn-secondary shrink-0 !px-2.5 !py-1 text-xs">
                          {l.status === "active" ? "View" : "Preview"}
                        </Link>
                        <Link href={`/dashboard/listings/${l.id}`} className="btn-secondary shrink-0 !px-2.5 !py-1 text-xs">Manage</Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {catalogue.length > 20 && (
                <p className="mt-2 text-xs"><Link href="/dashboard/listings" className="link-bd">All listings in My listings →</Link></p>
              )}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="card min-w-0 p-5">
            <p className="font-bold">Settings</p>
            <p className="mt-0.5 text-xs text-ink-500">Shop details buyers see. Plans & billing live on the <Link href="/dashboard/plan" className="link-bd">Plan page →</Link></p>
          </div>
          {active && isOwner && (
            <ShopHeaderForm
              shop={{
                slug: active.slug,
                name: active.name,
                description: active.description,
                businessCategory: active.businessCategory,
                county: active.county,
                town: active.town,
                phone: active.phone,
                logoUrl: active.logoUrl ?? null,
                coverUrl: active.coverUrl ?? null,
                deliveryInfo: active.deliveryInfo ?? null,
                hours: active.hours ?? null,
                website: active.website ?? null,
                email: active.email ?? null,
                socials: active.socials ?? null,
              }}
            />
          )}
          {active && (
            <StaffPanel
              shopSlug={active.slug}
              shopName={active.name}
              isGold={activePlan === "gold"}
              isOwner={isOwner}
              initial={members.map((m) => ({ userId: m.userId, role: m.role, name: m.name, email: m.email }))}
            />
          )}
          {!active && (
            <p className="card mt-3 flex items-center gap-2 p-5 text-sm text-ink-500">
              <Package className="h-4 w-4 shrink-0 text-brand-600" />
              Create your storefront first — settings unlock here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
