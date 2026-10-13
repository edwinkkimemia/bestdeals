import { Star } from "lucide-react";
import { getStore } from "@/lib/store";
import { AdminButtons } from "../actions";
import { AdminTable, Td, SectionHeading } from "../table";
import { Badge } from "@/components/ui/badge";

export async function ReviewsSection() {
  const items = await getStore().listPendingReviews();
  return (
    <div>
      <SectionHeading icon={Star}>Review moderation ({items.length})</SectionHeading>
      <AdminTable columns={["Rating", "Author", "For", "Review", "Actions"]} empty="None pending.">
        {items.map((r) => (
          <tr key={r.id} className="transition hover:bg-sand-50">
            <Td className="whitespace-nowrap text-amber-500">{"★".repeat(r.rating)}</Td>
            <Td>
              <strong className="block">{r.authorName}</strong>
              {r.verifiedPurchase && <Badge tone="green" className="mt-1">✓ purchase</Badge>}
            </Td>
            <Td>
              {r.sellerName && <span className="block">{r.sellerName}</span>}
              {r.shopSlug && <span className="block text-xs text-ink-500">shop {r.shopSlug}</span>}
              {!r.sellerName && !r.shopSlug && <span className="text-ink-400">—</span>}
            </Td>
            <Td className="max-w-72">{r.body || <span className="text-ink-400">—</span>}</Td>
            <Td><AdminButtons kind="review" id={r.id} /></Td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
