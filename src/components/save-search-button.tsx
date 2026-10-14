"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellPlus, BellRing } from "lucide-react";

/**
 * Jiji-style "watch this search": saves the current query so new matching
 * ads + price drops land in the bell + /dashboard/notifications feed.
 */
export function SaveSearchButton({ query, name }: { query: Record<string, unknown>; name: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async () => {
    if (state === "saving" || state === "saved") return;
    setState("saving");
    try {
      const r = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, query, alerts: true }),
      });
      if (r.status === 401) {
        router.push("/auth/signin?next=/search");
        setState("idle");
        return;
      }
      if (!r.ok) throw new Error(await r.text().catch(() => "failed"));
      setState("saved");
    } catch {
      setState("error");
    }
  };

  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-600/30">
        <BellRing className="h-3.5 w-3.5" /> Alert on — check the bell 🔔
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={save}
      disabled={state === "saving"}
      title="Get a bell notification when new matching ads arrive"
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand-700 ring-1 ring-brand-600/40 hover:bg-brand-50 disabled:opacity-60"
    >
      <BellPlus className="h-3.5 w-3.5" />
      {state === "saving" ? "Saving…" : state === "error" ? "Retry alert" : "Get alerts for this search"}
    </button>
  );
}
