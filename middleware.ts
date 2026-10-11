import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Route guard: dashboards require a session; /admin additionally checked server-side per page. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Messaging stays guest-accessible (buyers chat without accounts) — the
  // conversations API still enforces per-chat ownership (account or phone).
  if (pathname === "/dashboard/messages" || pathname.startsWith("/dashboard/messages/")) {
    return NextResponse.next();
  }
  const needsAuth =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/orders");
  if (!needsAuth) return NextResponse.next();
  if (!req.cookies.get("bd_session")) {
    const url = new URL("/auth/signin", req.url);
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/orders/:path*"],
};
