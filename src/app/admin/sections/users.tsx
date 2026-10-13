import { Users } from "lucide-react";
import { getStore } from "@/lib/store";
import { AdminButtons } from "../actions";
import { AdminTable, Td, SectionHeading, fmtDate } from "../table";
import { Badge } from "@/components/ui/badge";

export async function UsersSection() {
  const users = await getStore().listUsers();
  return (
    <div>
      <SectionHeading icon={Users}>Users ({users.length})</SectionHeading>
      <p className="mt-1 text-sm text-ink-500">
        Grant or revoke the seller ✓ (ID verification). Email verification is self-serve and can&apos;t be granted here. Registered accounts only — seller display names on listings aren&apos;t accounts.
      </p>
      {users.length === 0 && (
        <p className="mt-4 text-sm text-ink-500">No registered accounts yet — signups appear here. In-memory demo mode (no DATABASE_URL) resets on restart.</p>
      )}
      {users.length > 0 && (
        <AdminTable columns={["User", "Contact", "Role", "Kind", "Seller ✓", "Email ✓", "Joined", "Actions"]}>
          {users.map((u) => (
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
