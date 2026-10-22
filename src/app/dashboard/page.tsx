import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  CreditCard,
  Eye,
  Mail,
  Megaphone,
  MessageCircle,
  Package,
  Plus,
  ShieldAlert,
  ShoppingCart,
  Store,
} from "lucide-react";
import { getStore } from "@/lib/store";
import { PlanCheckmark } from "@/components/ui/badge";
import { ReferralPanel } from "@/components/referral-panel";
import { getSellerAnalyticsReport } from "@/lib/analytics";
import { listingHref } from "@/lib/related";
import { timeAgo } from "@/lib/format";
import { dedupeNotifications } from "@/lib/notification-dedupe";
import { cn } from "@/lib/utils";

/** Icon + tone for a notification row, shared by the dashboard preview. */
function notifVisual(type: string): { Icon: typeof Bell; tone: string } {
  if (type === "message") return { Icon: MessageCircle, tone: "bg-green-50 text-green-700" };
  if (type === "listing") return { Icon: Package, tone: "bg-brand-50 text-brand-700" };
  if (type === "order") return { Icon: ShoppingCart, tone: "bg-amber-50 text-amber-700" };
  if (type === "verification") return { Icon: BadgeCheck, tone: "bg-green-50 text-green-700" };
  if (type === "promotion") return { Icon: Megaphone, tone: "bg-red-50 text-red-700" };
  return { Icon: Bell, tone: "bg-sand-100 text-ink-500" };
}

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
  const rejected = mine.filter((l) => l.status === "rejected").length;
  const liveListing = mine.find((l) => l.status === "active");
  const liveHref = liveListing
    ? listingHref({ listingType: liveListing.type, slug: liveListing.slug })
    : null;
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

  // Contextual checklist: only surface actions that still apply to this seller.
  const nextActions: { title: string; note: string; href: string }[] = [];
  if (rejected > 0) {
    nextActions.push({
      title: `Fix ${rejected} declined listing${rejected === 1 ? "" : "s"}`,
      note: "Edit the details and resubmit for review",
      href: "/dashboard/listings",
    });
  }
  if (pending > 0) {
    nextActions.push({
      title: `We’re reviewing ${pending} listing${pending === 1 ? "" : "s"}`,
      note: "Usually decided within 2 business days",
      href: "/dashboard/listings",
    });
  }
  if (mine.length === 0) {
    nextActions.push({
      title: "Publish your first listing",
      note: "Drafts save on this device",
      href: "/sell",
    });
  }
  if (liveListing && liveHref) {
    nextActions.push({
      title: "Share your live listing",
      note: `“${liveListing.title}” is ready for buyers`,
      href: liveHref,
    });
  }
  if (active > 0) {
    nextActions.push({
      title: "Boost a live listing",
      note: "Featured listings get more views",
      href: "/dashboard/promotion",
    });
  }
  if (!verified) {
    nextActions.push({
      title: "Get verified",
      note: "The ✓ badge builds buyer trust",
      href: verifyHref,
    });
  }
  if (kind === "business" && verified) {
    nextActions.push({
      title: "Polish your storefront",
      note: "Add a cover, bio and contact details",
      href: "/dashboard/shop",
    });
  }
  if (!emailVerified) {
    nextActions.push({
      title: "Confirm your email",
      note: "Secure your account and notification alerts",
      href: "/dashboard/profile",
    });
  }
  const actions = nextActions.slice(0, 4);

  // Jiji-style recent activity for the bell feed (best-effort, max 5).
  let recentNotifs: { id: string; type: string; title: string; body: string; link?: string; readAt?: string | null; createdAt: string }[] = [];
  try {
    recentNotifs = dedupeNotifications(await store.listNotifications(user.id, { limit: 100 }));
  } catch {}
  const latestNotifs = recentNotifs.slice(0, 5);
  const notifUnread = recentNotifs.filter((n) => !n.readAt).length;

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
            <PlanCheckmark plan={fresh?.planId} />
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

      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="card min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="flex min-w-0 items-center gap-1.5 font-bold">
              <Bell className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="sm:hidden">Notifications</span>
              <span className="hidden sm:inline">Latest notifications</span>
              {notifUnread > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-white">
                  {notifUnread > 99 ? "99+" : notifUnread}
                </span>
              )}
            </p>
            <Link href="/dashboard/notifications" className="link-bd ml-auto shrink-0 whitespace-nowrap text-sm">View all →</Link>
          </div>
          {latestNotifs.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">No notifications yet — chats, approvals and order updates will appear here.</p>
          ) : (
            <ul className="mt-2 divide-y divide-neutral-100">
              {latestNotifs.map((n) => {
                const { Icon, tone } = notifVisual(n.type ?? "");
                return (
                  <li key={n.id}>
                    <Link href={n.link || "/dashboard/notifications"} className="flex items-start gap-2.5 py-2.5">
                      <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", tone)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("line-clamp-2 text-sm", n.readAt ? "font-semibold" : "font-bold")}>{n.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-ink-500">{n.body}</span>
                        <span className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-400">
                          {!n.readAt && <span aria-label="Unread" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />}
                          {timeAgo(n.createdAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="card min-w-0 p-4 sm:p-5">
          <p className="font-bold">Next actions</p>
          <p className="mt-1 text-xs text-ink-500">Small steps that move your shop forward.</p>
          {actions.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">You’re all set. Browse the marketplace for your next opportunity.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {actions.map((a) => (
                <li key={a.title}>
                  <Link href={a.href} className="group -mx-2 flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-sand-50">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold group-hover:text-brand-700">{a.title}</span>
                      <span className="block text-xs text-ink-400">{a.note}</span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-300 group-hover:text-brand-600" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <ReferralPanel />
      </div>
    </div>
  );
}
