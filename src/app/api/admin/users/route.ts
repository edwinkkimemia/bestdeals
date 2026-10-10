import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

const schema = z.object({ id: z.string().min(1), verified: z.boolean() });

/** Admin-only: grant or revoke seller (ID) verification. Reason recorded via audit where supported. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide id + verified." }, { status: 400 });
  if (parsed.data.id === user.id) return NextResponse.json({ error: "You can't change your own verification." }, { status: 422 });
  const target = await getStore().findUserById(parsed.data.id);
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  await getStore().setUserVerified(parsed.data.id, parsed.data.verified);
  return NextResponse.json({ ok: true });
}
