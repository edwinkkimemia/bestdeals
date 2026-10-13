import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { getStore } from "@/lib/store";
import { AdminButtons } from "../actions";
import { AdminTable, Td, StatusChip, SectionHeading, SectionTabs, fmtDate } from "../table";
import { Badge } from "@/components/ui/badge";

const TABS = ["pending", "approved", "rejected", "all"];

export async function VerificationsSection({ status }: { status: string }) {
  const store = getStore();
  const current = TABS.includes(status) ? status : "pending";
  const { attachVerificationUsers } = await import("@/lib/verifications");
  const [verifications, allUsers] = await Promise.all([
    store.listVerifications(current === "all" ? undefined : current),
    store.listUsers().catch(() => []),
  ]);
  const items = attachVerificationUsers(verifications, allUsers);
  return (
    <div>
      <SectionHeading icon={BadgeCheck}>Seller verifications ({items.length})</SectionHeading>
      <p className="mt-1 text-sm text-ink-500">Each row shows who uploaded the document — approve grants the seller ✓ and verifies their shops.</p>
      <SectionTabs base="/admin/verifications" tabs={TABS} current={current} />
      <AdminTable
        columns={["Document", "Uploader", "Contact", "Submitted", "Actions"]}
        empty={`None ${current}.`}
      >
        {items.map((v) => (
          <tr key={v.id} className="transition hover:bg-sand-50">
            <Td>
              {v.docPath ? (
                <Link
                  href={`/api/admin/verifications/${v.id}/doc`}
                  target="_blank"
                  className="block shrink-0 overflow-hidden rounded-lg border border-neutral-200"
                  title={`Open ${v.fileName ?? "document"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/admin/verifications/${v.id}/doc`} alt="" className="h-16 w-16 object-cover" loading="lazy" />
                </Link>
              ) : (
                <span className="text-xs text-ink-400">no file</span>
              )}
              <span className="mt-1 block max-w-28 truncate text-xs text-ink-400" title={v.fileName ?? ""}>{v.fileName ?? ""}</span>
            </Td>
            <Td>
              <strong className="block">{v.user?.name ?? "Deleted account"}</strong>
              {v.user?.businessName && <span className="block text-xs text-ink-500">🏪 {v.user.businessName}</span>}
              <span className="mt-1 flex flex-wrap gap-1">
                <Badge>{v.kind === "business" ? "permit" : "ID"}</Badge>
                <Badge>{v.user?.sellerKind === "business" ? "business" : "individual"}</Badge>
                <StatusChip status={v.status} />
                {v.user?.verified && <Badge tone="green">✓ seller</Badge>}
              </span>
            </Td>
            <Td>
              <span className="block">{v.user ? v.user.email : `user ${v.userId}`}</span>
              <span className="block text-xs text-ink-500">{v.user ? `${v.user.phone} · joined ${fmtDate(v.user.createdAt)}` : "account deleted"}</span>
              <span className="block text-xs text-ink-400">☎ {v.phone ?? "no phone"}</span>
            </Td>
            <Td className="whitespace-nowrap text-ink-500">{fmtDate(v.createdAt)}</Td>
            <Td>
              <span className="flex flex-wrap items-center gap-2">
                {v.docPath && <Link href={`/api/admin/verifications/${v.id}/doc`} target="_blank" className="link-bd text-xs">View doc →</Link>}
                {v.status === "pending" && <AdminButtons kind="verify" id={v.id} />}
              </span>
            </Td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
