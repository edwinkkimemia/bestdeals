import { Settings as SettingsIcon } from "lucide-react";
import { getStore } from "@/lib/store";
import { SettingsForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings", robots: { index: false, follow: false } };

const str = (v: unknown) => (typeof v === "string" ? v : "");

export default async function AdminSettings() {
  const store = getStore();
  const [annOn, annText, email, phone, whatsapp, regOpen, bps] = await Promise.all([
    store.getSetting("announcement_enabled").catch(() => null),
    store.getSetting("announcement_text").catch(() => null),
    store.getSetting("support_email").catch(() => null),
    store.getSetting("support_phone").catch(() => null),
    store.getSetting("support_whatsapp").catch(() => null),
    store.getSetting("registrations_open").catch(() => null),
    store.getSetting("commission_bps").catch(() => null),
  ]);
  const commission = Number(str(bps));
  return (
    <div>
      <h1 className="section-title flex items-center gap-2"><SettingsIcon className="h-6 w-6 text-brand-600" /> Settings</h1>
      <p className="mt-1 text-sm text-ink-500">Site-wide controls — changes apply immediately.</p>
      <div className="mt-4">
        <SettingsForm
          initial={{
            announcement_enabled: annOn === "1" || annOn === true,
            announcement_text: str(annText),
            support_email: str(email),
            support_phone: str(phone),
            support_whatsapp: str(whatsapp),
            registrations_open: regOpen === null || regOpen === undefined ? true : regOpen === "1" || regOpen === true,
            commission_bps: Number.isFinite(commission) && commission >= 0 ? Math.round(commission) : 500,
          }}
        />
      </div>
    </div>
  );
}
