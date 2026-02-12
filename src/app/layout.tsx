import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";
import { MusicPlayerProvider } from "@/context/MusicPlayerContext";
import GlobalMiniPlayer from "@/components/GlobalMiniPlayer";
import { BookTransitionProvider } from "@/context/BookTransitionContext";

export const metadata: Metadata = {
  title: "Late Edition",
  description: "Late Edition",
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
            <BookTransitionProvider>
              <div className="fixed top-0 left-0 right-0 z-[100] will-change-auto" style={{ contain: 'layout style paint' }}>
                <Navbar />
              </div>
              {children}
              <Footer />
              <CartDrawer />
              <GlobalMiniPlayer />
            </BookTransitionProvider>
          </MusicPlayerProvider>
        </CartProvider>
      </body>
    </html>
  );
}
