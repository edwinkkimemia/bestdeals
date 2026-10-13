import { NextResponse, NextRequest } from "next/server";
import { getDeliveryFees, setDeliveryFees } from "@/lib/delivery";
import { currentUser } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ fees: await getDeliveryFees() });
}

export async function PUT(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  await setDeliveryFees({ standard: Number(body.standard), express: Number(body.express) });
  return NextResponse.json({ ok: true, fees: await getDeliveryFees() });
}
