/**
 * Browser-side Web Push helpers shared by the notification settings card and
 * just-in-time prompts. Kept free of server imports so it is safe in client
 * components.
 */

export type BrowserPushState = "unsupported" | "off" | "on" | "denied";

export type PushResult = {
  ok: boolean;
  state: BrowserPushState;
  error?: string;
  message?: string;
  sent?: number;
};

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function serviceWorker(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return reg;
}

/** Current browser/device state; never prompts the user. */
export async function getBrowserPushState(): Promise<BrowserPushState> {
  if (!supported()) return "unsupported";
  try {
    const reg = await serviceWorker();
    const subscription = await reg.pushManager.getSubscription();
    if (Notification.permission === "denied") return "denied";
    return subscription ? "on" : "off";
  } catch {
    return "off";
  }
}

/** Ask permission + create/save this device's push subscription. */
export async function enableBrowserPush(): Promise<PushResult> {
  if (!supported()) return { ok: false, state: "unsupported", error: "This browser doesn't support push notifications." };

  try {
    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") {
      return permission === "denied"
        ? {
            ok: false,
            state: "denied",
            error: "Notifications are blocked. Allow them for chap.co.ke in your browser settings, then try again.",
          }
        : { ok: false, state: "off", message: "Notifications weren’t enabled. You can turn them on anytime." };
    }

    const reg = await serviceWorker();
    const keyRes = await fetch("/api/push/public-key", { cache: "no-store" });
    const keyJson = await keyRes.json().catch(() => ({}));
    if (!keyRes.ok || !keyJson.publicKey) {
      return { ok: false, state: "off", error: keyJson.error || "Push notifications are not configured yet." };
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
      return { ok: false, state: "off", error: saved.error || "Could not enable push notifications." };
    }

    return { ok: true, state: "on", message: "Push notifications are on for this device." };
  } catch (error) {
    return {
      ok: false,
      state: "off",
      error: error instanceof Error ? error.message : "Could not enable push notifications.",
    };
  }
}

/** Remove this device's server record and browser subscription. */
export async function disableBrowserPush(): Promise<PushResult> {
  if (!supported()) return { ok: false, state: "unsupported" };
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const subscription = await reg?.pushManager.getSubscription();
    if (subscription) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => {});
      await subscription.unsubscribe().catch(() => {});
    }
    return { ok: true, state: "off", message: "Push notifications are off for this device." };
  } catch {
    return { ok: false, state: "off", error: "Could not turn off push notifications." };
  }
}

export async function sendTestBrowserPush(): Promise<PushResult> {
  try {
    const res = await fetch("/api/push/test", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, state: "off", error: json.error || "Could not send the test notification." };
    return {
      ok: true,
      state: "on",
      sent: json.sent ?? 1,
      message: `Test notification sent to ${json.sent ?? 1} device${json.sent === 1 ? "" : "s"}.`,
    };
  } catch {
    return { ok: false, state: "off", error: "Could not send the test notification." };
  }
}
