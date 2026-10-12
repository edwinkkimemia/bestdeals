"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutSchema } from "@/lib/validators";
import { useCart } from "@/components/cart-provider";
import { getListing } from "@/data/catalog";
import { formatKES, cartTotals } from "@/lib/format";
import { COUNTY_NAMES, townsFor } from "@/lib/kenya";

const DELIVERY = { standard: 250, express: 500, pickup: 0 };

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

  const detailed = lines.map((l) => ({ ...l, listing: getListing(l.id)! })).filter((l) => l.listing);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { deliveryMethod: "standard", paymentMethod: "cod", instructions: "" } as never,
  });
  const county = watch("county");
  const deliveryMethod = watch("deliveryMethod");

  const totals = cartTotals(detailed.map((l) => ({ unitPrice: l.listing.price, qty: l.qty })), {
    deliveryFee: DELIVERY[(deliveryMethod as keyof typeof DELIVERY) ?? "standard"],
  });

  if (detailed.length === 0) {
    return <div className="container-bd py-12"><div className="card p-8 text-center"><p className="font-bold">Nothing to check out</p><a href="/shop" className="link-bd">Back to shop →</a></div></div>;
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
            const r = await fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...data, items: detailed.map((l) => ({ id: l.id, qty: l.qty })) }),
            });
            const j = await r.json();
            if (!r.ok) {
              setServerErr(j.error || "Checkout failed");
              return;
            }
            clear();
            try {
              // Local snapshot for instant order history; server stays source of truth.
              const box = JSON.parse(localStorage.getItem("bd_orders_v1") || "[]");
              box.unshift({ ...j.order, createdAt: j.order?.createdAt ?? new Date().toISOString() });
              localStorage.setItem("bd_orders_v1", JSON.stringify(box.slice(0, 50)));
              localStorage.setItem("bd_phone", data.phone);
            } catch {}
            router.push(`/orders/${j.orderId}?pay=cod&phone=${encodeURIComponent(data.phone)}`);
          } finally {
            setPlacing(false);
          }
        })}
      >
        <div className="card space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label-bd" htmlFor="co-name">Full name</label><input id="co-name" className="input-bd" {...register("name")} />{errors.name && <p className="text-xs text-red-600">{String(errors.name.message)}</p>}</div>
            <div><label className="label-bd" htmlFor="co-phone">Phone (delivery updates)</label><input id="co-phone" className="input-bd" placeholder="0712345678" {...register("phone")} />{errors.phone && <p className="text-xs text-red-600">{String(errors.phone.message)}</p>}</div>
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
                <option value="standard">Standard (KSh 250)</option>
                <option value="express">Express (KSh 500)</option>
                <option value="pickup">Pickup (Free)</option>
              </select></div>
            <div>
              <span className="label-bd">Payment</span>
              <div className="rounded-xl bg-sand-50 p-3 text-sm">
                <p className="font-bold">Cash on delivery</p>
                <p className="text-ink-500">Pay the courier in cash when your order arrives. No advance payments — ever.</p>
              </div>
              <input type="hidden" {...register("paymentMethod")} value="cod" />
            </div>
          </div>
          {serverErr && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{serverErr}</p>}
        </div>
        <div className="card h-fit space-y-2 p-5 text-sm">
          {detailed.map((l) => <div key={l.id} className="flex justify-between gap-2"><span className="truncate">{l.listing.title} × {l.qty}</span><strong>{formatKES(l.listing.price * l.qty)}</strong></div>)}
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
