import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { referralLink } from "@/lib/referrals";

/** My invite link + referral stats (signups, qualified, rewards). */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const items = await getStore().listReferralsByReferrer(user.id).catch(() => []);
  const stats = {
    invited: items.length,
    qualified: items.filter((r) => r.status === "qualified" || r.status === "rewarded").length,
    rewarded: items.filter((r) => r.status === "rewarded").length,
  };
  const base = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  return NextResponse.json({ link: referralLink(user.id, base), items, stats });
}
