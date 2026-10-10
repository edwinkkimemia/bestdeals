"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Heart, MapPin, Menu, Search, ShoppingCart, Store, User, X } from "lucide-react";
import { useCart } from "../cart-provider";
import { COUNTY_NAMES } from "@/lib/kenya";
import { CATEGORIES } from "@/data/catalog";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop Products" },
  { href: "/classifieds", label: "Classifieds" },
  { href: "/shops", label: "Business Shops" },
  { href: "/services", label: "Services" },
  { href: "/deals", label: "Best Deals" },
  { href: "/sell", label: "Sell on Chap" },
];

export function Header({ user }: { user?: { name: string; role: string } | null }) {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [county, setCounty] = useState("all");
  const [sugs, setSugs] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const [hideStrip, setHideStrip] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    // Collapse the utility strip on scroll down; reveal on scroll up.
    // Hysteresis (hide past 140px, re-show only after a real upward move or
    // near the top) stops rapid toggling that makes the header shake.
    const update = () => {
      ticking.current = false;
      const y = window.scrollY;
      const last = lastY.current;
      if (y > 140 && y > last + 4) setHideStrip(true);
      else if (y < last - 4 || y <= 80) setHideStrip(false);
      lastY.current = y;
    };
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Lock background scroll while the mobile drawer is open.
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) return setSugs([]);
      try {
        const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        setSugs(j.suggestions ?? []);
      } catch {
        setSugs([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bd_county") || "all";
      setCounty(saved === "All Kenya" ? "all" : saved);
    } catch {}
  }, []);

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      {/* top utility strip — collapses on scroll down, returns on scroll up */}
      <div className={`grid bg-brand-700 text-white transition-all duration-300 ${hideStrip ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}>
        <div className="overflow-hidden">
          <div className="container-bd flex h-8 items-center justify-between text-xs">
            <p className="truncate">Kenya&apos;s marketplace for everything · Find it. Sell it. Get the best deal.</p>
            <div className="hidden items-center gap-4 sm:flex">
              <Link href="/help" className="hover:underline">Help Centre</Link>
              <Link href="/pricing" className="hover:underline">Business Plans</Link>
              <Link href="/safety" className="hover:underline">Buyer Safety</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container-bd flex items-center gap-3 py-3">
        <button className="rounded-lg p-2 hover:bg-sand-100 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="flex shrink-0 items-center" aria-label="Chap home">
          <Image src="/chaplogo.png" alt="chap.co.ke" width={1147} height={287} priority className="h-9 w-auto sm:h-10" />
        </Link>

        {/* search (desktop) */}
        <div ref={box} className="relative mx-auto hidden w-full max-w-2xl flex-1 md:block">
          <form
            action="/search"
            className="flex overflow-hidden rounded-xl border-2 border-brand-600 bg-white focus-within:ring-2 focus-within:ring-brand-600/20"
            onSubmit={() => {
              try {
                localStorage.setItem("bd_county", county);
              } catch {}
            }}
          >
            <select
              aria-label="Search category"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="hidden max-w-40 border-r border-neutral-200 bg-sand-50 px-2 text-xs font-medium lg:block"
            >
              <option value="all">All</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <input
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search phones, cars, rentals, services…"
              className="w-full px-4 py-2.5 text-sm outline-none"
              aria-label="Search Chap"
              autoComplete="off"
            />
            <input type="hidden" name="category" value={cat} />
            <input type="hidden" name="county" value={county} />
            <button className="flex items-center gap-1.5 bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700" type="submit">
              <Search className="h-4 w-4" /> <span className="hidden xl:inline">Search</span>
            </button>
          </form>
          {sugs.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
              {sugs.map((s) => (
                <li key={s}>
                  <Link href={`/search?q=${encodeURIComponent(s)}`} className="block px-4 py-2 text-sm hover:bg-sand-50" onClick={() => setSugs([])}>
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <label className="hidden items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs xl:flex">
            <MapPin className="h-3.5 w-3.5 text-brand-600" />
            <select aria-label="Location" value={county} onChange={(e) => { setCounty(e.target.value); try { localStorage.setItem("bd_county", e.target.value); } catch {} }} className="bg-transparent outline-none">
              <option value="all">All Kenya</option>
              {COUNTY_NAMES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <Link href="/wishlist" className="rounded-lg p-2 hover:bg-sand-100" aria-label="Wishlist"><Heart className="h-5 w-5" /></Link>
          <Link href="/cart" className="relative rounded-lg p-2 hover:bg-sand-100" aria-label={`Cart, ${count} items`}>
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white">{count}</span>}
          </Link>
          {user ? (
            <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"} className="hidden items-center gap-1.5 rounded-xl bg-sand-100 px-3 py-2 text-sm font-semibold sm:flex">
              <User className="h-4 w-4" /> {user.name.split(" ")[0]}
            </Link>
          ) : (
            <Link href="/auth/signin" className="btn-primary hidden !px-4 sm:inline-flex">Sign in</Link>
          )}
          <Link href="/sell" className="btn-accent hidden !px-4 md:inline-flex"><Store className="h-4 w-4" /> Sell</Link>
        </div>
      </div>

      {/* mobile search */}
      <div className="container-bd pb-3 md:hidden">
        <form action="/search" className="flex overflow-hidden rounded-xl border-2 border-brand-600">
          <input name="q" placeholder="Search Chap…" aria-label="Search Chap" className="w-full px-4 py-2 text-sm outline-none" />
          <button className="bg-brand-600 px-4 text-white" aria-label="Search"><Search className="h-4 w-4" /></button>
        </form>
      </div>

      {/* desktop nav */}
      <nav className="hidden border-t border-neutral-100 lg:block" aria-label="Main">
        <div className="container-bd flex items-center gap-1 py-1.5">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-sand-100 hover:text-ink-900">
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>

      {/* mobile drawer — sibling of <header>, not inside it: backdrop-blur creates a
          containing block that would trap fixed positioning to header height */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-dvh w-80 max-w-[85vw] overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <Image src="/chaplogo.png" alt="chap.co.ke" width={1147} height={287} className="h-8 w-auto" />
              <button aria-label="Close menu" className="rounded-lg p-2 hover:bg-sand-100" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-1">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-sand-100">
                  {n.label}
                </Link>
              ))}
            </div>
            <div className="mt-4 grid gap-2 border-t border-neutral-200 pt-4">
              {!user && <Link href="/auth/signin" onClick={() => setOpen(false)} className="btn-primary">Sign in / Register</Link>}
              {user && <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"} onClick={() => setOpen(false)} className="btn-secondary">My dashboard</Link>}
              <Link href="/cart" onClick={() => setOpen(false)} className="btn-secondary">Cart ({count})</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
