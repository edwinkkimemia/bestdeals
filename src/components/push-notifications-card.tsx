"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, CheckCircle2, Loader2, Send, Smartphone } from "lucide-react";

type PushState = "loading" | "unsupported" | "off" | "on" | "denied";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Browser push enrolment for the signed-in account. Permission is only
 * requested after an explicit button press (never on page load).
 */
export function PushNotificationsCard() {
  const [status, setStatus] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      typeof Notification === "undefined"
    ) {
      setStatus("unsupported");
      return;
    }
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const sub = await reg.pushManager.getSubscription();
        if (!live) return;
        setStatus(Notification.permission === "denied" ? "denied" : sub ? "on" : "off");
      } catch {
        if (live) setStatus("off");
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") {
        setStatus("unsupported");
        return;
      }
      const permission =
        Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied") {
          setStatus("denied");
          setErr("Notifications are blocked. Allow them for chap.co.ke in your browser settings, then try again.");
        } else {
          setStatus("off");
          setMsg("Notifications weren’t enabled. You can turn them on anytime.");
        }
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const keyRes = await fetch("/api/push/public-key", { cache: "no-store" });
      const keyJson = await keyRes.json().catch(() => ({}));
      if (!keyRes.ok || !keyJson.publicKey) {
        setErr(keyJson.error || "Push notifications are not configured yet.");
        return;
      }

      const existing = await reg.pushManager.getSubscription();
      const subscription =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey) as BufferSource,
        }));

      const save = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      const saved = await save.json().catch(() => ({}));
      if (!save.ok) {
        if (!existing) await subscription.unsubscribe().catch(() => {});
        setErr(saved.error || "Could not enable push notifications.");
        return;
      }

      setStatus("on");
      setMsg("Push notifications are on for this device.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not enable push notifications.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setStatus("off");
      setMsg("Push notifications are off for this device.");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setErr(json.error || "Could not send the test notification.");
      setMsg(`Test notification sent to ${json.sent ?? 1} device${json.sent === 1 ? "" : "s"}.`);
    } finally {
      setBusy(false);
    }
  };

  const active = status === "on";

  return (
    <section className="card mt-4 p-5" aria-labelledby="push-notifications">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-green-50 text-green-700" : "bg-brand-50 text-brand-700"}`}>
            {active ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <h2 id="push-notifications" className="font-bold">Push notifications</h2>
            <p className="mt-0.5 max-w-xl text-sm text-ink-500">
              Get messages, order updates, listing moderation and search alerts even when Chap is closed.
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
          active ? "bg-green-50 text-green-700" : status === "denied" ? "bg-red-50 text-red-700" : "bg-sand-100 text-ink-600"
        }`}>
          {status === "loading" && "Checking…"}
          {status === "on" && "Enabled on this device"}
          {status === "off" && "Not enabled"}
          {status === "denied" && "Blocked by browser"}
          {status === "unsupported" && "Not supported"}
        </span>
      </div>

      {status === "unsupported" ? (
        <p className="mt-3 rounded-xl bg-sand-50 p-3 text-sm text-ink-600">
          This browser does not support Web Push. On iPhone/iPad, add Chap to your Home Screen first, then open it from there.
        </p>
      ) : status === "denied" ? (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Notifications are blocked for this site.</p>
          <p className="mt-0.5">Open your browser&apos;s site settings for chap.co.ke and allow notifications, then reload this page.</p>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {active ? (
            <>
              <button type="button" className="btn-secondary !py-2 text-sm" onClick={sendTest} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send test notification
              </button>
              <button type="button" className="text-sm font-semibold text-ink-500 hover:text-red-700" onClick={disable} disabled={busy}>
                Turn off on this device
              </button>
            </>
          ) : (
            <button type="button" className="btn-primary !py-2 text-sm" onClick={enable} disabled={busy || status === "loading"}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
              Enable push notifications
            </button>
          )}
          {active && <span className="flex items-center gap-1 text-xs text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Device connected</span>}
        </div>
      )}

      {msg && <p role="status" className="mt-2 text-sm text-green-700">{msg}</p>}
      {err && <p role="alert" className="mt-2 text-sm text-red-700">{err}</p>}
      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-ink-400">
        <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        You can enable push separately on each phone or browser. On iPhone, install Chap to your Home Screen first.
      </p>
    </section>
  );
}
