import Link from "next/link";
import { Suspense } from "react";
import { currentUser } from "@/lib/auth";
import { ListingForm } from "@/components/listing-form";
import { PageBreadcrumb } from "@/components/page-breadcrumb";

export const metadata = {
  title: "Sell an item",
  description: "Post a product, classified or service on Chap in minutes. Free for individuals, moderated for trust.",
};

export default async function SellPage() {
  const user = await currentUser().catch(() => null);

  if (!user) {
    return (
      <div className="container-bd py-8">
        <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Sell" }]} />
        <div className="mx-auto mt-6 max-w-xl">
          <h1 className="section-title">Sell on Chap</h1>
          <p className="mt-2 text-ink-500">Sign in to post your item — it takes a minute, and listing is free for individuals.</p>
          <div className="card mt-5 space-y-2 p-5">
            <Link href="/auth/signin?next=/sell" className="btn-primary w-full">Sign in to continue</Link>
            <Link href="/auth/signup?next=/sell" className="btn-secondary w-full">Create free account</Link>
            <Link href="/start-selling" className="link-bd mt-1 inline-block text-sm">How selling works →</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Sell" }]} />
      <div className="mx-auto mt-4 max-w-2xl">
        <h1 className="section-title">Sell an item</h1>
        <VerificationGate userId={user.id} />
        <p className="mt-1 text-sm text-ink-500">Fields adapt to the category. Photos upload from your phone; listings go live after moderation.</p>
        <Suspense fallback={<div className="card mt-4 p-8 text-center text-sm">Loading form…</div>}>
          <ListingForm />
        </Suspense>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/dashboard/listings" className="link-bd">My listings →</Link>
          <Link href="/sellers" className="link-bd">Seller guidelines →</Link>
        </div>
      </div>
    </div>
  );
}

async function VerificationGate({ userId }: { userId: string }) {
  const { getStore } = await import("@/lib/store");
  const fresh = await getStore().findUserById(userId).catch(() => null);
  if (fresh?.verified) return null;
  const business = fresh?.sellerKind === "business";
  return (
    <div className="card mt-4 border-amber-300 bg-amber-50 p-4 text-sm">
      <p className="font-bold text-amber-900">Verify before you post</p>
      <p className="mt-1 text-amber-800">
        {business
          ? "Businesses verify with a permit and owner ID before the first listing. It unlocks your verified-business ✓ badge."
          : "Every seller is verified by our team (national ID + email + phone) before their first listing. It keeps buyers safe — and unlocks your ✓ badge."}
      </p>
      <Link href={business ? "/dashboard/verify?kind=business" : "/dashboard/verify"} className="btn-primary mt-3">Get verified</Link>
    </div>
  );
}
