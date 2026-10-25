import Link from "next/link";
import { Megaphone } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { canManageListing } from "@/lib/gate";
import { redirect, notFound } from "next/navigation";
import { getListing } from "@/data/catalog";
import { getStore } from "@/lib/store";
import { getCategories } from "@/lib/categories";
import { formatKES } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ListingForm } from "@/components/listing-form";
import { ManageActions } from "./actions";
import { CopyListingLink } from "@/components/copy-listing-link";

export const metadata = { title: "Manage listing" };

export default async function ManageListing({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { submitted?: string };
}) {
  const user = await currentUser();
  if (!user) redirect(`/auth/signin?next=${encodeURIComponent(`/dashboard/listings/${params.id}`)}`);
  const categories = await getCategories();
  const stored = await getStore().getListing(params.id);
  const demo = !stored ? getListing(params.id) : null;
  if (!stored && !demo) notFound();
  // Ownership check — sellers manage their own listings; shop staff (Gold)
  // may manage their shop's catalogue; admins exempt.
  if (stored && !(await canManageListing(user, stored))) notFound();

  if (!stored && demo) {
    return (
      <div>
        <h1 className="section-title">Manage listing</h1>
        <div className="card mt-4 p-5">
          <p className="font-bold">{demo.title}</p>
          <p className="text-sm text-ink-500">{demo.listingType} · {demo.town}, {demo.county}</p>
          <p className="mt-2 rounded-xl bg-sand-50 p-3 text-sm">Sample catalogue item — create your own listing to edit, hide or mark as sold.</p>
          <div className="mt-4"><Link href="/sell" className="btn-primary">Create a listing</Link></div>
        </div>
      </div>
    );
  }

  const title = stored!.title;
  const meta = `${stored!.type} · ${formatKES(stored!.price)} · ${stored!.town}, ${stored!.county} · stock ${stored!.stock} · status: ${stored!.status}`;
  const moderationReason = stored!.status === "rejected"
    ? await getStore().getLatestModerationReason(stored!.id).catch(() => null)
    : null;
  const publicPath = `/${stored!.type === "classified" ? "classifieds" : stored!.type === "service" ? "services" : "product"}/${stored!.slug}`;

  return (
    <div>
      <h1 className="section-title">Manage listing</h1>
      {searchParams?.submitted === "1" && stored!.status === "pending" && (
        <div role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-bold">Listing submitted for review</p>
          <p className="mt-1">We&apos;ve received it and you&apos;ll be notified once it&apos;s approved. You can still edit the details below while it waits in the moderation queue.</p>
        </div>
      )}
      <div className="card mt-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex-1 font-bold">{title}</p>
          <Badge tone={stored!.status === "active" ? "green" : stored!.status === "pending" ? "amber" : stored!.status === "rejected" ? "red" : "neutral"}>{stored!.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-ink-500">{meta}</p>
        {stored!.status === "pending" && (
          <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">In moderation queue — it goes live once approved. You can still edit details below (edits keep it in queue).</p>
        )}
        {stored!.status === "rejected" && (
          <div className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <p className="font-semibold">Rejected by moderation{moderationReason ? `: ${moderationReason}` : "."}</p>
            <p className="mt-0.5">Fix the details below and save — it goes back for review automatically.</p>
          </div>
        )}
        {stored!.status === "active" ? (
          <p className="mt-2 rounded-xl bg-green-50 p-3 text-sm text-green-800">
            Live now —{" "}
            <Link className="link-bd" href={publicPath}>
              view public page →
            </Link>{" "}
            {stored!.shopSlug && (
              <>
                · shop:{" "}
                <Link className="link-bd" href={`/shops/${stored!.shopSlug}`}>
                  /shops/{stored!.shopSlug} →
                </Link>
              </>
            )}
          </p>
        ) : (
          <p className="mt-2 rounded-xl bg-sand-50 p-3 text-sm text-ink-700">
            Not live yet ({stored!.status}) —{" "}
            <Link className="link-bd" href={publicPath}>
              open your preview →
            </Link>{" "}
            (only you, your shop staff and admins can see it until approved).
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={publicPath} className="btn-secondary !px-3 !py-1.5 text-xs">
            {stored!.status === "active" ? "View live" : "Preview"}
          </Link>
          <CopyListingLink path={publicPath} />
        </div>
        <ManageActions id={stored!.id} status={stored!.status} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/dashboard/promotion?listing=${stored!.id}`} className="btn-primary"><Megaphone className="h-4 w-4" /> Promote this listing</Link>
        </div>
      </div>
      <h2 className="mt-8 font-bold">Edit details</h2>
      <ListingForm
        listingId={stored!.id}
        submitLabel="Save changes"
        categories={categories}
        initialValues={{
          title: stored!.title,
          description: stored!.description,
          categorySlug: stored!.categorySlug ?? "",
          subcategory: stored!.subcategory ?? "",
          price: stored!.price,
          compareAt: stored!.compareAt ?? undefined,
          condition: stored!.condition as never,
          listingType: stored!.type as never,
          county: stored!.county,
          town: stored!.town,
          negotiable: stored!.negotiable,
          transactionMethod: stored!.txMethod as never,
          stock: stored!.stock,
          images: stored!.images,
          attributes: stored!.attributes,
        }}
      />
    </div>
  );
}
