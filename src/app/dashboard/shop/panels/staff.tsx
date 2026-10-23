"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type StaffMember = { userId: string; role: string; name?: string; email?: string };

/** Staff accounts — Gold shops only. Owner invites sellers by email. */
export function StaffPanel({ shopSlug, shopName, isGold, isOwner, initial }: { shopSlug: string; shopName: string; isGold: boolean; isOwner: boolean; initial: StaffMember[] }) {
  const router = useRouter();
  const [members, setMembers] = useState(initial);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isGold) return null;

  const refresh = async () => {
    try {
      const r = await fetch(`/api/shops/staff?shopSlug=${encodeURIComponent(shopSlug)}`);
      const j = await r.json();
      if (r.ok) setMembers(j.members ?? []);
    } catch {}
    router.refresh();
  };

  const invite = async () => {
    if (!email.trim()) return setMsg("Enter the staff member's email.");
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/shops/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopSlug, email }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.error || "Invite failed.");
      setEmail("");
      setMsg(`${j.member?.name ?? email} added as staff ✓`);
      await refresh();
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (userId: string, name?: string) => {
    if (!confirm(`Remove ${name ?? "this member"} from ${shopName}?`)) return;
    setMsg("");
    try {
      const r = await fetch("/api/shops/staff", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopSlug, userId }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.error || "Remove failed.");
      await refresh();
    } catch {
      setMsg("Network error — try again.");
    }
  };

  return (
    <div className="card mt-3 p-5">
      <p className="font-bold">Staff · {shopName} (Gold ✓)</p>
      <p className="text-sm text-ink-500">Staff can manage your shop&apos;s catalogue. Only the owner can invite or remove.</p>
      <ul className="mt-3 space-y-2">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 p-2.5 text-sm">
            <span className="min-w-0 flex-1 break-words">
              <strong>{m.name ?? m.email ?? m.userId}</strong>{" "}
              <span className="text-ink-400">· {m.email} · {m.role}</span>
            </span>
            {isOwner && m.role !== "owner" && (
              <button onClick={() => remove(m.userId, m.name ?? m.email)} className="btn-secondary shrink-0 !px-3 !py-1 text-xs">Remove</button>
            )}
          </li>
        ))}
        {members.length === 0 && <li className="text-sm text-ink-500">No staff yet.</li>}
      </ul>
      {isOwner && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@example.co.ke"
            type="email"
            aria-label="Staff email"
            className="input-bd min-w-0 flex-1"
          />
          <button onClick={invite} disabled={busy} className="btn-primary shrink-0">{busy ? "Inviting…" : "Invite staff"}</button>
        </div>
      )}
      {msg && <p role="status" className="mt-2 text-sm text-ink-700">{msg}</p>}
    </div>
  );
}
