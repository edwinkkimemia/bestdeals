# Jiji vs chap.co.ke — features Jiji has that are missing here (2026-10-12)

> UPDATE 2026-10-13: high-value Jiji items that fit chap's cart structure are
> IMPLEMENTED (code-complete, tests green). Skipped as poor-fit: licensed
> third-party escrow holder, Cars 200-pt inspection/finance, Jobs CV inbox,
> multi-language app, human account managers, airtime redemption (wallet rails
> exist, redemption operator pending).
>
> | Jiji item | Chap status |
> |---|---|
> | Free renew/bump 7d | ✅ `PATCH /api/listings/[id] renew` + cooldown |
> | TOP pin 7/30d | ✅ `top-7/top-30` in `BOOST_PRODUCTS` + `rankDeterministic` |
> | Boost Premium/VIP tiers | ✅ `boost-premium-30/boost-vip-30` + wallet-first pay |
> | Wallet + history | ✅ `/api/wallet` + `src/lib/wallet.ts` + history |
> | Contact-reveal conversions | ✅ `/api/analytics/reveal` + funnel `reveals/conversions` + UI tracking |
> | Price hint / trends / Scout-lite | ✅ `/api/insights` (`hint/trends/niche`) + `src/lib/insights.ts` |
> | Granular moderation reasons | ✅ `src/lib/moderation.ts` + bulk moderate + resubmit |
> | Report picker + auto-block | ✅ `REPORT_REASONS` + 2-strike auto-hide + audit |
> | Seller response / appeal | ✅ reviews `PATCH` response/helpful/edit + disputes seller-ownership + SLA stamp |
> | Delivery matrix / pickup | ✅ `/api/delivery` matrix + checkout UI + seller-pays helper |
> | Business profile fields | ✅ hours/delivery/logo/cover + transfer/close + staff invites |
> | Saved-search alerts (leapfrog) | ✅ `/api/saved-searches` + consents + synced wishlist |

> Source: `jiji.ng/faq/*`, `jiji.co.ke/faq/*`, escrow/billing terms, Play/App Store changelogs 2024-2026 (researched Oct 2026).
> Jiji model: **classifieds-first, no cart for most ads** — `Search → Chat/Call → Meet or Delivery → Pay on inspection`, plus opt-in `Safe Deal` escrow + `Jiji Delivery`.
> Chap model: cart + multi-seller suborders + COD/M-Pesa — keep that; borrow Jiji's trust/promotion/chat depth below.

## Summary table

