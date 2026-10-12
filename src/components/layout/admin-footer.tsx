import Link from "next/link";

/** Minimal admin footer — replaces the storefront footer + bottom nav on /admin routes. */
export function AdminFooter() {
  return (
    <footer className="mt-12 border-t border-neutral-800 bg-ink-900 text-white/60">
      <div className="container-bd flex flex-col items-center justify-between gap-2 py-5 text-xs sm:flex-row">
        <p>© {new Date().getFullYear()} chap.co.ke · Admin console</p>
        <p className="flex items-center gap-3">
          <Link href="/" className="hover:text-white hover:underline">View site</Link>
          <Link href="/help" className="hover:text-white hover:underline">Help</Link>
          <span>Restricted area — every action is logged.</span>
        </p>
      </div>
    </footer>
  );
}
