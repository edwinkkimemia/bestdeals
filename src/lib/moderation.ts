/** Granular moderation reasons (Jiji-style) + report taxonomy + auto-block.
 * Reasons force a fix-and-resubmit loop instead of a bare reject.
 */
export const MODERATION_REASONS = [
  { code: "duplicate", label: "Duplicate of an existing ad" },
  { code: "category", label: "Wrong category — suggest the right one" },
  { code: "title", label: "Title: remove contacts / repeated words / be specific" },
  { code: "photos", label: "Photos: low-quality, watermarked, screenshots or contacts" },
  { code: "description", label: "Description doesn't match the item" },
  { code: "price", label: "Price outside the market range" },
  { code: "prohibited", label: "Prohibited item" },
  { code: "spam", label: "Spam / scam links" },
] as const;

export const REPORT_REASONS = [
  { code: "illegal", label: "Illegal / prohibited item" },
  { code: "prepayment", label: "Asks for prepayment / scam" },
  { code: "spam", label: "Spam / duplicate" },
  { code: "wrong", label: "Wrong category / misleading" },
  { code: "other", label: "Other" },
] as const;

/** After N open ban-requests a listing auto-hides pending admin review. */
export const AUTO_BLOCK_REPORTS = 2;
