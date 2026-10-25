"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { getListing, type Listing } from "@/data/catalog";
import { formatKES, cartTotals } from "@/lib/format";
import { ListingCard } from "@/components/ui/listing-card";
import { WmImage } from "@/components/ui/wm-image";

type Resolved = { id: string; slug: string; title: string; price: number; stock: number; seller: string; images: string[]; txMethod: string };
type DetailedLine = { id: string; qty: number; slug: string; title: string; price: number; stock: number; seller: string; images: string[]; txMethod: string };

export default function CartPage() {
  const { lines, setQty, remove, clear } = useCart();
  const [storeItems, setStoreItems] = useState<Resolved[]>([]);
  const [suggested, setSuggested] = useState<Listing[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);

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

  // Empty cart is a shopping opportunity, not a dead end: load real
  // marketplace products (static + live seller stock) to fill the page.
  useEffect(() => {
    if (detailed.length > 0 || suggested.length > 0) return;
    let live = true;
    setSuggestedLoading(true);
    fetch("/api/feed?type=product&per=12&sort=relevance", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (live) setSuggested(Array.isArray(j?.items) ? j.items : []);
      })
      .catch(() => {
        if (live) setSuggested([]);
      })
      .finally(() => {
        if (live) setSuggestedLoading(false);
      });
    return () => {
      live = false;
    };
  }, [detailed.length, suggested.length]);

  return (
    <div className="container-bd py-8">
      <h1 className="section-title">Shopping cart ({detailed.length})</h1>
      {detailed.length === 0 ? (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-neutral-200 bg-sand-50 p-4">
            <div>
              <p className="font-bold">Your cart is empty</p>
              <p className="mt-0.5 text-sm text-ink-500">Add a product below to checkout. Classifieds use enquiries instead.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/browse" className="btn-secondary !py-2 text-sm">Browse all products</Link>
              {lines.length > 0 && <button onClick={clear} className="text-sm font-semibold text-ink-500 hover:text-red-700">Clear cart</button>}
            </div>
          </div>

          <section className="mt-8" aria-labelledby="cart-suggestions">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 id="cart-suggestions" className="section-title">Shoppable products</h2>
                <p className="mt-0.5 text-sm text-ink-500">Popular products from shops across Kenya — add one to your cart to get started.</p>
              </div>
              <Link href="/browse" className="link-bd shrink-0">View all →</Link>
            </div>
            {suggestedLoading ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6" aria-label="Loading products">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="card overflow-hidden">
                    <div className="aspect-[4/3] animate-pulse bg-sand-100" />
                    <div className="space-y-2 p-2.5">
                      <div className="h-3 animate-pulse rounded bg-sand-100" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-sand-100" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-sand-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : suggested.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                {suggested.map((l) => <ListingCard key={l.id} listing={l} />)}
              </div>
            ) : (
              <div className="card p-8 text-center">
                <p className="font-bold">Products are loading slowly</p>
                <p className="mt-1 text-sm text-ink-500">Browse the full marketplace while we reconnect.</p>
                <Link href="/browse" className="btn-primary mt-4">Browse products</Link>
              </div>
            )}
          </section>
        </>
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
