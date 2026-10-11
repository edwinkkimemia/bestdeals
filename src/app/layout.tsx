import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CartProvider } from "@/components/cart-provider";
import { currentUser } from "@/lib/auth";
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
  alternates: { canonical: "https://chap.co.ke/" },
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
  return (
    <html lang="en-KE">
      <body className={`${inter.variable} font-sans`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }} />
        <CartProvider>
          <Header user={user ? { name: user.name, role: user.role } : null} />
          <main className="min-h-[60vh]">{children}</main>
          <Footer />
          <BottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
