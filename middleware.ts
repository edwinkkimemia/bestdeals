import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

/** Route guard: dashboards + admin require a *valid* signed session. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Messaging stays guest-accessible (buyers chat without accounts) — the
  // conversations API still enforces per-chat ownership (account or phone).
  if (pathname === "/dashboard/messages" || pathname.startsWith("/dashboard/messages/")) {
    return NextResponse.next();
  }
  // Orders stay guest-accessible: lookup is by checkout phone + OTP.
  // The API still enforces ownership (account id or verified phone).
  const needsAuth = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  if (!needsAuth) return NextResponse.next();
  const token = req.cookies.get("bd_session")?.value;
  if (!token) {
    const url = new URL("/auth/signin", req.url);
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET || "dev-only-secret-change-me-32chars!!"
    );
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const url = new URL("/auth/signin", req.url);
    url.searchParams.set("next", pathname + req.nextUrl.search);
    const res = NextResponse.redirect(url);
    // Drop the forged/expired cookie so the user can sign in cleanly.
    res.cookies.delete("bd_session");
    return res;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
