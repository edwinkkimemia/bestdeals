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
