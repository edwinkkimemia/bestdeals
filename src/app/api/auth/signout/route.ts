import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

function clearCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

function wantsHtml(req: NextRequest): boolean {
  const accept = req.headers.get("accept") ?? "";
  const ct = req.headers.get("content-type") ?? "";
  // Plain HTML <form> posts land here — redirect instead of showing raw JSON.
  return accept.includes("text/html") || ct.includes("application/x-www-form-urlencoded");
}

export async function POST(req: NextRequest) {
  if (wantsHtml(req)) {
    const res = NextResponse.redirect(new URL("/", req.url));
    return clearCookie(res);
  }
  const res = NextResponse.json({ ok: true });
  return clearCookie(res);
}

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.url));
  return clearCookie(res);
}
