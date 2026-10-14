import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-neutral-200 bg-sand-50 text-ink-700",
    green: "border-green-200 bg-green-50 text-green-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-700",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  if (!verified) return <Badge tone="neutral">Unverified seller</Badge>;
  return <Badge tone="green">✓ Verified seller</Badge>;
}

/**
 * Compact account age ("3y", "8m") — the Jiji-style "X years on Chap" trust
 * signal. Null under ~30 days (too new to mean anything).
 */
export function tenureLabel(iso?: string | null): string | null {
  if (!iso) return null;
  const t = +new Date(iso);
  if (!Number.isFinite(t)) return null;
  const days = Math.floor((Date.now() - t) / 86400_000);
  if (days < 30) return null;
  if (days < 365) return `${Math.floor(days / 30)}m`;
  return `${Math.floor(days / 365)}y`;
}

/** Pill version for seller/shop headers ("3y on Chap"). */
export function TenureBadge({ since }: { since?: string | null }) {
  const t = tenureLabel(since);
  if (!t) return null;
  return (
    <span
      title={`On Chap since ${since}`}
      className="inline-flex shrink-0 items-center rounded-full border border-neutral-200 bg-sand-50 px-2.5 py-0.5 text-xs font-medium text-ink-700"
    >
      {t} on Chap
    </span>
  );
}

/**
 * X-style plan checkmark: blue filled check for Silver, gold for Gold —
 * shown alongside the verification badge on seller/shop identities.
 * Renders nothing on Free (or unknown) plans.
 */
export function PlanCheckmark({ plan, size = "md" }: { plan?: string | null; size?: "sm" | "md" }) {
  const id = (plan ?? "").toLowerCase();
  if (id !== "silver" && id !== "gold") return null;
  const label = id === "gold" ? "Gold plan seller" : "Silver plan seller";
  const dims = size === "sm" ? "h-3.5 w-3.5 text-[9px]" : "h-4 w-4 text-[10px]";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-black text-white ${
        id === "gold" ? "bg-amber-400" : "bg-[#1D9BF0]"
      } ${dims}`}
    >
      ✓
    </span>
  );
}

export function ConditionBadge({ condition }: { condition: string }) {
  const map: Record<string, string> = {
    new: "New",
    like_new: "Like new",
    used_good: "Used · good",
    used_fair: "Used · fair",
    refurbished: "Refurbished",
  };
  return <Badge>{map[condition] ?? condition}</Badge>;
}
