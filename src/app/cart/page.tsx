"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { getListing } from "@/data/catalog";
import { formatKES, cartTotals } from "@/lib/format";
import { COUPONS } from "@/data/catalog";
import { useMemo, useState } from "react";

export default function CartPage() {
  const { lines, setQty, remove, clear } = useCart();
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState("");

  const detailed = lines
    .map((l) => ({ ...l, listing: getListing(l.id)! }))
    .filter((l) => l.listing && l.listing.transactionMethod === "buy_online");

  const couponValue = useMemo(() => {
    if (!coupon) return 0;
    const c = COUPONS[coupon.toUpperCase()];
    if (!c) return 0;
    const sub = detailed.reduce((s, l) => s + (l.listing?.price ?? 0) * l.qty, 0);
    return sub >= c.minSpend ? c.value : 0;
  }, [coupon, detailed]);

  const totals = cartTotals(
    detailed.map((l) => ({ unitPrice: l.listing.price, qty: l.qty })),
    { couponValue }
  );

  return (
    <div className="container-bd py-8">
      <h1 className="section-title">Shopping cart ({detailed.length})</h1>
      {detailed.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="font-bold">Your cart is empty</p>
          <p className="text-sm text-ink-500">Shoppable products live here. Classifieds use enquiries instead.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/shop" className="btn-primary">Shop products</Link>
            <button onClick={clear} className="btn-secondary">Clear cart</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
          <ul className="space-y-3">
            {detailed.map((l) => (
              <li key={l.id} className="card flex gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.listing.images[0]} alt={l.listing.title} className="h-20 w-24 rounded-lg object-cover" />
                <div className="flex-1">
                  <Link href={`/product/${l.listing.slug}`} className="clamp-2 text-sm font-semibold hover:text-brand-700">{l.listing.title}</Link>
                  <p className="text-sm font-bold">{formatKES(l.listing.price)} <span className="font-normal text-ink-400">· {l.listing.sellerName}</span></p>
                  <div className="mt-1 flex items-center gap-2">
                    <button aria-label="Decrease quantity" className="rounded-lg border px-2 py-0.5" onClick={() => setQty(l.id, l.qty - 1)}>−</button>
                    <span className="text-sm font-semibold" aria-live="polite">{l.qty}</span>
                    <button aria-label="Increase quantity" className="rounded-lg border px-2 py-0.5" onClick={() => setQty(l.id, Math.min(l.listing.stock, l.qty + 1))}>+</button>
                    <button className="link-bd ml-2" onClick={() => remove(l.id)}>Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="card h-fit space-y-3 p-5">
            <div className="flex gap-2">
              <input aria-label="Coupon code" value={coupon} onChange={(e) => { setCoupon(e.target.value); setCouponMsg(""); }} placeholder="Coupon (try KARIBU500)" className="input-bd uppercase" />
              <button className="btn-secondary shrink-0" onClick={() => setCouponMsg(couponValue > 0 ? `Applied −${formatKES(couponValue)}` : "Invalid or below minimum spend")}>Apply</button>
            </div>
            {couponMsg && <p className="text-xs text-ink-500">{couponMsg}</p>}
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-semibold">{formatKES(totals.subtotal)}</dd></div>
              {totals.discount > 0 && <div className="flex justify-between text-green-700"><dt>Coupon</dt><dd>−{formatKES(totals.discount)}</dd></div>}
              <div className="flex justify-between"><dt>Delivery</dt><dd>at checkout</dd></div>
              <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total</dt><dd>{formatKES(totals.total)}</dd></div>
            </dl>
            <Link href={`/checkout${coupon ? `?coupon=${encodeURIComponent(coupon.toUpperCase())}` : ""}`} className="btn-primary w-full">Proceed to checkout</Link>
            <p className="text-xs text-ink-400">Stock is re-validated server-side. Multi-seller carts split into per-seller suborders.</p>
          </div>
        </div>
      )}
    </div>
  );
}
