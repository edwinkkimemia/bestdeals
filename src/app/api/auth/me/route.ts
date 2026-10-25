import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

/** Lightweight session probe for client pages (200 + user when signed in). */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  // Fresh row so client profile screens have bio/photo after an edit.
  const fresh = await getStore().findUserById(user.id).catch(() => null);
  return NextResponse.json({
    user: {
      id: user.id,
      name: fresh?.name ?? user.name,
      email: user.email,
      phone: fresh?.phone ?? user.phone,
      role: user.role,
      verified: fresh?.verified ?? user.verified,
      bio: fresh?.bio ?? null,
      photoUrl: fresh?.photoUrl ?? null,
      coverUrl: fresh?.coverUrl ?? null,
    },
  });
}
