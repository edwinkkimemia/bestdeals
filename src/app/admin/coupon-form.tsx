"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Admin coupon create/update form (code, KES value, minimum spend). */
export function CouponForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="card mt-4 flex flex-wrap items-end gap-2 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg("");
        setBusy(true);
        try {
          const r = await fetch("/api/admin/coupons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, value: Number(value), minSpend: Number(minSpend || 0), active: true }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) return setMsg(j.error || "Save failed.");
          setCode("");
          setValue("");
          setMinSpend("");
          setMsg(`Saved ${j.item?.code} ✓`);
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      <div><label className="label-bd" htmlFor="cp-code">Code</label><input id="cp-code" className="input-bd uppercase" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="KARIBU500" /></div>
      <div><label className="label-bd" htmlFor="cp-val">Value (KES)</label><input id="cp-val" className="input-bd" required inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="500" /></div>
      <div><label className="label-bd" htmlFor="cp-min">Min spend (KES)</label><input id="cp-min" className="input-bd" inputMode="numeric" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} placeholder="0" /></div>
      <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save coupon"}</button>
      {msg && <p role="status" className="w-full text-sm">{msg}</p>}
    </form>
  );
}
