import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

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