| # | Jiji feature | Jiji how | Chap today | Gap |
|---|---|---|---|---|
| 1 | Free renew / bump | Free `Renew ad` → top, 1×/7d | No bump/renew; only `featured/sponsored` flags + lazy `sweepExpiredPromotions` (`store.ts:265`) | Add renew + cooldown |
| 2 | TOP pin (single-ad) | Pinned block above organics, 7/30d, `TOP+/VIP TOP+` bundles, 12-mo validity | `featured/sponsored` boolean only, no duration/pin UI (`promotions` table exists, `promotions/route.ts:57-66` never auto-activates) | Add TOP SKU + pinned slot |
| 3 | Boost packages (portfolio) | 1/3/6/12mo, `Basic 2× / Premium 5× / VIP 7× / VIP Gold / Diamond / Enterprise 500×`, per-vertical pricing (Cars/Property/Others/Others Lite/All-in-one), auto-renew cadence 48h/24h/12h, `Similar Ads` placement | Plan limits `free:5/silver:30/gold:∞` + analytics windows only (`plans.ts:16-32`); no reach multiplier, no auto-bump | Add tiered boost + cadence |
| 4 | Pro Sales PPC | Wallet + `KSh 125 min / 250 daily` (KE), bid groups + default + not-promoted, CPC auction, `Clicks/Impressions/Conversions (Show contact + Start chat)/Spent` per campaign, pause anytime | No wallet, no CPC, no bid groups; analytics funnel uses name-string match (`analytics.ts:390-400`) | Add wallet + PPC |
| 5 | Balance wallet + ledger | Top-up card/bank/eWallet/cash-at-bank, `Balance history` (date/name/amount/status), billing policy | No wallet; plan/boost `Demo billing — active immediately` (`shops/plan/route.ts:59-67`) | Add wallet + history |
| 6 | Price-attractiveness hint | `chances to attract customers` on price input | No hint | Add market-range hint |
| 7 | Title-suggests-category AI + guided form | Category-specific fields, video link (YouTube/FB) | Generic `listing-form.tsx`, no per-category attrs UI (though `CategoryAttribute` model exists), no video | Wire attrs + video |
| 8 | Pre-publish moderation with granular reasons | `Duplicate / Category:change to… / Title:remove contacts… / Photos:no logos/contacts/screenshots… / Price:adjust to market` — must fix + resubmit | `pending → approve/hide` only, demo IDs no-op (`moderate/route.ts:28`), no reason taxonomy | Add decline reasons + resubmit |
| 9 | Jiji Chat depth | Typing indicator, lock-screen reply (title+price+photo), voice msgs, stickers, link previews, `Mark all as read`, `Mark as spam` → Spam folder | Poll-only, text-only, 2000 char, no block/mute/delete/attachments/realtime (`chat-composer.tsx`, `conversations/[id]/route.ts:25-45`); `blocked` text with no API | Add typing/voice/attachments/spam/read-all |
| 10 | Show-contact + WhatsApp handoff | Number hidden until `Show contact`; `Contact on WhatsApp` deep-link; seller can hide phone but must keep ≥1 method; stay-in-chat nudge | Snapshot phone shown, WhatsApp button if number exists, no reveal-tracking, no hide-phone setting | Add reveal tracking (= PPC conversion) + hide-phone option |
| 11 | Reply-rate/speed ranking | `<2h reply` coaching, reply metrics affect Pro Sales | No reply metrics | Add reply SLA badge |
| 12 | SmileID KYC + badge monetization | Selfie + ID + liveness + issuer check; `Verified ID` badge **only visible while Boost active**; required for Phones category / duplicate-primary / unblock / payout; biometric auto-unblock; passkeys/FaceID | Manual ID/permit + phone-must-match (`verify/route.ts:32-36`, `kyc.ts:8-20`); badge not tied to plan; no OCR/liveness, no appeal SLA | Add vendor KYC + badge gating |
| 13 | Safety system | Canonical Safety Tips, per-ad `Report abuse` (illegal/prepayment/spam), 2 ban-requests = auto-block, scam-feedback → `complaint` → security check, escalating blocks, prohibited list, support appeal 24-48h | Reports `POST`-only orphan (`reports/route.ts:6`), no per-ad UI wiring audit, no auto-block threshold, no appeal SLA | Add report picker + auto-block + appeal |
| 14 | Interaction-based feedback | Anyone who chatted/called can leave smiley + text; `Moderation/Active/Declined/Converted to complaint`; phone-gated; seller `Appeal`, `Feedback ON/OFF` (OFF hurts rank); can't delete negatives | Order-linked only (`reviews/route.ts:28` `paid/delivered`), `pending` pre-moderation, no seller response/appeal, no photos/helpful, pending leaks via `?order=` | Keep verified-purchase AND add chat-based path + appeal + response |
| 15 | Safe Deal escrow (licensed holder) | Buyer `Buy with Safe Deal` → pay to **HoneyCoin/Quicknode + Choice MFB (CBK-regulated), not Jiji** → seller accept/decline → ship (API tracking or manual) or handoff (photo/receipt) → `marked delivered` → **24h inspection** → auto-release or `There is a problem` → photo support chat → binding decision; 1× 7d dispatch extension; 2-business-day seller response SLA; fees at checkout, non-refundable post-dispatch; requires Boost + verification + payout, price>0, eligible cat | No escrow; `pending_cod`/fake-STK only (`payments.ts:43-57`); dispute resolve only flips local status, no holder, no window, no tracking, no extension/SLA (`disputes/route.ts`, `admin/disputes`) | Add escrow track (even M-Pesa-held-lite) |
| 16 | Jiji Delivery pay-on-delivery | Buyer-created (buyer pays fee, non-refundable if rejects) vs seller-created (seller pays); doorstep or `Pickup Mtaani` points (cheaper); cash or M-Pesa on inspect; report prepayment demands | Hardcoded `{standard:250,express:500,pickup:0}` (`checkout/page.tsx:13`), no pickup network, no fee-payer logic | Add delivery matrix + pickup points |
| 17 | Business profile moderation | Custom slug `jiji.ng/your-business` (moderated), address public/private toggle, hours/days, website, description, photos, map link, verified-store presentation, human account managers (`Request help`) | Shop `slug/name/desc/county/phone/logo/cover` only, `PATCH` header-only, no slug rename/transfer/close, no hours/website/map moderation, no manager | Add profile fields + moderation |
| 18 | Jobs CV inbox | `View N CVs / No CVs Received` recruiter inbox | No jobs vertical | Add if targeting jobs |
| 19 | Cars vertical (ex-Cars45) | 200+ param inspection, docs check, valuation, Park-and-Sell, bank/dealer loans | No vertical tooling | Add later (inspection/valuation) |
| 20 | Scout niche finder | `scout.jiji.ng` free: Niche Score 0-10 (search volume vs competition) + sparklines | No market intel | Add Scout-lite (search-volume vs supply) |
| 21 | Price Trends | In-app trends per query | No trends | Add price histogram/median |
| 22 | Seller analytics that matter | Clicks/Impressions/Conversions defined as contact-reveals, CTR + reply-speed coaching, VIP reports/heatmaps | `track/seller/admin` exists but attribution by name-string, no contact-reveal event, no CTR coaching (`analytics.ts:390-400`) | Redefine conversion = `Show contact + Start chat` |
| 23 | Referral-to-airtime loop | `GET N100/friend`, both sides bonus, 1 NGN credited <24h after friend confirms phone, spend on premium or **airtime top-up** to verified phone, 12-mo expiry, balance ledger | Opaque `?ref=userId` enumerable, `REFERRAL_REWARD free 7-day Featured`, stays `qualified` if no active listing (`referrals.ts:3-48`), no airtime, no ledger | Add airtime redemption + ledger + fraud |
| 24 | Multi-language + lightweight app | EN + FR + Pidgin, `jiji.ng/.co.ke/.com.gh/.ug/.co.tz/.com.et`, zero-data/Airtel legacy, push + lock-screen rich notifs, Truecaller verify, social/Apple login, 1-account-per-person (phone/email/device/payment fingerprint) | EN only, web-only, email+phone auth, no social/Truecaller, no device fingerprint, no push | Add Truecaller/social, push, SW/Kiswahili |
| 25 | Account-manager upsell | `Request help`, dedicated managers for auto/VIP | No manager flow | Add for Gold/VIP |
| 26 | Favourites (parity) | Heart + `Saved & Favourites` FAQ bucket, thin docs, no price-drop alerts found | Wishlist local-only (`wishlist/page.tsx:12-18`), `SavedSearch` model unused | **Chap can leapfrog**: sync wishlist + saved-search price alerts (already modelled) |

