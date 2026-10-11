import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { canManageListing } from "@/lib/gate";
import { redirect, notFound } from "next/navigation";
import { getListing } from "@/data/catalog";
import { getStore } from "@/lib/store";
import { formatKES } from "@/lib/format";
import { ListingForm } from "@/components/listing-form";
import { ManageActions } from "./actions";

export const metadata = { title: "Manage listing" };

export default async function ManageListing({ params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) redirect(`/auth/signin?next=${encodeURIComponent(`/dashboard/listings/${params.id}`)}`);
  const stored = await getStore().getListing(params.id);
  const demo = !stored ? getListing(params.id) : null;
  if (!stored && !demo) notFound();
  // Ownership check — sellers manage their own listings; shop staff (Gold)
  // may manage their shop's catalogue; admins exempt.
  if (stored && !(await canManageListing(user, stored))) notFound();

  if (!stored && demo) {
    return (
      <div className="container-bd max-w-2xl py-8">
        <Link href="/dashboard/listings" className="link-bd text-sm">← My listings</Link>
        <h1 className="section-title mt-2">Manage listing</h1>
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

  return (
    <div className="container-bd max-w-2xl py-8">
      <Link href="/dashboard/listings" className="link-bd text-sm">← My listings</Link>
      <h1 className="section-title mt-2">Manage listing</h1>
      <div className="card mt-4 p-5">
        <p className="font-bold">{title}</p>
        <p className="text-sm text-ink-500">{meta}</p>
        {stored!.status === "pending" && (
          <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">In moderation queue — it goes live once approved. You can still edit details below (edits keep it in queue).</p>
        )}
        {stored!.status === "rejected" && (
          <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">Rejected by moderation. Fix the details below and save — it goes back for review automatically.</p>
        )}
        <ManageActions id={stored!.id} status={stored!.status} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/promotion" className="btn-primary">Promote</Link>
        </div>
      </div>
      <h2 className="mt-8 font-bold">Edit details</h2>
      <ListingForm
        listingId={stored!.id}
        submitLabel="Save changes"
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
