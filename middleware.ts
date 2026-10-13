import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

/** Route guard: dashboards + admin require a *valid* signed session (chat included). */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
