import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { currentUser } from "@/lib/auth";
import {
  recordListingView,
  getListingViewCount,
  isBotUserAgent,
  resolveViewPlatform,
  type ViewPlatform,
} from "@/lib/analytics";

const VISITOR_COOKIE = "bd_vid";
const VISITOR_HEADER = "x-chap-visitor";
const CLIENT_HEADER = "x-chap-client";

function validVisitorId(value?: string | null): string | null {
  return value && /^[A-Za-z0-9_-]{8,64}$/.test(value) ? value : null;
}

function visitorId(req: NextRequest, platform: ViewPlatform): string {
  // Native apps keep a stable per-install id (no third-party cookie needed).
  const header = validVisitorId(req.headers.get(VISITOR_HEADER));
  if (platform === "app" && header) return header;
  return (
    validVisitorId(req.cookies.get(VISITOR_COOKIE)?.value) ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
  );
}

/** Public listing counter for social proof (cached 60s). */
export async function GET(req: NextRequest) {
  const listingId = String(
    req.nextUrl.searchParams.get("listingId") ?? "",
  ).slice(0, 64);
  if (!listingId)
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  const counts = await getListingViewCount(listingId);
  const res = NextResponse.json({ listingId, ...counts });
  res.headers.set("Cache-Control", "public, max-age=60");
  return res;
}

/** Record a product view from the website or a native app. Bots and rapid refreshes are not counted. */
export async function POST(req: NextRequest) {
  // Native installs share carrier IPs, so rate-limit them per install id instead.
  const appClient =
    resolveViewPlatform({ client: req.headers.get(CLIENT_HEADER) }) === "app";
  const appVisitor = validVisitorId(req.headers.get(VISITOR_HEADER));
  const rl = rateLimit(
    appClient && appVisitor
      ? `app:${appVisitor}`
      : clientKey(req, "analytics:track"),
    {
      limit: 60,
      windowMs: 60_000,
    },
  );
  if (!rl.ok)
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const ua = req.headers.get("user-agent");
  if (isBotUserAgent(ua))
    return NextResponse.json({ ok: true, skipped: "bot" });

  const body = await req.json().catch(() => ({}));
  const listingId = String((body as { listingId?: unknown }).listingId ?? "")
    .trim()
    .slice(0, 64);
  if (!listingId)
    return NextResponse.json({ error: "listingId required" }, { status: 400 });

  const platform = resolveViewPlatform({
    platform: String((body as { platform?: unknown }).platform ?? ""),
    client: req.headers.get(CLIENT_HEADER),
    userAgent: ua,
  });

  // Web consent gate: explicit decline records nothing. Unknown (pre-banner or
  // direct calls) still counts the aggregate hit but never persists a new
  // visitor id — only an opted-in visitor gets a long-lived tracker.
  // Native app views use a random per-install id and no cross-site cookie.
  const consent = req.cookies.get("chap_consent")?.value;
  if (platform === "web" && consent === "a0") {
    return NextResponse.json({ ok: true, skipped: "no-consent" });
  }

  const vid = visitorId(req, platform);
  let viewerId: string | undefined;
  try {
    viewerId = (await currentUser())?.id;
  } catch {
    viewerId = undefined;
  }
  const referrer =
    (req.headers.get("referer") || "").slice(0, 300) || undefined;

  const r = await recordListingView({
    listingId,
    viewerId,
    sessionId: vid,
    referrer,
    userAgent: (ua || "").slice(0, 160) || undefined,
    platform,
  });

  const res = NextResponse.json({ ok: true, deduped: r.deduped, platform });
  if (!req.cookies.get(VISITOR_COOKIE) && (consent === "a1" || viewerId)) {
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
