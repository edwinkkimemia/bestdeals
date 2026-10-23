"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, ChevronRight, Heart, LogOut, MapPin, Menu, MessageCircle, Search, ShoppingCart, Store, User, X } from "lucide-react";
import { useCart } from "../cart-provider";
import { NotificationsBell } from "../notifications-bell";
import { CategoryIcon } from "../category-icon";
import { KENYA_COUNTIES } from "@/lib/kenya";
import { CATEGORIES, POPULAR_SEARCHES } from "@/data/catalog";

export function Header({ user }: { user?: { name: string; role: string } | null }) {
  const router = useRouter();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [county, setCounty] = useState("all");
  const [sugs, setSugs] = useState<string[]>([]);
  const [searchFocus, setSearchFocus] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [unread, setUnread] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const [locOpen, setLocOpen] = useState(false);
  const [locFilter, setLocFilter] = useState("");
  const [hoveredCounty, setHoveredCounty] = useState<string | null>(null);
  const locRef = useRef<HTMLDivElement>(null);

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST", headers: { "Content-Type": "application/json" } });
    } catch {}
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  const sugHref = (s: string) => {
    const p = new URLSearchParams({ q: s });
    if (county !== "all") p.set("county", county);
    return `/search?${p.toString()}`;
  };

  const pickCounty = (next: string) => {
    setCounty(next);
    try {
      localStorage.setItem("bd_county", next);
    } catch {}
    setLocOpen(false);
    setLocFilter("");
    router.push(next === "all" ? "/location" : `/location/${encodeURIComponent(next)}`);
  };

  const locQuery = locFilter.trim().toLowerCase();
  const locMatches = KENYA_COUNTIES.filter(
    (c) => c.county.toLowerCase().includes(locQuery) || c.towns.some((t) => t.toLowerCase().includes(locQuery))
  ).slice(0, 30);
  const previewCounty = KENYA_COUNTIES.find((c) => c.county === (hoveredCounty ?? county));
  // Popular shortcuts when the box is focused but empty — typing filters live from the first keystroke.
  const showPopular = searchFocus && q.trim().length === 0;
  const dropItems = q.trim().length > 0 ? sugs : showPopular ? POPULAR_SEARCHES.slice(0, 6) : [];

  useEffect(() => {
    // Lock background scroll while the mobile drawer is open.
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) setOpenCat(null);
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    // Live suggestions from the first keystroke (short debounce keeps it instant).
    const t = setTimeout(async () => {
      if (q.trim().length < 1) return setSugs([]);
      try {
        const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        setSugs(j.suggestions ?? []);
      } catch {
        setSugs([]);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    // Close the suggestion dropdown on outside click.
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) {
        setSugs([]);
        setSearchFocus(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    // Close the location picker on outside click or Escape.
    if (!locOpen) return;
    const onDown = (e: MouseEvent) => {
      if (locRef.current && !locRef.current.contains(e.target as Node)) setLocOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLocOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [locOpen]);

  useEffect(() => {
    // Wishlist badge: localStorage-backed, refreshed on toggle/focus/storage.
    const loadWishlist = () => {
      try {
        const raw = JSON.parse(localStorage.getItem("bd_wishlist_v1") || "[]");
        setWishCount(Array.isArray(raw) ? raw.length : 0);
      } catch {
        setWishCount(0);
      }
    };
    loadWishlist();
    window.addEventListener("bd:wishlist", loadWishlist);
    window.addEventListener("storage", loadWishlist);
    window.addEventListener("focus", loadWishlist);
    return () => {
      window.removeEventListener("bd:wishlist", loadWishlist);
      window.removeEventListener("storage", loadWishlist);
      window.removeEventListener("focus", loadWishlist);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch("/api/conversations");
        if (!r.ok || stop) return;
        const j = await r.json();
        setUnread((j.items ?? []).reduce((s: number, c: { unread?: number }) => s + (c.unread ?? 0), 0));
      } catch {}
    };
    load();
    const t = setInterval(load, 60000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("bd:messages", onFocus);
    return () => {
      stop = true;
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("bd:messages", onFocus);
    };
  }, [user]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bd_county") || "all";
      setCounty(saved === "All Kenya" ? "all" : saved);
    } catch {}
  }, []);

  return (
    <>
    {/* top utility strip — static, scrolls away naturally. Kept outside the
        sticky header so collapsing it never changes the sticky element's
        height (which caused the shake via scroll <-> layout feedback). */}
    <div className="bg-brand-700 text-white">
      <div className="container-bd flex h-8 items-center justify-between text-xs">
        <p className="truncate">Kenya&apos;s marketplace for everything · Find it. Sell it. Get the best deal.</p>
        <div className="hidden items-center gap-4 sm:flex">
          <a href="mailto:support@chap.co.ke" className="hover:underline">support@chap.co.ke</a>
          <Link href="/help" className="hover:underline">Help Centre</Link>
          <Link href="/pricing" className="hover:underline">Business Plans</Link>
          <Link href="/safety" className="hover:underline">Buyer Safety</Link>
        </div>
      </div>
    </div>
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">

      <div className="container-bd flex items-center gap-2 py-3 sm:gap-3">
        <button className="rounded-lg p-1.5 hover:bg-sand-100 sm:p-2 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="flex shrink-0 items-center" aria-label="Chap home">
          <Image src="/chaplogo.png" alt="chap.co.ke" width={1147} height={287} priority className="h-8 w-auto sm:h-10" />
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
            <input
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              placeholder="Search products, sellers, shops…"
              className="w-full px-4 py-2.5 text-sm outline-none"
              aria-label="Search Chap"
              autoComplete="off"
            />
            <input type="hidden" name="county" value={county} />
            <button className="flex items-center gap-1.5 bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700" type="submit">
              <Search className="h-4 w-4" /> <span className="hidden xl:inline">Search</span>
            </button>
          </form>
          {dropItems.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
              {showPopular && q.trim().length === 0 && (
                <li className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Popular right now</li>
              )}
              {dropItems.map((s) => (
                <li key={s}>
                  <Link href={sugHref(s)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-sand-50" onClick={() => { setSugs([]); setSearchFocus(false); }}>
                    <Search className="h-3.5 w-3.5 text-ink-400" /> {s}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
          <button
            className="rounded-lg p-1.5 hover:bg-sand-100 sm:p-2 md:hidden"
            aria-label={showSearch ? "Close search" : "Open search"}
            aria-expanded={showSearch}
            onClick={() => setShowSearch((v) => !v)}
          >
            {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <div ref={locRef} className="relative hidden xl:block">
            <button
              type="button"
              onClick={() => setLocOpen((v) => !v)}
              aria-haspopup="dialog"
              aria-expanded={locOpen}
              aria-label="Choose location"
              className="flex max-w-44 items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs hover:bg-sand-100"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600" />
              <span className="truncate font-medium">{county === "all" ? "All Kenya" : county}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-400" />
            </button>
            {locOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 flex w-[26rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg" role="dialog" aria-label="Choose location">
                <div className="w-1/2 border-r border-neutral-100">
                  <div className="border-b border-neutral-100 p-2">
                    <input
                      autoFocus
                      value={locFilter}
                      onChange={(e) => setLocFilter(e.target.value)}
                      placeholder="Find county or town…"
                      aria-label="Filter counties"
                      className="w-full rounded-lg bg-sand-50 px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand-600/30"
                    />
                  </div>
                  <ul className="max-h-72 overflow-y-auto p-1.5" role="listbox" aria-label="Counties">
                    <li>
                      <button
                        type="button" role="option" aria-selected={county === "all"}
                        onMouseEnter={() => setHoveredCounty(null)}
                        onClick={() => pickCounty("all")}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold hover:bg-sand-100 ${county === "all" ? "text-brand-700" : ""}`}
                      >
                        All Kenya {county === "all" && <span aria-hidden>✓</span>}
                      </button>
                    </li>
                    {locMatches.map((c) => (
                      <li key={c.county}>
                        <button
                          type="button" role="option" aria-selected={county === c.county}
                          onMouseEnter={() => setHoveredCounty(c.county)}
                          onFocus={() => setHoveredCounty(c.county)}
                          onClick={() => pickCounty(c.county)}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs hover:bg-sand-100 ${county === c.county ? "font-bold text-brand-700" : "font-medium"}`}
                        >
                          <span className="truncate">{c.county}</span>
                          {county === c.county && <span aria-hidden>✓</span>}
                        </button>
                      </li>
                    ))}
                    {locMatches.length === 0 && <li className="px-2.5 py-3 text-xs text-ink-400">No match — try another spelling.</li>}
                  </ul>
                </div>
                <div className="max-h-[22rem] w-1/2 overflow-y-auto bg-sand-50/60 p-3">
                  {previewCounty ? (
                    <>
                      <p className="text-xs font-bold">{previewCounty.county}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {previewCounty.towns.map((t) => (
                          <button
                            key={t}
                            type="button"
                            title={`Search ${t}, ${previewCounty.county}`}
                            onClick={() => {
                              setLocOpen(false);
                              setLocFilter("");
                              router.push(`/search?county=${encodeURIComponent(previewCounty.county)}&town=${encodeURIComponent(t)}`);
                            }}
                            className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-ink-700 ring-1 ring-neutral-200 hover:text-brand-700 hover:ring-brand-600"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={() => pickCounty(previewCounty.county)} className="link-bd mt-2 text-xs">
                        View {previewCounty.county} →
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold">All Kenya</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-500">All 47 counties. Hover any county to see its towns here.</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <Link href="/wishlist" className="relative hidden rounded-lg p-1.5 hover:bg-sand-100 sm:inline-flex sm:p-2" aria-label={wishCount > 0 ? `Wishlist, ${wishCount} saved` : "Wishlist"}>
            <Heart className="h-5 w-5" />
            {wishCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white">{wishCount > 99 ? "99+" : wishCount}</span>}
          </Link>
          {user && (
            <span className="hidden sm:block">
              <NotificationsBell />
            </span>
          )}
          {user && (
            <Link href="/dashboard/messages" className="relative rounded-lg p-1.5 hover:bg-sand-100 sm:p-2" aria-label={unread > 0 ? `Messages, ${unread} unread` : "Messages"}>
              <MessageCircle className="h-5 w-5" />
              {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
            </Link>
          )}
          <Link href="/cart" className="relative rounded-lg p-1.5 hover:bg-sand-100 sm:p-2" aria-label={`Cart, ${count} items`}>
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white">{count}</span>}
          </Link>
          {user ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="hidden items-center gap-1.5 rounded-xl bg-sand-100 px-3 py-2 text-sm font-semibold hover:bg-sand-200 sm:flex" aria-label="Account menu">
                  <User className="h-4 w-4" /> {user.name.split(" ")[0]}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg"
                >
                  <DropdownMenu.Label className="px-2.5 py-1.5 text-xs font-semibold text-ink-400">
                    {user.name}
                  </DropdownMenu.Label>
                  <DropdownMenu.Separator className="my-1 h-px bg-neutral-100" />
                  {[
                    { href: user.role === "ADMIN" ? "/admin" : "/dashboard", label: "My dashboard" },
                    { href: "/dashboard/listings", label: "My listings" },
                    { href: "/dashboard/messages", label: "Enquiries" },
                    { href: "/dashboard/profile", label: "Profile" },
                    { href: "/dashboard/settings", label: "Settings" },
                    { href: "/sell", label: "Sell an item" },
                  ].map((l) => (
                    <DropdownMenu.Item key={l.href + l.label} asChild>
                      <Link href={l.href} className="block rounded-lg px-2.5 py-2 text-sm font-medium text-ink-700 outline-none hover:bg-sand-100 focus:bg-sand-100">
                        {l.label}
                      </Link>
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator className="my-1 h-px bg-neutral-100" />
                  <DropdownMenu.Item asChild>
                    <button
                      onClick={signOut}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-red-700 outline-none hover:bg-red-50 focus:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <Link href="/auth/signin" className="btn-primary hidden !px-4 sm:inline-flex">Sign in</Link>
          )}
          <Link href="/sell" className="btn-accent hidden !px-4 md:inline-flex"><Store className="h-4 w-4" /> Sell</Link>
        </div>
      </div>

      {/* mobile search — opens from the search icon */}
      {showSearch && (
        <div className="container-bd pb-3 md:hidden">
          <form action="/search" className="flex overflow-hidden rounded-xl border-2 border-brand-600">
            <input name="q" autoFocus placeholder="Products, sellers, shops…" aria-label="Search Chap" className="w-full px-4 py-2 text-sm outline-none" />
            <input type="hidden" name="county" value={county} />
            <button className="bg-brand-600 px-4 text-white" aria-label="Search"><Search className="h-4 w-4" /></button>
          </form>
        </div>
      )}

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
            <div className="grid gap-2 border-t border-neutral-200 pt-4">
              {!user && <Link href="/auth/signin" onClick={() => setOpen(false)} className="btn-primary">Sign in / Register</Link>}
              {user && <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"} onClick={() => setOpen(false)} className="btn-secondary">My dashboard</Link>}
              {user && <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="btn-secondary">Notifications</Link>}
              <Link href="/cart" onClick={() => setOpen(false)} className="btn-secondary">Cart ({count})</Link>
              <Link href="/wishlist" onClick={() => setOpen(false)} className="btn-secondary">Wishlist ({wishCount})</Link>
            </div>

            <div className="mt-4 border-t border-neutral-200 pt-4">
              <div className="mb-1 flex items-center justify-between px-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Browse by category</p>
                <Link href="/browse" onClick={() => setOpen(false)} className="text-xs font-semibold text-brand-700 hover:underline">
                  View all
                </Link>
              </div>
              <nav aria-label="Browse by category">
                <ul className="space-y-0.5">
                  {CATEGORIES.map((c) => {
                    const expanded = openCat === c.slug;
                    return (
                      <li key={c.slug}>
                        <div className={`flex items-center rounded-xl ${expanded ? "bg-sand-100" : ""}`}>
                          <Link
                            href={`/browse/${c.slug}`}
                            onClick={() => setOpen(false)}
                            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-ink-700 hover:bg-sand-100 hover:text-brand-700"
                          >
                            <CategoryIcon name={c.icon} className="h-4 w-4 shrink-0 text-brand-600" />
                            <span className="truncate">{c.name}</span>
                          </Link>
                          {c.subcategories.length > 0 && (
                            <button
                              type="button"
                              aria-label={expanded ? `Hide ${c.name} subcategories` : `Show ${c.name} subcategories`}
                              aria-expanded={expanded}
                              onClick={() => setOpenCat(expanded ? null : c.slug)}
                              className="rounded-lg p-2 text-ink-400 hover:text-brand-700"
                            >
                              <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
                            </button>
                          )}
                        </div>
                        {expanded && (
                          <ul className="mb-1 ml-9 border-l border-neutral-200 pl-3">
                            {c.subcategories.map((s) => (
                              <li key={s}>
                                <Link
                                  href={`/search?category=${c.slug}&subcategory=${encodeURIComponent(s)}`}
                                  onClick={() => setOpen(false)}
                                  className="block rounded-lg px-2 py-1.5 text-[13px] text-ink-500 hover:bg-sand-50 hover:text-brand-700"
                                >
                                  {s}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            {user && (
              <div className="mt-4 border-t border-neutral-200 pt-4">
                <button onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
