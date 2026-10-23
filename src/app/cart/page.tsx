"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { getListing } from "@/data/catalog";
import { formatKES, cartTotals } from "@/lib/format";
import { WmImage } from "@/components/ui/wm-image";

type Resolved = { id: string; slug: string; title: string; price: number; stock: number; seller: string; images: string[]; txMethod: string };
type DetailedLine = { id: string; qty: number; slug: string; title: string; price: number; stock: number; seller: string; images: string[]; txMethod: string };

export default function CartPage() {
  const { lines, setQty, remove, clear } = useCart();
  const [storeItems, setStoreItems] = useState<Resolved[]>([]);

  const missing = useMemo(() => lines.filter((l) => !getListing(l.id)).map((l) => l.id), [lines]);
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
      .map((l): DetailedLine | null => {
        const c = getListing(l.id);
        return c ? { ...l, slug: c.slug, title: c.title, price: c.price, stock: c.stock, seller: c.sellerName, images: c.images, txMethod: c.transactionMethod } : null;
      })
      .filter((x): x is DetailedLine => x !== null),
    ...storeItems.map((s) => ({ id: s.id, qty: lines.find((l) => l.id === s.id)?.qty ?? 1, slug: s.slug, title: s.title, price: s.price, stock: s.stock, seller: s.seller, images: s.images, txMethod: s.txMethod })),
  ].filter((l) => l.txMethod === "buy_online");

  const totals = cartTotals(
    detailed.map((l) => ({ unitPrice: l.price, qty: l.qty }))
  );

  return (
    <div className="container-bd py-8">
      <h1 className="section-title">Shopping cart ({detailed.length})</h1>
      {detailed.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="font-bold">Your cart is empty</p>
          <p className="text-sm text-ink-500">Shoppable products live here. Classifieds use enquiries instead.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/browse" className="btn-primary">Browse products</Link>
            <button onClick={clear} className="btn-secondary">Clear cart</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
          <ul className="space-y-3">
            {detailed.map((l) => (
              <li key={l.id} className="card flex gap-3 p-3">
                <WmImage src={l.images[0]} alt={l.title} className="h-20 w-24 rounded-lg object-cover" />
                <div className="flex-1">
                  <Link href={`/product/${l.slug}`} className="clamp-2 text-sm font-semibold hover:text-brand-700">{l.title}</Link>
                  <p className="text-sm font-bold">{formatKES(l.price)} <span className="font-normal text-ink-400">· {l.seller}</span></p>
                  <div className="mt-1 flex items-center gap-2">
                    <button aria-label="Decrease quantity" className="rounded-lg border px-2 py-0.5" onClick={() => setQty(l.id, l.qty - 1)}>−</button>
                    <span className="text-sm font-semibold" aria-live="polite">{l.qty}</span>
                    <button aria-label="Increase quantity" className="rounded-lg border px-2 py-0.5" onClick={() => setQty(l.id, Math.min(l.stock, l.qty + 1))}>+</button>
                    <button className="link-bd ml-2" onClick={() => remove(l.id)}>Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="card h-fit space-y-3 p-5">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-semibold">{formatKES(totals.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>at checkout</dd></div>
              <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total</dt><dd>{formatKES(totals.total)}</dd></div>
            </dl>
            <Link href="/checkout" className="btn-primary w-full">Proceed to checkout</Link>
            <p className="text-xs text-ink-400">Stock is re-validated server-side. Multi-seller carts split into per-seller suborders.</p>
          </div>
        </div>
      )}
    </div>
  );
}
