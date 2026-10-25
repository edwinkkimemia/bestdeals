import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Chrome } from "@/components/layout/chrome";
import { Footer } from "@/components/layout/footer";
import { AdScript, AnchorAd, ConsentBanner } from "@/components/ads";
import { AD_SLOTS, ADSENSE_CLIENT_ID, adsEnabled } from "@/lib/ads";
import { CartProvider } from "@/components/cart-provider";
import { currentUser } from "@/lib/auth";
import { storeRead } from "@/lib/store";
import { getCategories } from "@/lib/categories";
import { CATEGORIES } from "@/data/catalog";
import { websiteJsonLd } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport: Viewport = {
  themeColor: "#0043D2",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://chap.co.ke"),
  title: {
    default: "chap.co.ke — Kenya's Marketplace for Everything",
    template: "%s | chap.co.ke",
  },
  description:
    "Discover great deals, shop trusted businesses, buy and sell new or pre-owned items, and find services across Kenya.",
  icons: { icon: "/fav.png", apple: "/fav.png" },
  manifest: "/manifest.webmanifest",
  other: { "google-adsense-account": "ca-pub-1165378217849279" },
  openGraph: {
    type: "website",
    locale: "en_KE",
    siteName: "chap.co.ke",
    title: "chap.co.ke — Everything You Need. All in One Place.",
    description: "Shop products, classifieds, business shops and local services across Kenya.",
    images: [{ url: "/chaplogo.png", width: 1147, height: 287, alt: "chap.co.ke — Kenya's marketplace" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "chap.co.ke — Kenya's Marketplace for Everything",
    description: "Shop products, classifieds, business shops and local services across Kenya.",
    images: ["/chaplogo.png"],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser().catch(() => null);
  const categories = await getCategories().catch(() => CATEGORIES);
  const savedCounty = user
    ? await storeRead(async (s) => {
        const value = await s.getSetting(`location:${user.id}`).catch(() => null);
        return typeof value === "string" ? value : null;
      }, null)
    : null;
  // Site-wide announcement bar (Admin → Settings). Silent when disabled/unset.
  const announcement = await storeRead(async (s) => {
    const [enabled, text] = await Promise.all([
      s.getSetting("announcement_enabled").catch(() => null),
      s.getSetting("announcement_text").catch(() => null),
    ]);
    const on = enabled === "1" || enabled === true;
    const msg = typeof text === "string" ? text.trim() : "";
    return on && msg ? msg.slice(0, 200) : null;
  }, null);
  return (
    <html lang="en-KE">
      <body className={`${inter.variable} font-sans`}>
        {adsEnabled() && (
          <>
            <script dangerouslySetInnerHTML={{ __html: "window.adsbygoogle=window.adsbygoogle||[];window.adsbygoogle.requestNonPersonalizedAds=1;" }} />
            <script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
              crossOrigin="anonymous"
            />
          </>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }} />
        <CartProvider>
          <Chrome
            user={user ? { name: user.name, role: user.role } : null}
            adminUser={user ? { name: user.name, email: user.email } : null}
            announcement={announcement}
            categories={categories}
            initialCounty={savedCounty}
            footer={<Footer />}
          >
            {children}
          </Chrome>
          <AnchorAd slot={AD_SLOTS.anchor} />
          <ConsentBanner />
        </CartProvider>
        <AdScript />
      </body>
    </html>
  );
}
