import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CreditCard,
  Eye,
  Mail,
  Megaphone,
  MessageCircle,
  Package,
  Plus,
  ShieldAlert,
  Store,
} from "lucide-react";
import { getStore } from "@/lib/store";
import { ReferralPanel } from "@/components/referral-panel";
import { getSellerAnalyticsReport } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const metadata = { title: "Seller Dashboard" };

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/dashboard");
  const store = getStore();
  const mine = await store.listListingsByOwner(user.id);
  const perf = await getSellerAnalyticsReport({ id: user.id, name: user.name }, 30).catch(() => null);
  // Name/role/verified can change after sign-in (profile edits, admin approval) — read fresh.
  const fresh = await store.findUserById(user.id).catch(() => null);
  const name = fresh?.name ?? user.name;
  const role = fresh?.role ?? user.role;
  const verified = fresh?.verified ?? user.verified;
  const emailVerified = fresh?.emailVerified ?? false;
  const kind = fresh?.sellerKind ?? "individual";
  const verifyHref = kind === "business" ? "/dashboard/verify?kind=business" : "/dashboard/verify";

  const active = mine.filter((l) => l.status === "active").length;
  const pending = mine.filter((l) => l.status === "pending").length;
  let unread = 0;
  try {
    const convos = await store.listConversations({
      userId: user.id,
      phone: fresh?.phone ?? user.phone,
      sellerName: name,
    });
    unread = convos.reduce((s, c) => s + (c.unread ?? 0), 0);
  } catch {}

  const stats = [
    {
      href: "/dashboard/listings",
      label: "My listings",
      value: String(mine.length),
      sub: `${active} live · ${pending} in review`,
      Icon: Package,
      tile: "bg-brand-50 text-brand-700",
    },
    {
      href: "/dashboard/messages",
      label: "Enquiries",
      value: unread > 0 ? `${unread} new` : "Inbox",
      sub: unread > 0 ? "Buyer messages waiting" : "No unread messages",
      Icon: MessageCircle,
      tile: "bg-green-50 text-green-700",
    },
    {
      href: "/dashboard/analytics",
      label: "Views · 30 days",
      value: (perf?.totalViews ?? 0).toLocaleString(),
      sub: `${(perf?.uniqueViewers ?? 0).toLocaleString()} unique viewers`,
      Icon: Eye,
      tile: "bg-amber-50 text-amber-700",
    },
    {
      href: verifyHref,
      label: "Verification",
      value: verified ? "Verified ✓" : "Pending",
      sub: verified ? "ID badge active" : "Get the ✓ badge",
      Icon: verified ? BadgeCheck : ShieldAlert,
      tile: verified ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700",
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="section-title">Hello, {name.split(" ")[0]} 👋</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="chip">{role}</span>
            <span className="chip">{kind === "business" ? "Business account" : "Individual seller"}</span>
            {verified ? (
              <span className="chip !border-green-600 !text-green-700">✓ Verified</span>
            ) : (
              <Link href={verifyHref} className="chip !border-amber-500 !text-amber-700 hover:underline">Verification pending →</Link>
            )}
            {!emailVerified && (
              <Link href="/dashboard/profile" className="chip hover:border-brand-600 hover:text-brand-700">
                <Mail className="h-3 w-3" /> Confirm email
              </Link>
            )}
          </div>
        </div>
        <Link href="/sell" className="btn-primary !py-2 text-sm">
          <Plus className="h-4 w-4" /> Create listing
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ href, label, value, sub, Icon, tile }) => (
          <Link key={href + label} href={href} className="card group flex items-center gap-3 p-4 hover:border-brand-600">
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tile)}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-extrabold leading-tight">{value}</span>
              <span className="block text-xs font-semibold">{label}</span>
              <span className="block truncate text-xs text-ink-400">{sub}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { href: "/dashboard/promotion", label: "Promote", d: "Boost a listing", Icon: Megaphone },
          { href: "/dashboard/shop", label: "My shop", d: "Storefront, listings & settings", Icon: Store },
          { href: "/dashboard/plan", label: "Plan & billing", d: "Upgrade, wallet & invoices", Icon: CreditCard },
          { href: "/dashboard/analytics", label: "Analytics", d: "Views & funnel", Icon: BarChart3 },
        ].map(({ href, label, d, Icon }) => (
          <Link key={href} href={href} className="card flex items-center gap-2.5 p-4 hover:border-brand-600">
            <Icon className="h-5 w-5 shrink-0 text-brand-600" />
            <span>
              <span className="flex items-center gap-1 text-sm font-bold">{label} <ArrowRight className="h-3.5 w-3.5" /></span>
              <span className="block text-xs text-ink-400">{d}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="card p-5">
          <p className="font-bold">Next actions</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
            {!verified && (
              <li>
                {kind === "business" ? "Verify your business permit in " : "Verify your ID in "}
                <Link href={verifyHref} className="link-bd">Verification</Link>
                {kind === "business" && ", then open your shop below"}
              </li>
            )}
            {kind === "business" && verified && (
              <li>Set up your storefront in <Link href="/dashboard/shop" className="link-bd">My shop</Link></li>
            )}
            <li>Publish your first listing — drafts save on this device</li>
            <li>Promote eligible listings from <Link href="/dashboard/promotion" className="link-bd">Promotion</Link></li>
          </ul>
        </div>
        <ReferralPanel />
      </div>
    </div>
  );
}
