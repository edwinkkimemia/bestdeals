import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/store";
import { formatKES } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ProfileForm, SettingsPanel } from "./forms";

export function generateStaticParams() {
  return [{ page: "profile" }, { page: "promotion" }, { page: "settings" }];
}

export const metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function DashPage({ params }: { params: { page: string } }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin");
  const store = getStore();
  const fresh = await store.findUserById(user.id).catch(() => null);

  if (params.page === "profile") {
    return (
      <div className="container-bd max-w-2xl py-8">
        <h1 className="section-title">Profile</h1>
        <p className="mt-1 text-sm text-ink-500">This is what buyers see on your listings. Verification is handled separately and can&rsquo;t be self-awarded.</p>
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
    const eligible = mine.filter((l) => l.status === "active");
    return (
      <div className="container-bd max-w-2xl py-8">
        <h1 className="section-title">Promotion</h1>
        <p className="mt-1 text-sm text-ink-500">Paid visibility is always labelled Featured/Sponsored and never overrides moderation. Eligibility is checked live below.</p>
        <div className="card mt-4 p-5 text-sm">
          <p className="font-bold">How featuring works</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-700">
            <li>Only <strong>active</strong> (moderation-approved) listings with at least one photo qualify.</li>
            <li>Verified sellers rank higher in featured rails; unverified shops can still boost.</li>
            <li>Featured slots come from Growth/Professional credits or per-boost payment — see plans.</li>
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
          <ul className="mt-2 space-y-2">
            {mine.map((l) => {
              const ok = l.status === "active" && l.images.length > 0;
              return (
                <li key={l.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
                  <span className="flex-1"><strong>{l.title}</strong> <span className="text-ink-400">· {formatKES(l.price)}</span></span>
                  <Badge tone={l.status === "active" ? "green" : l.status === "pending" ? "amber" : "neutral"}>{l.status}</Badge>
                  <span className="chip">{ok ? "Eligible ✓" : l.status !== "active" ? "Needs approval" : "Add photos"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  // settings
  return (
    <div className="container-bd max-w-2xl py-8">
      <h1 className="section-title">Account settings</h1>
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