## What chap already does better (keep)

- True cart + multi-seller suborders + server totals (Jiji has no cart for most ads).
- Order-linked `Verified purchase` reviews (stricter than Jiji's chat-based).
- `SavedSearch` model + newsletter/blog + CSV bulk template (no Jiji native equivalent in public docs).
- Combined search with type tabs + counts + cross-seller rails (`search.ts`, `related.ts`).
- Mandatory verification before posting (`gate.ts` `NOT_VERIFIED`) — Jiji gates badge/phones-category instead; chap's gate is stronger, keep it.

## Recommended borrow order (highest ROI first)

1. **Bump economics** (7d free renew + TOP 7/30d pin + portfolio Boost + auto-renew cadence) — Jiji's core retention; maps to existing `Promotion {featured|sponsored}` + `SellerSubscription`. See `todo.md §1, §8`.
2. **Wallet + PPC-lite** (balance history + daily budget + contact-reveal conversion) — monetization; needs `todo.md §1` Daraja + wallet ledger first.
3. **Chat depth** (show-contact tracking, spam folder/block, typing/voice/attachments, reply SLA badge, WhatsApp handoff, SMS fallback as Boost perk) — trust + PPC signal. See `todo.md §7`.
4. **KYC + safety** (SmileID path, badge visibility rule, granular decline reasons, report picker + 2-strike auto-block + appeal SLA, canonical Safety Tips) — anti-scam. See `todo.md §4, §9`.
5. **Delivery + escrow-lite** (buyer/seller-created fee logic, pickup points, 24h inspection window, tracking/manual flows, 2-day dispute SLA, licensed-holder note) — enables high-value goods. See `todo.md §1, §6, §7`.
6. **Seller intel** (price-attractiveness meter, Price Trends, Scout-lite niche score, Pro Sales stats `Clicks/Impressions/Contact-reveals/Spent`) — growth loop. See `todo.md §9`.
7. **Profiles + verticals** (moderated slug/address/website/hours/map, Jobs CV inbox, Cars inspection stub) — after core loop works.
8. **Referral-to-airtime + multi-lang/push** — last; needs wallet + push infra.

## File pointers for implementers

- Promotions/bump: `src/lib/store.ts` (promo sweep `:265`), `src/app/api/promotions/*`, `src/lib/plans.ts:16-32`, `prisma/schema.prisma:437-456 (Promotion/Referral)`.
- Chat: `src/components/chat-composer.tsx`, `src/app/dashboard/messages/**`, `src/app/api/conversations/**`, `src/app/api/enquiries/route.ts`.
- Trust: `src/app/api/verify/route.ts`, `src/lib/kyc.ts`, `src/lib/gate.ts`, `src/app/api/admin/verifications/**`, `src/app/api/reports/route.ts`, `src/app/api/reviews/route.ts`, `src/app/api/disputes/route.ts`.
- Delivery/escrow: `src/app/checkout/page.tsx`, `src/app/api/orders/**`, `src/lib/payments.ts`, `prisma/schema.prisma:270-337 (Order/Suborder/Payment/Refund/Dispute)`.
- Analytics: `src/lib/analytics.ts:58-400`, `src/app/api/analytics/**`, `src/app/dashboard/analytics/page.tsx`, `src/app/admin/analytics/page.tsx`.
