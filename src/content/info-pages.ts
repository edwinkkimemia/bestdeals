/**
 * Help & policy content library. Resource-grade guides, not stubs:
 * Kenya-specific (M-Pesa, counties, Data Protection Act 2019), actionable,
 * and cross-linked. Rendered by src/app/[slug]/page.tsx.
 */

export type InfoBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "links"; links: { href: string; label: string }[] };

export type InfoSection = { heading: string; blocks: InfoBlock[] };

export type InfoPage = {
  title: string;
  updated: string;
  intro: string;
  sections: InfoSection[];
  faqs?: { q: string; a: string }[];
  related: { href: string; label: string }[];
};

const UPDATED = "October 2026";

export const INFO_PAGES: Record<string, InfoPage> = {
  help: {
    title: "Help Centre",
    updated: UPDATED,
    intro:
      "Everything you need to buy, sell, and stay safe on Chap — Kenya's marketplace for shop products, classifieds, business shops, and local services. Start with the guide below, or jump to a topic.",
    sections: [
      {
        heading: "Buying on Chap",
        blocks: [
          {
            type: "p",
            text: "Search once across everything: shop products, classifieds, and services appear in one combined results page with type tabs and live counts. Use the filters that matter — category, price range in KES, condition (new to refurbished), and county/town.",
          },
          {
            type: "list",
            items: [
              "Check the seller badge: ✓ Verified means ID or business checks passed. Unverified doesn't mean unsafe — just inspect more carefully.",
              "Compare the same item across sellers with the 'Related from other sellers' rail on every listing page.",
              "For classifieds, use Message seller or WhatsApp; for shop products, add to cart and check out with M-Pesa, card, or cash on delivery where offered.",
              "Save anything with the heart icon — it becomes a saved search for similar items, and your price history and order tracking live in your account.",
            ],
          },
          { type: "links", links: [{ href: "/safety", label: "Buyer Safety guide" }, { href: "/shipping", label: "Shipping & Delivery" }, { href: "/returns", label: "Returns & Refunds" }] },
        ],
      },
      {
        heading: "Selling on Chap",
        blocks: [
          {
            type: "p",
            text: "Anyone eligible under our terms can sell: create a free account with your email and Kenyan phone number, then post your first listing in minutes — photos upload straight from your phone. Listings go live after a quick moderation review.",
          },
          {
            type: "list",
            items: [
              "Individuals list classifieds and products free; businesses can open a branded shop (free forever).",
              "Write honest titles, real photos, accurate condition, and genuine prices — misleading discounts get listings removed.",
              "Answer enquiries fast: response speed is the single biggest driver of sales on marketplaces.",
              "Get verified (national ID, passport, or business permit) to earn the ✓ badge buyers filter for.",
            ],
          },
          { type: "links", links: [{ href: "/start-selling", label: "Sell on Chap" }, { href: "/pricing", label: "Business plans" }, { href: "/sellers", label: "Seller Guidelines" }] },
        ],
      },
      {
        heading: "Orders, payments & disputes",
        blocks: [
          {
            type: "p",
            text: "Pay cash on delivery — hand cash to the courier when your order arrives, and never send money in advance. Multi-seller carts split into per-seller suborders so each seller fulfils their part. Track everything under My orders.",
          },
          {
            type: "list",
            items: [
              "Payment status only ever changes via verified provider callbacks — never from anything shown in your browser.",
              "Something wrong? Open a dispute from the order page: the seller responds first, then a Chap moderator resolves with a refund or a ruling.",
              "Refunds go back through the original channel; M-Pesa reversals typically land within 5 business days.",
            ],
          },
          { type: "links", links: [{ href: "/orders", label: "Track my orders" }, { href: "/faq", label: "FAQs" }, { href: "/contact", label: "Contact support" }] },
        ],
      },
      {
        heading: "Accounts, verification & privacy",
        blocks: [
          {
            type: "p",
            text: "Your account holds listings, orders, messages, saved searches, and notification preferences. Verification documents are stored privately and visible only to moderators — never on public pages. You can export or delete your data from account settings, in line with Kenya's Data Protection Act, 2019.",
          },
          { type: "links", links: [{ href: "/dashboard/verify", label: "Get verified" }, { href: "/privacy", label: "Privacy Policy" }, { href: "/terms", label: "Terms & Conditions" }] },
        ],
      },
    ],
    faqs: [
      { q: "I can't sign in — what do I do?", a: "Use the exact email you registered with, and check for typos. If you've forgotten your password, use account recovery on the sign-in page. Still stuck? Email support@chap.co.ke from your registered address." },
      { q: "Why is my listing 'pending'?", a: "Every listing passes moderation before going live — usually within a few hours. Rejected listings show the reason in your dashboard; fix it and resubmit." },
      { q: "How do I change my delivery address?", a: "You set the address at checkout for each order. Saved addresses and notification preferences live in account settings." },
    ],
    related: [
      { href: "/faq", label: "FAQs" },
      { href: "/contact", label: "Contact" },
      { href: "/safety", label: "Buyer Safety" },
    ],
  },

  contact: {
    title: "Contact Chap",
    updated: UPDATED,
    intro:
      "Talk to a human. For the fastest help on a listing or order, use the in-page tools first (Report button, dispute flow) — they route straight to the right queue. For everything else, email us.",
    sections: [
      {
        heading: "Support",
        blocks: [
          {
            type: "list",
            items: [
              "Email: support@chap.co.ke — we reply within 2 business days, faster for safety reports.",
              "Include: your account email or checkout phone, the order ID or listing link, and screenshots of what you see.",
              "Nairobi, Kenya. Support hours: Monday–Saturday, 8am–8pm EAT.",
            ],
          },
        ],
      },
      {
        heading: "Report fraud or abuse (fastest path)",
        blocks: [
          {
            type: "p",
            text: "Don't email fraud reports if you can avoid it — the Report button on every listing and the dispute flow on every order reach moderators faster, with all the context attached. Every report is reviewed and recorded.",
          },
          {
            type: "list",
            items: [
              "Suspicious listing → Report button on the listing page.",
              "Bad order → Open a dispute from My orders → order detail.",
              "Abusive messages → report from your enquiries inbox.",
            ],
          },
        ],
      },
      {
        heading: "Sellers & businesses",
        blocks: [
          {
            type: "p",
            text: "Questions about shop plans, bulk uploads, verification, or advertising? Write to support@chap.co.ke with your shop name and slug — bulk and subscription queries are prioritised for paying plans.",
          },
          { type: "links", links: [{ href: "/pricing", label: "Business plans" }, { href: "/advertising", label: "Advertising" }, { href: "/sellers", label: "Seller Guidelines" }] },
        ],
      },
    ],
    related: [
      { href: "/help", label: "Help Centre" },
      { href: "/faq", label: "FAQs" },
      { href: "/safety", label: "Buyer Safety" },
    ],
  },

  faq: {
    title: "Frequently Asked Questions",
    updated: UPDATED,
    intro: "Short answers to the questions Kenyans ask us most. For the full guides, follow the links under each answer.",
    sections: [
      {
        heading: "Accounts & getting started",
        blocks: [
          {
            type: "list",
            items: [
              "Do I need an account to browse? No — search, categories, shops, and listings are all public. You only sign in to list, message, check out, or track orders.",
              "What do I need to register? A name, valid email, and Kenyan mobile number (07xx/01xx or +254). Verification codes confirm it's really you.",
              "Is Chap free? Browsing, buying enquiries, individual listings, and Free shops are free. We earn from Silver/Gold plans, featured visibility, and configured commissions — never hidden fees.",
            ],
          },
        ],
      },
      {
        heading: "Buying & paying",
        blocks: [
          {
            type: "list",
            items: [
              "How do I pay? Cash on delivery — pay the courier in cash when your order arrives. Never send money in advance.",
              "Is my payment safe? Totals are computed on our servers (never in your browser), you pay cash only when your order arrives, and anyone asking for money or a PIN in advance is a scammer.",
              "Can I negotiate? On listings marked Negotiable, message the seller with a fair offer. Fixed-price shop products generally aren't negotiable.",
              "What if my item never arrives? Open a dispute from the order page — seller responds first, then a moderator resolves with refund or ruling.",
            ],
          },
        ],
      },
      {
        heading: "Selling",
        blocks: [
          {
            type: "list",
            items: [
              "How fast do listings go live? After moderation review — usually within hours. You'll see pending / active / rejected states in your dashboard with reasons.",
              "What photos work best? Daylight, 4–8 sharp photos, flaws shown honestly, no stock photos for used items. Blurry or misleading photos get rejected.",
              "How do I get the ✓ badge? Submit an ID or business document at Dashboard → Verification. Approval flips the badge on all your listings and shop.",
              "Can I sell wholesale? Yes — Gold shops support bulk catalogues, CSV upload, and bulk-buyer enquiries.",
            ],
          },
          { type: "links", links: [{ href: "/start-selling", label: "Sell on Chap" }, { href: "/sellers", label: "Seller Guidelines" }] },
        ],
      },
    ],
    faqs: [
      { q: "Does Chap deliver countrywide?", a: "Yes — sellers configure standard (24–72h countrywide), express (same-day in Nairobi and major towns), and pickup options. Fees show before you confirm, and multi-seller carts split fulfilment per seller." },
      { q: "Can I return something?", a: "Sealed electronics from shops: 7-day returns. Classifieds (new or used, person-to-person): inspect before paying — sales are final unless the item was misrepresented, in which case dispute it." },
      { q: "Someone asked for an application fee for a job — legit?", a: "No. Real employers on Chap never charge to apply. Report the listing immediately and never send money to 'secure' a job." },
      { q: "How do I delete my account and data?", a: "From account settings you can export or delete your data, per the Data Protection Act, 2019. Deletion removes your profile and listings; completed-order records are retained as the law requires for transactions." },
    ],
    related: [
      { href: "/help", label: "Help Centre" },
      { href: "/shipping", label: "Shipping & Delivery" },
      { href: "/returns", label: "Returns & Refunds" },
    ],
  },

  safety: {
    title: "Buyer Safety",
    updated: UPDATED,
    intro:
      "Most Chap deals go smoothly. These rules exist for the few that don't. Read them once — they take three minutes and they work.",
    sections: [
      {
        heading: "The golden rules",
        blocks: [
          {
            type: "list",
            items: [
              "Meet in public, daytime, busy places — mall food courts, petrol stations, and police-station parking lots are all normal meeting spots in Kenya.",
              "Inspect before you pay: power on electronics, check IMEIs against the box, test-drive vehicles, walk through rentals.",
              "Never share your M-Pesa PIN, ID number photos, or bank details. Chap and Safaricom will never call asking for them.",
              "Keep chats on Chap until you're confident. Scammers push you to WhatsApp-only deals so there's no record.",
              "Never pay in advance for classifieds (person-to-person). For shop checkout, pay only through the on-site flow.",
            ],
          },
        ],
      },
      {
        heading: "Price traps & classic scams",
        blocks: [
          {
            type: "list",
            items: [
              "Too good to be true: a KSh 15,000 iPhone or a KSh 8,000 2-bedroom in Kilimani is bait. Compare with the 'Related from other sellers' rail — real market price clusters tightly.",
              "Delivery-fee scam: 'send KSh 500 transport and I'll ship it' for an item you've never seen. Insist on inspection or shop checkout.",
              "Rental viewing fees: legitimate agents show houses free; anyone demanding payment before viewing is running a con.",
              "Job fees: no genuine employer charges application, training, or uniform fees. Report instantly.",
              "Fake paybill/Till switches: at meet-ups, confirm the Till or paybill face-to-face and wait for your own M-Pesa confirmation SMS before handing over goods.",
            ],
          },
        ],
      },
      {
        heading: "Big-ticket checks (vehicles, property, electronics)",
        blocks: [
          {
            type: "list",
            items: [
              "Vehicles: verify the logbook, match chassis/engine numbers, and check for outstanding loans. Insist on transfer at NTSA/TIMS, never cash-in-hand for someone else's logbook.",
              "Property: view physically, confirm the landlord/agent identity, get a written agreement and receipts for every shilling. Never pay 'booking fees' sight unseen.",
              "Phones/laptops: sealed means sealed — broken seals, mismatched IMEIs, or missing warranties void the 'new' claim. Ask for the warranty card and receipt.",
            ],
          },
        ],
      },
      {
        heading: "How reporting & moderation protect you",
        blocks: [
          {
            type: "p",
            text: "Every listing carries a Report button; every order has a dispute flow; every message thread can be reported. Moderators review with recorded reasons, repeat offenders are suspended with appeal rights, and verification badges only appear after real checks. Paid promotion never overrides a safety removal.",
          },
          { type: "links", links: [{ href: "/prohibited", label: "Prohibited Items" }, { href: "/contact", label: "Report to support" }, { href: "/sellers", label: "What sellers must follow" }] },
        ],
      },
    ],
    faqs: [
      { q: "I already sent money to a scammer. What now?", a: "1) Call Safaricom (100/200) immediately — M-Pesa reversals are time-sensitive. 2) Report the listing and user on Chap. 3) Report to police with your transaction messages. Then email support@chap.co.ke with the order/listing link so we can ban the account." },
      { q: "The seller wants to meet at their house. Should I?", a: "Prefer public places. If you must go, take someone with you, share your live location with a friend, and keep it daytime." },
    ],
    related: [
      { href: "/prohibited", label: "Prohibited Items" },
      { href: "/returns", label: "Returns & Refunds" },
      { href: "/help", label: "Help Centre" },
    ],
  },

  sellers: {
    title: "Seller Guidelines",
    updated: UPDATED,
    intro:
      "Good sellers get the badge, the ranking, and the repeat buyers. These are the standards every listing is moderated against — individuals and shops alike.",
    sections: [
      {
        heading: "Listings that sell (and pass moderation)",
        blocks: [
          {
            type: "list",
            items: [
              "Accurate titles: brand + model + key spec + condition (e.g. 'Samsung Galaxy A15 128GB — sealed'). No ALL CAPS, no keyword stuffing.",
              "Real photos of the actual item, flaws included: 4–8 daylight shots. Stock photos for used items are rejected.",
              "Honest condition grading: New (sealed) · Like new · Used-good · Used-fair · Refurbished (state what was refurbished).",
              "Genuine pricing: a 'previous price' may only be shown if the item actually sold at it; fabricated discounts are removed and repeat offences suspend accounts.",
              "Right category + attributes: vehicles need make/model/year/mileage; property needs type/bedrooms/location. Miscategorised listings are hidden.",
            ],
          },
        ],
      },
      {
        heading: "Conduct that keeps you selling",
        blocks: [
          {
            type: "list",
            items: [
              "Respond fast and keep promises: confirm stock, price, and meet-up/delivery details in writing on Chap.",
              "One listing per item: duplicates, spam, and copy-paste flooding trigger removal. Renew expired listings instead of reposting daily.",
              "No counterfeits, stolen goods, or prohibited items — ever. See the full list.",
              "No fee-juggling: the price on the page is the price. 'Ongeza kidogo ukifika' negotiation is fine on Negotiable listings; bait-and-switch isn't.",
              "No review manipulation: fake reviews, paid ratings, and review extortion all lead to suspension.",
            ],
          },
          { type: "links", links: [{ href: "/prohibited", label: "Prohibited Items" }, { href: "/dashboard/verify", label: "Get verified" }] },
        ],
      },
      {
        heading: "Fees, verification & payouts",
        blocks: [
          {
            type: "p",
            text: "Individual listings are free. Shops run on Free, Silver, and Gold plans with published listing limits — plan, price, billing period, and renewal are always shown before you're charged. Verification (ID or business permit) unlocks the ✓ badge, higher limits, and buyer filters.",
          },
        ],
      },
      {
        heading: "Enforcement & appeals",
        blocks: [
          {
            type: "list",
            items: [
              "Three-step ladder: warning with reason → temporary suspension → permanent ban for fraud, counterfeits, or repeat abuse.",
              "Every action records a reason and an audit trail. You'll always be told what rule you broke.",
              "Appeal from your dashboard within 14 days — a different moderator re-reviews. Genuine mistakes get listings restored.",
            ],
          },
          { type: "links", links: [{ href: "/terms", label: "Terms & Conditions" }, { href: "/contact", label: "Appeal to support" }] },
        ],
      },
    ],
    related: [
      { href: "/start-selling", label: "Sell on Chap" },
      { href: "/pricing", label: "Business plans" },
      { href: "/prohibited", label: "Prohibited Items" },
    ],
  },

  about: {
    title: "About Chap",
    updated: UPDATED,
    intro:
      "Chap (chap.co.ke) is Kenya's marketplace for everything — shopping, classifieds, business shops, and local services in one trusted brand. Find it. Sell it. Get the best deal.",
    sections: [
      {
        heading: "One marketplace, many ways to trade",
        blocks: [
          {
            type: "p",
            text: "Most platforms force you to choose: a shop for new goods, a noticeboard for second-hand, a directory for services. Chap puts them side by side in one search, one account, and one set of trust rules — so a phone search shows sealed units from verified shops next to fairly-priced used ones from individuals.",
          },
          {
            type: "list",
            items: [
              "Shop products: new goods from retailers, wholesalers, and independents — cart, checkout, cash on delivery.",
              "Classifieds: new and pre-owned from individuals and businesses — enquire, negotiate, meet safely.",
              "Business shops: branded storefronts with catalogues, bulk enquiries, and delivery info.",
              "Services: fundis, cleaners, tutors, and pros — compare coverage areas and request quotes.",
            ],
          },
        ],
      },
      {
        heading: "Kenya first, expansion ready",
        blocks: [
          {
            type: "p",
            text: "Built in Nairobi for how Kenya actually trades: prices in KES, all 47 counties and towns (no GPS required), cash on delivery for shop orders and M-Pesa for seller services (advertising, shop plans), delivery Latitudes from CBD same-day to countrywide courier, and safety guidance written for Kenyan scams — not imported ones. The same foundations (multi-currency, multi-language, regional payments) are designed in for East Africa next.",
          },
        ],
      },
      {
        heading: "Trust before scale",
        blocks: [
          {
            type: "p",
            text: "Our operating principles: real data only (no fake discounts, countdowns, or verification badges), moderation with recorded reasons and appeals, verification that means something, and unit economics that keep fees fair so sellers stay. We measure repeat buyers and resolved disputes, not vanity registrations.",
          },
          { type: "links", links: [{ href: "/safety", label: "Buyer Safety" }, { href: "/sellers", label: "Seller Guidelines" }, { href: "/privacy", label: "Privacy Policy" }] },
        ],
      },
    ],
    related: [
      { href: "/start-selling", label: "Sell on Chap" },
      { href: "/contact", label: "Contact" },
      { href: "/help", label: "Help Centre" },
    ],
  },

  terms: {
    title: "Terms & Conditions",
    updated: UPDATED,
    intro:
      "The rules of trading on Chap. By using chap.co.ke — browsing, buying, selling, or messaging — you agree to these terms. Key points are summarised in plain language; the section text governs.",
    sections: [
      {
        heading: "1. The marketplace",
        blocks: [
          {
            type: "p",
            text: "Chap operates chap.co.ke, a venue connecting independent buyers and sellers. Chap is generally not the seller of listed items (unless explicitly stated): contracts for goods and services are between buyer and seller, and Chap provides search, checkout facilitation, messaging, moderation, and dispute resolution tools.",
          },
        ],
      },
      {
        heading: "2. Accounts & eligibility",
        blocks: [
          {
            type: "list",
            items: [
              "You must be 18+ (or have guardian consent) and provide accurate registration details.",
              "One account per person/business unless we approve otherwise; you're responsible for activity under your credentials.",
              "Sellers additionally accept the Seller Guidelines on registration; verification may be required for shops and high-risk categories.",
            ],
          },
        ],
      },
      {
        heading: "3. Listings & content",
        blocks: [
          {
            type: "list",
            items: [
              "Listings must be accurate, lawful, correctly categorised, and yours to sell. Prohibited items are removed on detection.",
              "You grant Chap a licence to display your listing content (photos, descriptions) on the marketplace and in marketing of your own shop.",
              "Prices are in KES and include any stated charges; 'previous prices' must be genuine. Chap may correct obvious errors and hide misleading listings.",
            ],
          },
        ],
      },
      {
        heading: "4. Orders, payments & delivery",
        blocks: [
          {
            type: "list",
            items: [
              "Checkout totals are computed server-side; an order is confirmed when payment succeeds (or COD is accepted) and stock is reserved.",
              "Delivery timelines shown at checkout are seller commitments; delays and failures are handled through the dispute flow.",
              "Refunds follow verified payment status and dispute outcomes, returned via the original payment channel where possible.",
            ],
          },
        ],
      },
      {
        heading: "5. Fees & subscriptions",
        blocks: [
          {
            type: "p",
            text: "Individual listings are free. Shop plans, featured visibility, and any commissions are charged exactly as displayed (plan, price, billing period, renewal) before you confirm — no surprise debits. Failed or refunded payments are never counted as revenue owed or paid.",
          },
        ],
      },
      {
        heading: "6. Conduct, enforcement & liability",
        blocks: [
          {
            type: "list",
            items: [
              "Fraud, counterfeits, harassment, spam, and circumvention of safety systems lead to suspension or bans, with a 14-day appeal window.",
              "Chap's liability is limited to the marketplace service itself (we don't warrant third-party items); nothing here limits rights you hold under Kenyan consumer-protection law.",
              "These terms are governed by the laws of Kenya. We may update them with notice on-site; continued use means acceptance.",
            ],
          },
          { type: "links", links: [{ href: "/privacy", label: "Privacy Policy" }, { href: "/sellers", label: "Seller Guidelines" }, { href: "/prohibited", label: "Prohibited Items" }] },
        ],
      },
    ],
    related: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/returns", label: "Returns & Refunds" },
      { href: "/contact", label: "Contact" },
    ],
  },

  privacy: {
    title: "Privacy Policy",
    updated: UPDATED,
    intro:
      "We collect the minimum data needed to run a safe marketplace, protect it strongly, and respect your rights under Kenya's Data Protection Act, 2019 (enforced by the Office of the Data Protection Commissioner).",
    sections: [
      {
        heading: "What we collect & why",
        blocks: [
          {
            type: "list",
            items: [
              "Account: name, email, phone — to identify you, secure your account, and send order/enquiry notifications.",
              "Listings & shops: titles, photos, prices, locations, business details — to display the marketplace.",
              "Transactions: orders, suborders, payment references (never card numbers or M-Pesa PINs) — to fulfil, reconcile, and resolve disputes.",
              "Verification documents: ID/business photos — stored privately, visible only to moderators, never on public pages.",
              "Location preference: your selected county, chosen manually or via an optional one-time device location check. Precise GPS coordinates are never stored.",
              "Push notifications: a per-device browser subscription and your chosen alert categories — only after you explicitly enable them. Turn them off anytime.",
              "Technical: device, approximate area, and usage analytics — to fight fraud, improve search, and keep the site fast.",
            ],
          },
        ],
      },
      {
        heading: "What we never do",
        blocks: [
          {
            type: "list",
            items: [
              "Never sell your personal data. Ever.",
              "Never show your private contact details publicly beyond your chosen seller contact preferences.",
              "Never ask for M-Pesa PINs, passwords, or OTPs by phone, SMS, or email.",
              "No unsolicited bulk WhatsApp or email blasts — marketing only with your opt-in consent, honoured unsubscribes.",
            ],
          },
        ],
      },
      {
        heading: "Advertising & cookies",
        blocks: [
          {
            type: "p",
            text: "Chap shows ads (including Google AdSense) to keep the marketplace free. Ads load in non-personalized mode until you make a consent choice; if you accept personalized ads, Google may use cookies — including the DoubleClick cookie — to serve ads based on your visits here and on other sites. You can opt out of personalized advertising at google.com/ads/preferences, or choose “Essential only” in the consent notice on this site. Ad units never appear on checkout, payment, account, or verification pages, and advertisers never receive your name, email, phone, or ID documents.",
          },
          { type: "links", links: [{ href: "/advertising", label: "Advertising on Chap" }] },
        ],
      },
      {
        heading: "Sharing, retention & security",
        blocks: [
          {
            type: "p",
            text: "We share data only with processors who run the service (hosting, couriers chosen by sellers, payment providers for your transaction, SMS/email gateways) under confidentiality duties — and with authorities when the law compels us. Order and payment records are kept as financial law requires; verification documents are purged after their retention window; everything else is deleted on verified account-deletion request. Security includes encrypted transport, hashed passwords, least-privilege admin access, private document buckets, and audit trails.",
          },
        ],
      },
      {
        heading: "Your rights (Data Protection Act, 2019)",
        blocks: [
          {
            type: "list",
            items: [
              "Access, correct, or delete your data from account settings — or email support@chap.co.ke.",
              "Withdraw marketing consent anytime (every message carries an opt-out).",
              "Object to processing and request restriction where the Act provides.",
              "Complain to us first; unresolved complaints may go to the Office of the Data Protection Commissioner (ODPC).",
            ],
          },
          { type: "links", links: [{ href: "/help", label: "Help Centre" }, { href: "/terms", label: "Terms & Conditions" }, { href: "/contact", label: "Contact" }] },
        ],
      },
    ],
    related: [
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/safety", label: "Buyer Safety" },
      { href: "/help", label: "Help Centre" },
    ],
  },

  returns: {
    title: "Returns & Refunds",
    updated: UPDATED,
    intro:
      "Different purchases, different rules — stated plainly before you pay. When things go wrong, the dispute flow on your order page is the fastest remedy.",
    sections: [
      {
        heading: "Shop products (checkout purchases)",
        blocks: [
          {
            type: "list",
            items: [
              "Sealed electronics & new goods: 7-day returns for unopened/unused items in original packaging — buyer contacts the seller first, then disputes if unresolved.",
              "Wrong, damaged, or materially-not-as-described items: full remedy (replacement or refund including delivery) via dispute — always photograph on arrival.",
              "Change-of-mind on used/refurbished shop items: per the shop's stated policy shown on its page; where silent, sale is final unless misrepresented.",
              "Return shipping: seller pays for their mistakes; buyer pays for change-of-mind returns.",
            ],
          },
        ],
      },
      {
        heading: "Classifieds (person-to-person)",
        blocks: [
          {
            type: "p",
            text: "Inspect before you pay — then sales are final. The exception is misrepresentation (fake specs, hidden faults, counterfeit sold as genuine): report the listing and open a dispute with your evidence and the seller is held to account, including bans for fraud.",
          },
        ],
      },
      {
        heading: "How refunds work",
        blocks: [
          {
            type: "list",
            items: [
              "Approved refunds return via the original channel: M-Pesa reversals typically land within 5 business days; card refunds follow your bank's timelines; COD orders refund via M-Pesa to your number.",
              "Refunds are only issued against verified payment status — failed or cancelled payments were never collected, so there's nothing to refund.",
              "Partial refunds (e.g. one suborder of a multi-seller cart) are supported; each suborder resolves independently.",
            ],
          },
          { type: "links", links: [{ href: "/orders", label: "My orders & disputes" }, { href: "/shipping", label: "Shipping & Delivery" }, { href: "/contact", label: "Contact support" }] },
        ],
      },
    ],
    faqs: [
      { q: "The seller won't answer about my return.", a: "Don't wait — open a dispute from the order page immediately. The seller gets a deadline to respond, then a moderator decides with or without them." },
      { q: "Can I return a phone because I found it cheaper elsewhere?", a: "Price differences alone aren't return grounds unless the shop's policy allows change-of-mind returns. Compare with the 'Related from other sellers' rail before you buy." },
    ],
    related: [
      { href: "/shipping", label: "Shipping & Delivery" },
      { href: "/safety", label: "Buyer Safety" },
      { href: "/terms", label: "Terms & Conditions" },
    ],
  },

  shipping: {
    title: "Shipping & Delivery",
    updated: UPDATED,
    intro:
      "From CBD same-day to countrywide courier — delivery options, fees, and timelines are set per seller and shown before you confirm. No surprises at the door.",
    sections: [
      {
        heading: "Delivery options",
        blocks: [
          {
            type: "list",
            items: [
              "Standard courier (24–72h countrywide): the default workhorse — Nairobi ↔ Mombasa/Kisumu/Nakuru/Eldoret in 1–2 days, farther counties up to 3.",
              "Express (same-day): Nairobi, Mombasa, Kisumu, Nakuru, Eldoret metro areas where the seller enables it — order before the shop's cutoff (usually 2–4pm).",
              "Pickup: free collection from the seller's stated point — confirm opening hours and carry your order ID.",
              "Classifieds meet-ups: person-to-person, so 'delivery' means an agreed public meeting point — see Buyer Safety.",
            ],
          },
        ],
      },
      {
        heading: "Fees, tracking & multi-seller carts",
        blocks: [
          {
            type: "list",
            items: [
              "Fees are computed at checkout from method + destination and shown before you pay — the fee on the page is final.",
              "Track progress on the order page (pending → confirmed → packed → shipped → delivered); sellers update each step.",
              "Carts with items from several sellers split into per-seller suborders: each ships on its own timeline and can be disputed independently.",
              "Nobody home? Couriers attempt redelivery per the seller's policy, then the parcel returns to the seller — communicate through your order messages to avoid return fees.",
            ],
          },
        ],
      },
      {
        heading: "Restricted & bulky goods",
        blocks: [
          {
            type: "p",
            text: "Furniture, building materials, and farm inputs often need special transport — check the listing's delivery notes and message the seller for bulky-item quotes before checkout. Perishables, gas cylinders, and regulated goods ship only where the seller explicitly offers it.",
          },
          { type: "links", links: [{ href: "/returns", label: "Returns & Refunds" }, { href: "/shops", label: "Browse shops" }, { href: "/help", label: "Help Centre" }] },
        ],
      },
    ],
    related: [
      { href: "/returns", label: "Returns & Refunds" },
      { href: "/safety", label: "Buyer Safety" },
      { href: "/faq", label: "FAQs" },
    ],
  },

  prohibited: {
    title: "Prohibited Items",
    updated: UPDATED,
    intro:
      "These can never be listed on Chap — by law, by payment-provider rules, or because they enable harm. Detection is automatic screening plus human moderation; violations follow the enforcement ladder in Seller Guidelines.",
    sections: [
      {
        heading: "Illegal & dangerous goods",
        blocks: [
          {
            type: "list",
            items: [
              "Weapons, ammunition, explosives, and law-enforcement impersonation gear.",
              "Narcotics, unlicensed medicines, and illicit brews — licensed pharmacies/chemists may list only compliant over-the-counter ranges where the law allows.",
              "Counterfeit currency, fake documents/IDs, examination leaks, and stolen property (including 'no-logbook' vehicles and phones with tampered IMEIs).",
              "Wildlife products and live wild animals (Kenya Wildlife Service protections apply); hazardous chemicals, gas refills by unlicensed sellers, and recalled products.",
            ],
          },
        ],
      },
      {
        heading: "Fraud-prone & harmful offerings",
        blocks: [
          {
            type: "list",
            items: [
              "Counterfeit branded goods passed off as genuine; replica items must be labelled replica and can still be removed on rights-holder complaint.",
              "Pyramid/ponzi schemes, 'forex doubling' investments, fake jobs demanding fees, and loan sharks operating outside Central Bank of Kenya licensing.",
              "Adult services, personal data sales (SIM lists, contact databases), and surveillance tools marketed for spying on people.",
              "Alcohol and tobacco sales to minors; any listing must comply with Kenyan age and licensing law.",
            ],
          },
        ],
      },
      {
        heading: "Consequences & appeals",
        blocks: [
          {
            type: "p",
            text: "First offence typically means instant removal; fraud, counterfeits, and repeat offences mean suspension or permanent bans, with serious cases referred to law enforcement. If your legitimate listing was caught by mistake, appeal within 14 days — a different moderator re-reviews and restores genuine mistakes.",
          },
          { type: "links", links: [{ href: "/sellers", label: "Seller Guidelines" }, { href: "/safety", label: "Buyer Safety" }, { href: "/contact", label: "Appeal" }] },
        ],
      },
    ],
    related: [
      { href: "/sellers", label: "Seller Guidelines" },
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/safety", label: "Buyer Safety" },
    ],
  },

  advertising: {
    title: "Advertising on Chap",
    updated: UPDATED,
    intro:
      "Reach buyers at the moment they're comparing options: featured listings, sponsored placements, and campaigns for brands, suppliers, and local businesses. Paid visibility is always labelled — and never overrides safety.",
    sections: [
      {
        heading: "Boost rates & how to buy",
        blocks: [
          {
            type: "list",
            items: [
              "Featured · 7 days — KES 199 one-time. Featured badge on homepage, search and related rails for a full week.",
              "Featured · 14 days — KES 299 one-time. Two full weeks of Featured visibility.",
              "Featured · 30 days — KES 499 one-time. A full month up top — best value per day.",
              "How to buy: Dashboard → Promotion → pick a boost on any active listing with a photo → confirm the M-Pesa STK push. No plan needed; Silver/Gold shops can also use plan credits.",
              "Boosts start when payment is confirmed and stop automatically at expiry — cancel anytime from Promotion.",
            ],
          },
          { type: "links", links: [{ href: "/dashboard/promotion", label: "Boost a listing" }, { href: "/pricing", label: "Plans & pricing" }] },
        ],
      },
      {
        heading: "What you can run",
        blocks: [
          {
            type: "list",
            items: [
              "Featured listings: your classified or product pinned into deal rails and category tops, badged 'Featured'.",
              "Sponsored placements: clearly-labelled slots in search and 'Related from other sellers' rails — marked 'Sponsored', ranked below safety and relevance guards.",
              "Business campaigns: homepage merchandising, category takeovers, and collection pages for launches and seasons (Back to School, Black November, harvest inputs).",
              "Shop subscriptions (Silver/Gold) bundle promotion credits, analytics, and bulk tools — start with the plan, add campaigns as you grow.",
            ],
          },
        ],
      },
      {
        heading: "Rules that keep ads honest",
        blocks: [
          {
            type: "list",
            items: [
              "Every paid slot is labelled. Anything presented as an organic recommendation genuinely is one.",
              "Ads must meet all Seller Guidelines: genuine prices, real photos, lawful products. Prohibited items can't be promoted at any price.",
              "No targeting children, no personal-data-based targeting beyond on-site categories, and frequency caps so shoppers aren't stalked.",
              "We report impressions, clicks, enquiries, and attributed orders — vanity metrics alone don't count as performance.",
            ],
          },
          { type: "links", links: [{ href: "/pricing", label: "Plans & pricing" }, { href: "/sellers", label: "Seller Guidelines" }, { href: "/contact", label: "Talk to us" }] },
        ],
      },
    ],
    related: [
      { href: "/pricing", label: "Business plans" },
      { href: "/start-selling", label: "Sell on Chap" },
      { href: "/sellers", label: "Seller Guidelines" },
    ],
  },
};
