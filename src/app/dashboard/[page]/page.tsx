import Link from "next/link";
import { Megaphone, Settings, User } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { ProfileForm, SettingsPanel, EmailVerifyPanel } from "./forms";
import { PromotePanel } from "./promote";

export function generateStaticParams() {
  return [{ page: "profile" }, { page: "promotion" }, { page: "settings" }];
}

export const metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function DashPage({ params }: { params: { page: string } }) {
  const user = await currentUser();
  if (!user) redirect(`/auth/signin?next=${encodeURIComponent(`/dashboard/${params.page}`)}`);
  if (!["profile", "promotion", "settings"].includes(params.page)) notFound();
  const store = getStore();
  const fresh = await store.findUserById(user.id).catch(() => null);

  if (params.page === "profile") {
    return (
      <div className="max-w-2xl">
        <h1 className="section-title flex items-center gap-2"><User className="h-6 w-6 text-brand-600" /> Profile</h1>
        <p className="mt-1 text-sm text-ink-500">This is what buyers see on your listings. Verification is handled separately and can&rsquo;t be self-awarded.</p>
        <div className="mt-4"><EmailVerifyPanel verified={fresh?.emailVerified ?? false} email={user.email} /></div>
        <div className="card mt-4 space-y-4 p-5">
          <ProfileForm name={fresh?.name ?? user.name} phone={fresh?.phone ?? user.phone} />
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-4 text-sm">
            <span>Email: <strong>{user.email}</strong></span>
            <span>·</span>
            {fresh?.verified ?? user.verified ? (
              <Badge tone="green">✓ Verified seller</Badge>
            ) : (
              <Link href="/dashboard/verify" className="link-bd">Get verified →</Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (params.page === "promotion") {
    const mine = await store.listListingsByOwner(user.id);
    return (
      <div className="max-w-2xl">
        <h1 className="section-title flex items-center gap-2"><Megaphone className="h-6 w-6 text-brand-600" /> Promotion</h1>
        <p className="mt-1 text-sm text-ink-500">Paid visibility is always labelled Featured/Sponsored and never overrides moderation. Eligibility is checked live below.</p>
        <div className="card mt-4 p-5 text-sm">
          <p className="font-bold">How featuring works</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-700">
            <li>Only <strong>active</strong> (moderation-approved) listings with at least one photo qualify.</li>
            <li>Verified sellers rank higher in featured rails; unverified shops can still boost.</li>
            <li>Featured slots come from Silver/Gold credits or per-boost payment — see plans.</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/pricing" className="btn-primary">See plans</Link>
            <Link href="/advertising" className="btn-secondary">Advertising options</Link>
          </div>
        </div>
        <h2 className="mt-6 font-bold">Your listings ({mine.length})</h2>
        {mine.length === 0 ? (
          <div className="card mt-2 p-6 text-center text-sm">
            <p className="font-bold">Nothing to promote yet</p>
            <Link href="/sell" className="btn-primary mt-3">Create a listing</Link>
          </div>
        ) : (
          <PromotePanel
            listings={mine.map((l) => ({ id: l.id, title: l.title, price: l.price, status: l.status, images: l.images.length }))}
            phone={fresh?.phone ?? user.phone}
            isAdmin={user.role === "ADMIN"}
          />
        )}
      </div>
    );
  }

  // settings
  return (
    <div className="max-w-2xl">
      <h1 className="section-title flex items-center gap-2"><Settings className="h-6 w-6 text-brand-600" /> Account settings</h1>
      <p className="mt-1 text-sm text-ink-500">Notifications, your data rights, and account deletion — all self-serve.</p>
      <div className="card mt-4 p-5">
        <SettingsPanel email={user.email} />
      </div>
      <form action="/api/auth/signout" method="post" className="mt-4">
        <button className="btn-secondary" type="submit">Sign out</button>
      </form>
    </div>
  );
}
