import Link from "next/link";
import { Suspense } from "react";
import { currentUser } from "@/lib/auth";
import { getCategories } from "@/lib/categories";
import { ListingForm } from "@/components/listing-form";
import { SellerVerificationCard } from "@/components/seller-verification";
import { PageBreadcrumb } from "@/components/page-breadcrumb";

export const metadata = {
  title: "Sell an item",
  description: "Post a product, classified or service on Chap in minutes. Free for individuals, moderated for trust.",
  // Transactional form — the public marketing page is /start-selling.
  robots: { index: false, follow: true },
  alternates: { canonical: "https://chap.co.ke/sell" },
};

export default async function SellPage() {
  const user = await currentUser().catch(() => null);
  const categories = await getCategories();

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

  const { getStore } = await import("@/lib/store");
  const fresh = await getStore().findUserById(user.id).catch(() => null);
  const verified = fresh?.verified ?? false;

  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Sell" }]} />
      <div className="mt-4">
        <h1 className="section-title">Sell an item</h1>
        {verified ? (
          <>
            <p className="mt-1 text-sm text-ink-500">Fields adapt to the category. Photos upload from your phone; listings go live after moderation.</p>
            <Suspense fallback={<div className="card mt-4 p-8 text-center text-sm">Loading form…</div>}>
              <ListingForm categories={categories} />
            </Suspense>
          </>
        ) : (
          <SellerVerificationCard initialKind={fresh?.sellerKind} initialPhone={fresh?.phone} />
        )}
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/dashboard/listings" className="link-bd">My listings →</Link>
          <Link href="/sellers" className="link-bd">Seller guidelines →</Link>
          <Link href="/dashboard/verify" className="link-bd">Verification centre →</Link>
        </div>
      </div>
    </div>
  );
}
