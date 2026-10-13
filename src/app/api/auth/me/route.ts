import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

/** Lightweight session probe for client pages (200 + user when signed in). */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, verified: user.verified } });
}
