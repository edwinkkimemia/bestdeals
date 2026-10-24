import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { logAudit } from "@/lib/audit";

const schema = z.object({ slug: z.string().min(1), verified: z.boolean() });

/** Admin-only: grant or revoke a shop's verified-business badge. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide slug + verified." }, { status: 400 });
  const shop = await getStore().getShopBySlug(parsed.data.slug);
  if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  await getStore().setShopVerified(parsed.data.slug, parsed.data.verified);
  return NextResponse.json({ ok: true });
}

/** Admin-only: delete a storefront and its catalogue. Order history keeps its item snapshots. */
export async function DELETE(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || new URL(req.url).searchParams.get("slug") || "").trim();
  if (!slug) return NextResponse.json({ error: "Provide slug." }, { status: 400 });
  const store = getStore();
  const shop = await store.getShopBySlug(slug).catch(() => null);
  if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  await store.deleteShop(slug);
  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "shop.delete",
    entity: "shop",
    entityId: slug,
    reason: "Admin deleted the storefront and its catalogue.",
  }).catch(() => {});
  try {
    revalidatePath("/sitemap.xml");
  } catch {}
  return NextResponse.json({ ok: true });
}
