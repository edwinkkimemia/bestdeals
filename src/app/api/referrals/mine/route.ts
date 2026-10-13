import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { referralLink, referralCode } from "@/lib/referrals";

/** My invite link + referral stats (signups, qualified, rewards). */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const store = getStore();
  const items = await store.listReferralsByReferrer(user.id).catch(() => []);
  // Retry qualification for pending referrals whose invitee has since verified.
  try {
    const { qualifyReferralsFor } = await import("@/lib/referrals");
    for (const r of items.filter((x) => x.status === "pending")) {
      await qualifyReferralsFor(r.referredUserId, store).catch(() => null);
    }
  } catch {}
  const fresh = await store.listReferralsByReferrer(user.id).catch(() => items);
  const stats = {
    invited: fresh.length,
    qualified: fresh.filter((r) => r.status === "qualified" || r.status === "rewarded").length,
    rewarded: fresh.filter((r) => r.status === "rewarded").length,
  };
  const base = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  return NextResponse.json({ link: referralLink(user.id, base), code: referralCode(user.id), items: fresh, stats, reward: "Free 7-day Featured boost · 12-mo code validity" });
}

/** Create a referral manually (opaque code exchange, e.g. offline invites). */
export async function POST(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "").trim();
  if (!code) return NextResponse.json({ error: "Invite code required." }, { status: 400 });
  const store = getStore();
  const { resolveReferrer } = await import("@/lib/referrals");
  const referrerId = await resolveReferrer(code, store);
  if (!referrerId || referrerId === user.id) return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  try {
    const rec = await store.createReferral({ referrerUserId: referrerId, referredUserId: user.id });
    return NextResponse.json({ ok: true, id: rec.id });
  } catch {
    return NextResponse.json({ error: "Already referred." }, { status: 409 });
  }
}
