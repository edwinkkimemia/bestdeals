import { notFound } from "next/navigation";
import { ListingsSection } from "../sections/listings";
import { VerificationsSection } from "../sections/verifications";
import { UsersSection } from "../sections/users";
import { ShopsSection } from "../sections/shops";
import { OrdersSection } from "../sections/orders";
import { DisputesSection } from "../sections/disputes";
import { ReportsSection } from "../sections/reports";
import { ReviewsSection } from "../sections/reviews";
import { PromotionsSection } from "../sections/promotions";

export const dynamic = "force-dynamic";

const SECTIONS = ["listings", "verifications", "users", "shops", "orders", "disputes", "reports", "reviews", "promotions"] as const;
export function generateStaticParams() {
  return SECTIONS.map((section) => ({ section }));
}

export const metadata = { title: "Admin section", robots: { index: false, follow: false } };

/**
 * Thin router — each section lives in ./sections/* as a proper table
 * (see src/app/admin/table.tsx for the shared table + status tabs).
 */
export default async function AdminSection({
  params,
  searchParams,
}: {
  params: { section: string };
  searchParams: { status?: string };
}) {
  const { section } = params;
  if (!(SECTIONS as readonly string[]).includes(section)) notFound();
  const status = searchParams.status ?? "";

  switch (section) {
    case "listings":
      return <ListingsSection status={status} />;
    case "verifications":
      return <VerificationsSection status={status} />;
    case "users":
      return <UsersSection />;
    case "shops":
      return <ShopsSection status={status} />;
    case "orders":
      return <OrdersSection />;
    case "disputes":
      return <DisputesSection />;
    case "reports":
      return <ReportsSection status={status} />;
    case "reviews":
      return <ReviewsSection />;
    case "promotions":
      return <PromotionsSection status={status} />;
    default:
      notFound();
  }
}
