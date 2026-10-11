import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { currentUser } from "@/lib/auth";
import {
  recordListingView,
  getListingViewCount,
  isBotUserAgent,
} from "@/lib/analytics";

const VISITOR_COOKIE = "bd_vid";

function visitorId(req: NextRequest): string {
  const existing = req.cookies.get(VISITOR_COOKIE)?.value;
  if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

/** Public listing counter for social proof (cached 60s). */
export async function GET(req: NextRequest) {
  const listingId = String(req.nextUrl.searchParams.get("listingId") ?? "").slice(0, 64);
  if (!listingId) return NextResponse.json({ error: "listingId required" }, { status: 400 });
  const counts = await getListingViewCount(listingId);
  const res = NextResponse.json({ listingId, ...counts });
  res.headers.set("Cache-Control", "public, max-age=60");
  return res;
}

/** Record a product view. Bot traffic and rapid refreshes are not counted. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "analytics:track"), { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const ua = req.headers.get("user-agent");
  if (isBotUserAgent(ua)) return NextResponse.json({ ok: true, skipped: "bot" });

  const body = await req.json().catch(() => ({}));
  const listingId = String((body as { listingId?: unknown }).listingId ?? "").trim().slice(0, 64);
  if (!listingId) return NextResponse.json({ error: "listingId required" }, { status: 400 });

  const vid = visitorId(req);
  let viewerId: string | undefined;
  try {
    viewerId = (await currentUser())?.id;
  } catch {
    viewerId = undefined;
  }
  const referrer = (req.headers.get("referer") || "").slice(0, 300) || undefined;

  const r = await recordListingView({
    listingId,
    viewerId,
    sessionId: vid,
    referrer,
    userAgent: (ua || "").slice(0, 160) || undefined,
  });

  const res = NextResponse.json({ ok: true, deduped: r.deduped });
  if (!req.cookies.get(VISITOR_COOKIE)) {
    res.cookies.set(VISITOR_COOKIE, vid, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 365 * 86400,
    });
  }
  return res;
}
