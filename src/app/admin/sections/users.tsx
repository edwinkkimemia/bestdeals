import { Users } from "lucide-react";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { AdminButtons } from "../actions";
import { AdminTable, Td, SectionHeading, fmtDate } from "../table";
import { Badge } from "@/components/ui/badge";

const STATUS_TABS = ["all", "verified", "unverified"] as const;
const ROLE_TABS = ["all", "admin", "seller", "merchant", "buyer"] as const;
const SORT_TABS = ["newest", "oldest", "name"] as const;

function href(status: string, role: string, sort: string): string {
  return `/admin/users?status=${status}&role=${role}&sort=${sort}`;
}

function FilterRow({ label, tabs, current, makeHref }: { label: string; tabs: readonly string[]; current: string; makeHref: (t: string) => string }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold text-ink-500">{label}:</span>
      {tabs.map((t) => (
        <Link key={t} href={makeHref(t)} className={`chip ${current === t ? "!border-brand-600 !text-brand-700" : ""}`}>{t}</Link>
      ))}
    </div>
  );
}

export async function UsersSection({ status, role, sort }: { status: string; role: string; sort: string }) {
  const store = getStore();
  const tab = (STATUS_TABS as readonly string[]).includes(status) ? status : "all";
  const roleTab = (ROLE_TABS as readonly string[]).includes(role.toLowerCase()) ? role.toLowerCase() : "all";
  const sortTab = (SORT_TABS as readonly string[]).includes(sort) ? sort : "newest";
  const all = await store.listUsers();
  const items = all
    .filter((u) => (tab === "all" ? true : tab === "verified" ? u.verified : !u.verified))
    .filter((u) => (roleTab === "all" ? true : u.role.toLowerCase() === roleTab))
    .sort((a, b) =>
      sortTab === "name"
        ? a.name.localeCompare(b.name)
        : sortTab === "oldest"
          ? +new Date(a.createdAt) - +new Date(b.createdAt)
          : +new Date(b.createdAt) - +new Date(a.createdAt)
    );
  const unverifiedCount = all.filter((u) => !u.verified).length;
  return (
    <div>
      <SectionHeading icon={Users}>Users ({items.length}{tab === "all" && roleTab === "all" ? "" : ` of ${all.length}`})</SectionHeading>
      <p className="mt-1 text-sm text-ink-500">
        Grant or revoke the seller ✓ (ID verification). {unverifiedCount > 0 && <strong>{unverifiedCount} unverified</strong>} Email verification is self-serve and can&apos;t be granted here. Registered accounts only — seller display names on listings aren&apos;t accounts.
      </p>
      <FilterRow label="Status" tabs={STATUS_TABS} current={tab} makeHref={(t) => href(t, roleTab, sortTab)} />
      <FilterRow label="Role" tabs={ROLE_TABS} current={roleTab} makeHref={(t) => href(tab, t, sortTab)} />
      <FilterRow label="Sort" tabs={SORT_TABS} current={sortTab} makeHref={(t) => href(tab, roleTab, t)} />
      {items.length === 0 && (
        <p className="mt-4 text-sm text-ink-500">No accounts match — try another filter. In-memory demo mode (no DATABASE_URL) resets on restart.</p>
      )}
      {items.length > 0 && (
        <AdminTable columns={["User", "Contact", "Role", "Kind", "Plan", "Seller ✓", "Email ✓", "Joined", "Actions"]}>
          {items.map((u) => (
            <tr key={u.id} className="transition hover:bg-sand-50">
              <Td>
                <strong className="block">{u.name}</strong>
                {u.businessName && <span className="block text-xs text-ink-500">🏪 {u.businessName}</span>}
              </Td>
              <Td>
                <span className="block">{u.email}</span>
                <span className="block text-xs text-ink-500">{u.phone}</span>
              </Td>
              <Td className="whitespace-nowrap text-ink-500">{u.role}</Td>
              <Td className="whitespace-nowrap text-ink-500">{u.sellerKind === "business" ? "business" : "individual"}</Td>
              <Td>{u.planId && u.planId !== "free" ? <Badge tone={u.planId === "gold" ? "amber" : "green"}>{u.planId}</Badge> : <span className="text-xs text-ink-400">free</span>}</Td>
              <Td>{u.verified ? <Badge tone="green">✓ seller</Badge> : <Badge>unverified</Badge>}</Td>
              <Td>{u.emailVerified ? <Badge tone="green">✓ email</Badge> : <Badge>no email ✓</Badge>}</Td>
              <Td className="whitespace-nowrap text-ink-500">{fmtDate(u.createdAt)}</Td>
              <Td><AdminButtons kind="user" id={u.id} extra={{ verified: u.verified }} /></Td>
            </tr>
          ))}
        </AdminTable>
      )}
    </div>
  );
}
