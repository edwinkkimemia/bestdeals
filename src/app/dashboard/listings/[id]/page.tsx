import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getListing } from "@/data/catalog";
import { getStore } from "@/lib/store";
import { notFound } from "next/navigation";
import { formatKES } from "@/lib/format";

export const metadata = { title: "Manage listing" };

export default async function ManageListing({ params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin");
  const stored = await getStore().getListing(params.id);
  const demo = !stored ? getListing(params.id) : null;
  if (!stored && !demo) notFound();
  const title = stored?.title ?? demo!.title;
  const meta = stored
    ? `${stored.type} · ${formatKES(stored.price)} · ${stored.town}, ${stored.county} · stock ${stored.stock} · status: ${stored.status}`
    : `${demo!.listingType} · ${demo!.town}, ${demo!.county}`;

  return (
    <div className="container-bd max-w-2xl py-8">
      <Link href="/dashboard/listings" className="link-bd text-sm">← My listings</Link>
      <h1 className="section-title mt-2">Manage listing</h1>
      <div className="card mt-4 p-5">
        <p className="font-bold">{title}</p>
        <p className="text-sm text-ink-500">{meta}</p>
        {stored?.status === "pending" && (
          <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">In moderation queue — it goes live once approved. No action needed.</p>
        )}
        {stored?.status === "rejected" && (
          <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">Rejected by moderation. Edit the details and resubmit via a new listing.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/promotion" className="btn-primary">Promote</Link>
        </div>
      </div>
    </div>
  );
}
