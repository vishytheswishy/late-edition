import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";
import { MusicPlayerProvider } from "@/context/MusicPlayerContext";
import GlobalMiniPlayer from "@/components/GlobalMiniPlayer";
import { Analytics } from "@vercel/analytics/next";
export const metadata: Metadata = {
  title: "Late Edition",
  description: "Late Edition",
};

// Extend the page under the iPhone status bar so the glass navbar can
// fill it — otherwise iOS paints that strip with the white body
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased">
        <CartProvider>
          <MusicPlayerProvider>
            <div className="fixed top-0 left-0 right-0 z-[100] will-change-auto" style={{ contain: 'layout style paint' }}>
              <Navbar />
            </div>
            {children}
            <Footer />
            <CartDrawer />
            <GlobalMiniPlayer />
          </MusicPlayerProvider>
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
