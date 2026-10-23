"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutSchema } from "@/lib/validators";
import { useCart } from "@/components/cart-provider";
import { getListing } from "@/data/catalog";
import { formatKES, cartTotals } from "@/lib/format";
import { COUNTY_NAMES, townsFor } from "@/lib/kenya";

const DELIVERY_FALLBACK = { standard: 250, express: 500, pickup: 0 };

type Resolved = { id: string; title: string; price: number; stock: number; seller: string };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container-bd py-12 text-sm">Loading checkout…</div>}>
      <CheckoutInner />
    </Suspense>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const { lines, clear } = useCart();
  const [serverErr, setServerErr] = useState("");
  const [placing, setPlacing] = useState(false);
  const [storeItems, setStoreItems] = useState<Resolved[]>([]);
  const [fees, setFees] = useState(DELIVERY_FALLBACK);

  useEffect(() => {
    fetch("/api/delivery").then((r) => r.json()).then((j) => {
      if (j?.fees) setFees({ ...DELIVERY_FALLBACK, ...j.fees });
    }).catch(() => {});
  }, []);

  const missing = useMemo(
    () => lines.filter((l) => !getListing(l.id)).map((l) => l.id),
    [lines]
  );
  const missingKey = missing.join(",");
  useEffect(() => {
    if (missing.length === 0) {
      setStoreItems([]);
      return;
    }
    fetch(`/api/listings/resolve?ids=${encodeURIComponent(missingKey)}`)
      .then((r) => r.json())
      .then((j) => setStoreItems(j.items ?? []))
      .catch(() => setStoreItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey]);

  const detailed = [
    ...lines
      .map((l) => {
        const c = getListing(l.id);
        return c ? { ...l, title: c.title, price: c.price } : null;
      })
      .filter((x): x is { id: string; qty: number; title: string; price: number } => Boolean(x)),
    ...storeItems.map((s) => ({ id: s.id, qty: lines.find((l) => l.id === s.id)?.qty ?? 1, title: s.title, price: s.price })),
  ];
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { deliveryMethod: "standard", paymentMethod: "cod", instructions: "" } as never,
  });
  const county = watch("county");
  const deliveryMethod = watch("deliveryMethod");
  const paymentMethod = watch("paymentMethod");

  const totals = cartTotals(detailed.map((l) => ({ unitPrice: l.price, qty: l.qty })), {
    deliveryFee: fees[(deliveryMethod as keyof typeof fees) ?? "standard"] ?? 250,
  });

  if (detailed.length === 0) {
    return <div className="container-bd py-12"><div className="card p-8 text-center"><p className="font-bold">Nothing to check out</p><a href="/browse" className="link-bd">Back to shop →</a></div></div>;
  }

  return (
    <div className="container-bd py-8">
      <h1 className="section-title">Checkout</h1>
      <form
        className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]"
        onSubmit={handleSubmit(async (data) => {
          setServerErr("");
          setPlacing(true);
          try {
            // One key per cart contents (not per click): double-clicks and
            // retries collapse to the same order server-side.
            const fingerprint = detailed.map((l) => `${l.id}x${l.qty}`).sort().join("|");
            let hash = 0;
            for (let i = 0; i < fingerprint.length; i++) hash = (Math.imul(hash, 31) + fingerprint.charCodeAt(i)) | 0;
            const idempotencyKey = `co-${Math.abs(hash).toString(36)}-${detailed.length}`;
            const r = await fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...data, idempotencyKey, items: detailed.map((l) => ({ id: l.id, qty: l.qty })) }),
            });
            const j = await r.json();
            if (!r.ok) {
              setServerErr(j.error || "Checkout failed");
              return;
            }
            // M-Pesa: trigger STK push immediately after reserving.
            if (j.paymentMethod === "mpesa" || data.paymentMethod === "mpesa") {
              const p = await fetch("/api/payments/initiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: j.orderId, method: "mpesa", phone: data.phone }),
              }).then((x) => x.json()).catch(() => null);
              if (p && !p.ok && p.status === "failed") {
                setServerErr(p.message || "M-Pesa request failed.");
                return;
              }
            }
            clear();
            try {
              // Local snapshot for instant order history; server stays source of truth.
              const box = JSON.parse(localStorage.getItem("bd_orders_v1") || "[]");
              box.unshift({ ...j.order, createdAt: j.order?.createdAt ?? new Date().toISOString() });
              localStorage.setItem("bd_orders_v1", JSON.stringify(box.slice(0, 50)));
              localStorage.setItem("bd_phone", data.phone);
            } catch {}
            router.push(`/orders/${j.orderId}?pay=${encodeURIComponent(data.paymentMethod)}&phone=${encodeURIComponent(data.phone)}`);
          } finally {
            setPlacing(false);
          }
        })}
      >
        <div className="card space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label-bd" htmlFor="co-name">Full name</label><input id="co-name" className="input-bd" {...register("name")} />{errors.name && <p className="text-xs text-red-600">{String(errors.name.message)}</p>}</div>
            <div><label className="label-bd" htmlFor="co-phone">Phone (delivery updates / M-Pesa)</label><input id="co-phone" className="input-bd" placeholder="0712345678" {...register("phone")} />{errors.phone && <p className="text-xs text-red-600">{String(errors.phone.message)}</p>}</div>
          </div>
          <div><label className="label-bd" htmlFor="co-email">Email (receipts)</label><input id="co-email" className="input-bd" type="email" {...register("email")} /></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label-bd" htmlFor="co-county">County</label>
              <select id="co-county" className="input-bd" {...register("county")}>
                <option value="">Select…</option>{COUNTY_NAMES.map((c) => <option key={c}>{c}</option>)}
              </select>{errors.county && <p className="text-xs text-red-600">Required</p>}</div>
            <div><label className="label-bd" htmlFor="co-town">Town</label>
              <select id="co-town" className="input-bd" {...register("town")}>
                <option value="">Select…</option>{(county ? townsFor(county) : []).map((t) => <option key={t}>{t}</option>)}
              </select>{errors.town && <p className="text-xs text-red-600">Required</p>}</div>
            <div><label className="label-bd" htmlFor="co-addr">Address / landmark</label><input id="co-addr" className="input-bd" {...register("address")} />{errors.address && <p className="text-xs text-red-600">Required</p>}</div>
          </div>
          <div><label className="label-bd" htmlFor="co-ins">Delivery instructions</label><input id="co-ins" className="input-bd" {...register("instructions")} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label-bd" htmlFor="co-del">Delivery</label>
              <select id="co-del" className="input-bd" {...register("deliveryMethod")}>
                <option value="standard">Standard ({formatKES(fees.standard)})</option>
                <option value="express">Express ({formatKES(fees.express)})</option>
                <option value="pickup">Pickup (Free)</option>
              </select></div>
            <div>
              <label className="label-bd" htmlFor="co-pay">Payment</label>
              <select id="co-pay" className="input-bd" {...register("paymentMethod")}>
                <option value="cod">Cash on delivery</option>
                <option value="mpesa">M-Pesa (STK push)</option>
              </select>
              <p className="mt-1 text-xs text-ink-500">{paymentMethod === "mpesa" ? "You'll get an M-Pesa prompt on your phone. Enter PIN to pay." : "Pay the courier in cash when your order arrives. No advance payments — ever."}</p>
            </div>
          </div>
          {serverErr && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{serverErr}</p>}
        </div>
        <div className="card h-fit space-y-2 p-5 text-sm">
          {detailed.map((l) => <div key={l.id} className="flex justify-between gap-2"><span className="truncate">{l.title} × {l.qty}</span><strong>{formatKES(l.price * l.qty)}</strong></div>)}
          <div className="flex justify-between border-t pt-2"><span>Subtotal</span><strong>{formatKES(totals.subtotal)}</strong></div>
          <div className="flex justify-between"><span>Delivery</span><strong>{formatKES(totals.delivery)}</strong></div>
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatKES(totals.total)}</span></div>
          <button className="btn-primary w-full" disabled={placing}>{placing ? "Placing order…" : `Place order · ${formatKES(totals.total)}`}</button>
          <p className="text-xs text-ink-400">Totals are computed on the server. Orders are never marked paid from browser state.</p>
        </div>
      </form>
    </div>
  );
}
