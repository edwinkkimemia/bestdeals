"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut, ShieldCheck } from "lucide-react";

/** Dedicated admin top bar — replaces the storefront header on /admin routes. */
export function AdminHeader({ user }: { user: { name: string; email: string } | null }) {
  const router = useRouter();
  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST", headers: { "Content-Type": "application/json" } });
    } catch {}
    router.push("/");
    router.refresh();
  };
  return (
    <header className="sticky top-0 z-40 bg-ink-900 text-white">
      <div className="container-bd flex h-14 items-center gap-3">
        <Link href="/admin" className="flex shrink-0 items-center gap-2" aria-label="Admin dashboard">
          <Image src="/chaplogo.png" alt="" width={1147} height={287} className="h-7 w-auto rounded bg-white px-1 py-0.5" />
          <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-bold tracking-wide">ADMIN</span>
        </Link>
        <nav aria-label="Admin" className="ml-2 hidden items-center gap-1 text-sm md:flex">
          <Link href="/admin" className="rounded-lg px-3 py-1.5 font-semibold hover:bg-white/10">Dashboard</Link>
          <Link href="/" className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white">
            <ExternalLink className="h-3.5 w-3.5" /> View site
          </Link>
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {user && (
            <span className="hidden min-w-0 items-center gap-1.5 text-xs text-white/70 sm:flex">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
            </span>
          )}
          <Link href="/" className="rounded-lg p-2 hover:bg-white/10 md:hidden" aria-label="View site">
            <ExternalLink className="h-5 w-5" />
          </Link>
          <button onClick={signOut} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20" aria-label="Sign out">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
