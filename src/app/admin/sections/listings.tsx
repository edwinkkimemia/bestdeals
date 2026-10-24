import Link from "next/link";
import { Package } from "lucide-react";
import { getStore } from "@/lib/store";
import { formatKES } from "@/lib/format";
import { AdminButtons } from "../actions";
import { AdminTable, Td, StatusChip, SectionHeading, SectionTabs, fmtDate, listingPath } from "../table";

const STATUSES = ["pending", "active", "rejected", "hidden", "sold"];

export async function ListingsSection({ status }: { status: string }) {
  const current = STATUSES.includes(status) ? status : "pending";
  const items = await getStore().listListingsByStatus(current);
  return (
    <div>
      <SectionHeading icon={Package}>Listing moderation ({items.length})</SectionHeading>
      <SectionTabs base="/admin/listings" tabs={STATUSES} current={current} />
      <AdminTable
        columns={["Listing", "Type", "Price", "Seller", "Location", "Status", "Submitted", "Preview", "Actions"]}
        empty={`Nothing ${current} ✓`}
      >
        {items.map((l) => (
          <tr key={l.id} className="transition hover:bg-sand-50">
            <Td>
              <span className="flex items-center gap-2.5">
                {l.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.images[0]} alt="" loading="lazy" className="h-10 w-12 shrink-0 rounded-lg bg-sand-100 object-cover" />
                ) : (
                  <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg bg-sand-100 font-black text-ink-400">
                    {l.title.charAt(0).toUpperCase()}
                  </span>
                )}
                <strong className="line-clamp-2 max-w-56">{l.title}</strong>
              </span>
            </Td>
            <Td className="whitespace-nowrap text-ink-500">{l.type}</Td>
            <Td className="whitespace-nowrap font-semibold">{formatKES(l.price)}</Td>
            <Td>{l.sellerName}</Td>
            <Td className="whitespace-nowrap text-ink-500">{l.town}, {l.county}</Td>
            <Td><StatusChip status={l.status} /></Td>
            <Td className="whitespace-nowrap text-ink-500">{fmtDate(l.createdAt)}</Td>
            <Td>
              <span className="flex flex-col gap-1">
                <Link
                  href={listingPath(l)}
                  className="link-bd text-xs"
                  title="Open the product exactly as buyers will see it (admin preview works even before approval)"
                >
                  Preview →
                </Link>
                <Link
                  href={`/dashboard/listings/${l.id}`}
                  className="link-bd text-xs"
                  title="Open the full manage page (edit details, photos, price)"
                >
                  Edit →
                </Link>
              </span>
            </Td>
            <Td><AdminButtons kind="listing" id={l.id} /></Td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
