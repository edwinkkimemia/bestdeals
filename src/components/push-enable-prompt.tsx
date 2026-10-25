"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2, X } from "lucide-react";
import { enableBrowserPush, getBrowserPushState } from "@/lib/push-client";

const DISMISS_KEY = "chap_push_prompt_dismissed_v1";
const DISMISS_DAYS = 30;

function dismissed(): boolean {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

/** Contextual, dismissible prompt shown after the first chat/order action. */
export function PushEnablePrompt({ context = "messages", className = "" }: { context?: "messages" | "orders"; className?: string }) {
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (dismissed()) return;
    let live = true;
    (async () => {
      try {
        // Guests can read order pages by phone; only signed-in users can own
        // a push subscription.
        const me = await fetch("/api/auth/me", { cache: "no-store" });
        if (!me.ok) return;
        const state = await getBrowserPushState();
        if (live) setVisible(state === "off");
      } catch {}
    })();
    return () => {
      live = false;
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86400_000));
    } catch {}
    setVisible(false);
    setEnabled(false);
  };

  const enable = async () => {
    setBusy(true);
    setErr("");
    const result = await enableBrowserPush();
    setBusy(false);
    if (result.ok || result.state === "on") {
      setEnabled(true);
      setVisible(false);
      return;
    }
    if (result.error) setErr(result.error);
    else if (result.message) setErr(result.message);
  };

  if (!visible && !enabled) return null;

  return (
    <div
      className={`card flex items-start gap-2.5 border-brand-600/20 bg-brand-50 p-3 text-sm ${className}`}
      role="status"
    >
      <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-900">
          {enabled ? "Push alerts are on for this device." : context === "orders" ? "Get order updates even when Chap is closed." : "Get reply alerts even when Chap is closed."}
        </p>
        <p className="mt-0.5 text-xs text-ink-600">
          {enabled
            ? "We’ll notify you about new messages, order updates and alerts."
            : "Enable browser notifications for messages and order changes. You can turn this off anytime."}
        </p>
        {err && <p role="alert" className="mt-1 text-xs text-red-700">{err}</p>}
        {!enabled && (
          <button type="button" className="btn-primary mt-2 !px-3 !py-1.5 !text-xs" onClick={enable} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
            Enable alerts
          </button>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss notification prompt" className="rounded-lg p-1 text-ink-400 hover:bg-white/70">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
