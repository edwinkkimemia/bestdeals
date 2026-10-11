"use client";

import { useEffect, useState } from "react";
import { REFERRAL_REWARD } from "@/lib/referrals";

type Stats = { invited: number; qualified: number; rewarded: number };

/** Invite friends: share link (copy + WhatsApp), track signups → rewards. */
export function ReferralPanel() {
  const [link, setLink] = useState("");
  const [stats, setStats] = useState<Stats>({ invited: 0, qualified: 0, rewarded: 0 });
  const [msg, setMsg] = useState("");

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
      setMsg("Link copied ✓ — share it anywhere.");
    } catch {
      setMsg(link);
    }
  };

  if (!link) return null;
  const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Join me on Chap — Kenya's marketplace for everything. Sign up here: ${link}`)}`;

  return (
    <div className="card p-5">
      <p className="font-bold">Refer & earn 🚀</p>
      <p className="mt-1 text-sm text-ink-500">
        Friends join free with your link. When they get verified, you earn a {REFERRAL_REWARD.blurb} on your latest live listing.
      </p>
      <div className="mt-3 flex gap-2">
        <input readOnly value={link} aria-label="Your invite link" className="input-bd font-mono !text-xs" onFocus={(e) => e.target.select()} />
        <button onClick={copy} className="btn-secondary shrink-0 !px-3">Copy</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={wa} target="_blank" rel="noreferrer" className="btn-whatsapp !px-3 !py-1.5 text-xs">Share on WhatsApp</a>
      </div>
      {msg && <p role="status" className="mt-2 break-all text-xs">{msg}</p>}
      <p className="mt-3 text-sm">
        <strong>{stats.invited}</strong> joined · <strong>{stats.qualified}</strong> verified · <strong>{stats.rewarded}</strong> boosts earned
      </p>
    </div>
  );
}
