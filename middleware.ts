import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Route guard: dashboards require a session; /admin additionally checked server-side per page. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
