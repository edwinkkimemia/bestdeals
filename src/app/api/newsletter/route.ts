import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  console.log("[newsletter-consent]", { email, at: new Date().toISOString() });
  return NextResponse.redirect(new URL("/?newsletter=thanks", req.url), 303);
}
