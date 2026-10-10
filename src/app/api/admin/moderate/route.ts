import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

/**
 * Admin-only moderation with recorded reason + audit trail.
 * approve → active · reject → rejected · hide → hidden.
 * Works on real store listings; demo catalogue ids are logged only.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const isJson = (req.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await req.json().catch(() => ({})) : Object.fromEntries(await req.formData());
  const id = String(body.id || "");
  const action = String(body.action || "");
  const reason = String(body.reason || action).slice(0, 500);
  const status = action === "approve" ? "active" : action === "reject" ? "rejected" : action === "hide" ? "hidden" : null;
  if (!id || !status) {
    const err = { error: "Provide id + action (approve|reject|hide)." };
    return isJson ? NextResponse.json(err, { status: 400 }) : NextResponse.redirect(new URL("/admin", req.url), 303);
  }
  const store = getStore();
  const existing = await store.getListing(id);
  if (existing) {
    await store.setListingStatus(id, status, user.id, reason);
  } else {
    console.log("[audit] moderate (demo catalogue id, no-op)", { admin: user.email, id, action, reason });
  }
  return isJson ? NextResponse.json({ ok: true }) : NextResponse.redirect(new URL("/admin", req.url), 303);
}
