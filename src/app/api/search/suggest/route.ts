import { NextRequest, NextResponse } from "next/server";
import { suggestionsAll } from "@/lib/search";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json({ suggestions: await suggestionsAll(q) });
}
