"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = { id: string; qty: number };
type CartCtx = {
  lines: CartLine[];
  count: number;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "bd_cart_v1";

function read(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as CartLine[];
    // Keep all ids — seller store listings aren't in the static catalogue but
    // checkout validates them server-side. Drop only malformed rows.
    return raw.filter((l) => typeof l.id === "string" && l.id.length > 0 && l.qty > 0).slice(0, 50);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  useEffect(() => {
    setLines(read());
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines]);

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      add: (id, qty = 1) =>
        setLines((prev) => {
          const f = prev.find((l) => l.id === id);
          if (f) return prev.map((l) => (l.id === id ? { ...l, qty: Math.min(99, l.qty + qty) } : l));
          return [...prev, { id, qty }];
        }),
      setQty: (id, qty) =>
        setLines((prev) =>
          qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty: Math.min(99, qty) } : l))
        ),
      remove: (id) => setLines((prev) => prev.filter((l) => l.id !== id)),
      clear: () => setLines([]),
    }),
    [lines]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside CartProvider");
  return v;
}
