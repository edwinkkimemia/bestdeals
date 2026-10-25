"use client";

import { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing, CheckCircle2, Loader2, Send, Smartphone } from "lucide-react";
import {
  disableBrowserPush,
  enableBrowserPush,
  getBrowserPushState,
  sendTestBrowserPush,
  type BrowserPushState,
} from "@/lib/push-client";
import {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_PREF_META,
  NOTIFICATION_PREF_TYPES,
  type NotificationPrefs,
  type NotificationPrefType,
} from "@/lib/notification-prefs";

type PushState = BrowserPushState | "loading";

/**
 * Browser push enrolment + per-type preferences for the signed-in account.
 * Permission is only requested after an explicit button press.
 */
export function PushNotificationsCard() {
  const [status, setStatus] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [prefsReady, setPrefsReady] = useState(false);
  const [prefsBusy, setPrefsBusy] = useState<NotificationPrefType | null>(null);
  const [prefsMsg, setPrefsMsg] = useState("");

  const loadPrefs = useCallback(async () => {
    try {
      const r = await fetch("/api/push/preferences", { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        setPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...(j.prefs ?? {}) });
      }
    } catch {}
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    getBrowserPushState().then(setStatus).catch(() => setStatus("off"));
    loadPrefs();
  }, [loadPrefs]);

  const enable = async () => {
    setBusy(true);
    setMsg("");
    setErr("");
    const result = await enableBrowserPush();
    setStatus(result.state);
    if (result.ok) setMsg(result.message || "Push notifications are on for this device.");
    else {
      if (result.error) setErr(result.error);
      if (result.message) setMsg(result.message);
    }
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true);
    setMsg("");
    setErr("");
    const result = await disableBrowserPush();
    setStatus(result.state);
    if (result.ok) setMsg(result.message || "Push notifications are off for this device.");
    else if (result.error) setErr(result.error);
    setBusy(false);
  };

  const sendTest = async () => {
    setBusy(true);
    setMsg("");
    setErr("");
    const result = await sendTestBrowserPush();
    if (result.ok) setMsg(result.message || "Test notification sent.");
    else if (result.error) setErr(result.error);
    setBusy(false);
  };

  const togglePref = async (type: NotificationPrefType) => {
    if (prefsBusy || !prefsReady) return;
    const next = !prefs[type];
    setPrefs((current) => ({ ...current, [type]: next }));
    setPrefsBusy(type);
    setPrefsMsg("");
    try {
      const r = await fetch("/api/push/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs: { [type]: next } }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setPrefs((current) => ({ ...current, [type]: !next }));
        setPrefsMsg(j.error || "Could not save that preference.");
        return;
      }
      if (j.prefs) setPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...j.prefs });
      setPrefsMsg("Preferences saved.");
    } catch {
      setPrefs((current) => ({ ...current, [type]: !next }));
      setPrefsMsg("Could not save that preference.");
    } finally {
      setPrefsBusy(null);
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

      {status !== "unsupported" && prefsReady && (
        <div className="mt-4 border-t border-neutral-100 pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-bold">What should trigger a push?</p>
            <span className="text-[11px] text-ink-400">In-app notifications stay on for everything.</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {NOTIFICATION_PREF_TYPES.map((type) => {
              const meta = NOTIFICATION_PREF_META[type];
              return (
                <label
                  key={type}
                  className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm hover:bg-sand-50"
                >
                  <input
                    type="checkbox"
                    checked={prefs[type]}
                    disabled={Boolean(prefsBusy)}
                    onChange={() => togglePref(type)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold">{meta.label}</span>
                    <span className="block text-xs text-ink-500">{meta.description}</span>
                  </span>
                  {prefsBusy === type && <Loader2 className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-ink-400" />}
                </label>
              );
            })}
          </div>
          {prefsMsg && <p role="status" className="mt-2 text-xs text-ink-500">{prefsMsg}</p>}
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
