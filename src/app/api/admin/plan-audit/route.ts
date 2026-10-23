import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { auditPlanRows, getSellerPlan } from "@/lib/plans";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const user = await currentUser().catch(() => null);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

/** Admin-only: every account's live-listing count vs effective plan. */
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const store = getStore();
  const [users, shops, counts] = await Promise.all([
    store.listUsers().catch(() => []),
    store.listShops().catch(() => []),
    store.countLiveListingsByOwner().catch(() => []),
  ]);
  const rows = auditPlanRows(users, shops, counts);
  return NextResponse.json({
    rows,
    summary: {
      accounts: rows.length,
      needUpgrade: rows.filter((r) => r.needsUpgrade).length,
    },
  });
}

/**
 * Admin-only: assign the matching plan to one account (upgrades only — never
 * auto-downgrades). A seller has one plan: it lands on the first owned shop
 * when there is one, else on the personal seller plan.
 */
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || body.id || "").trim();
  if (!userId) return NextResponse.json({ error: "Provide userId." }, { status: 400 });
  const store = getStore();
  const target = await store.findUserById(userId).catch(() => null);
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  const [owned, counts] = await Promise.all([
    store.listShopsByOwner(userId).catch(() => []),
    store.countLiveListingsByOwner().catch(() => []),
  ]);
  const [row] = auditPlanRows(
    [{ id: target.id, name: target.name, email: target.email, planId: target.planId }],
    owned.map((s) => ({ slug: s.slug, name: s.name, ownerId: userId, planId: (s as { planId?: string }).planId })),
    counts.filter((c) => c.ownerId === userId)
  );
  if (!row.needsUpgrade) {
    return NextResponse.json({ ok: true, unchanged: true, row });
  }
  if (row.target.kind === "shop") {
    await store.setShopPlan(row.target.slug, row.expectedPlan);
    await store.setUserPlan(userId, "free").catch(() => {});
  } else {
    await store.setUserPlan(userId, row.expectedPlan);
  }
  const effective = await getSellerPlan(userId).catch(() => null);
  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "plan.assign",
    entity: "user",
    entityId: userId,
    reason: `${row.effectivePlan}->${row.expectedPlan} (${row.liveCount} live, via ${row.target.kind}${row.target.kind === "shop" ? `:${row.target.slug}` : ""})`,
  }).catch(() => {});
  return NextResponse.json({ ok: true, assigned: row.expectedPlan, effectivePlan: effective?.planId ?? row.expectedPlan, row: { ...row, effectivePlan: effective?.planId ?? row.expectedPlan, needsUpgrade: false } });
}
