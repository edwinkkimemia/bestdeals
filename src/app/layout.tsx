import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CartProvider } from "@/components/cart-provider";
import { currentUser } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://chap.co.ke"),
  title: {
    default: "chap.co.ke — Kenya's Marketplace for Everything",
    template: "%s | chap.co.ke",
  },
  description:
    "Discover great deals, shop trusted businesses, buy and sell new or pre-owned items, and find services across Kenya.",
  icons: { icon: "/fav.png", apple: "/fav.png" },
  openGraph: {
    type: "website",
    siteName: "chap.co.ke",
    title: "chap.co.ke — Everything You Need. All in One Place.",
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
