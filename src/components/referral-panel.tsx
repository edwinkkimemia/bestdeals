"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { REFERRAL_REWARD } from "@/lib/referrals";

type Stats = { invited: number; qualified: number; rewarded: number };

/** Invite friends: share link (copy + WhatsApp), track signups → rewards. */
export function ReferralPanel() {
  const [link, setLink] = useState("");
  const [stats, setStats] = useState<Stats>({ invited: 0, qualified: 0, rewarded: 0 });
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals/mine")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return;
        setLink(j.link ?? "");
        setStats(j.stats ?? { invited: 0, qualified: 0, rewarded: 0 });
      })
      .catch(() => null);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setMsg("Link copied — share it anywhere.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg(link);
    }
  };

  if (!link) return null;
  const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Join me on Chap — Kenya's marketplace for everything. Sign up here: ${link}`)}`;

  return (
    <div className="card min-w-0 p-4 sm:p-5">
      <p className="font-bold">Refer & earn 🚀</p>
      <p className="mt-1 text-sm text-ink-500">
        Invite friends free. When they get verified, you earn a {REFERRAL_REWARD.blurb} on your latest live listing.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={link}
          aria-label="Your invite link"
          className="input-bd w-full min-w-0 font-mono !text-xs sm:flex-1"
          onFocus={(e) => e.target.select()}
        />
        <button type="button" onClick={copy} className="btn-secondary w-full justify-center sm:w-auto sm:shrink-0 sm:!px-3">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a href={wa} target="_blank" rel="noreferrer" className="btn-whatsapp !px-3 !py-1.5 text-xs">
          <WhatsAppIcon className="h-3.5 w-3.5" /> Share on WhatsApp
        </a>
      </div>
      {msg && <p role="status" className="mt-2 break-all text-xs text-green-700">{msg}</p>}
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-sand-50 p-2 text-center">
        {[
          { label: "Joined", value: stats.invited },
          { label: "Verified", value: stats.qualified },
          { label: "Boosts", value: stats.rewarded },
        ].map(({ label, value }) => (
          <div key={label}>
            <strong className="block text-lg leading-tight">{value}</strong>
            <span className="block text-[11px] leading-tight text-ink-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
