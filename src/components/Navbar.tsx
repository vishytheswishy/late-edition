"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/context/CartContext";

// Official-glyph SVGs, drawn as a single solid path in currentColor so they
// match the site's monochrome editorial palette. Keep dimensions in sync with
// the label's line-height.
const InstagramIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.71 3.71 0 0 1-1.38-.9 3.71 3.71 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.85 5.85 0 0 0-2.13 1.38A5.85 5.85 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12c0 3.26.01 3.67.07 4.95.06 1.27.26 2.15.56 2.91a5.85 5.85 0 0 0 1.38 2.13 5.85 5.85 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24c3.26 0 3.67-.01 4.95-.07 1.27-.06 2.15-.26 2.91-.56a5.85 5.85 0 0 0 2.13-1.38 5.85 5.85 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.85 5.85 0 0 0-1.38-2.13A5.85 5.85 0 0 0 19.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84ZM12 16a4 4 0 1 1 4-4 4 4 0 0 1-4 4Zm6.4-11.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44Z" />
  </svg>
);

const YouTubeIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6Z" />
  </svg>
);

const TikTokIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M19.6 6.4a5.7 5.7 0 0 1-3.4-1.1 5.6 5.6 0 0 1-2.2-3.7h-3.6v13.1a3 3 0 1 1-3-3 3 3 0 0 1 .9.1V8.2a6.6 6.6 0 1 0 5.7 6.6V8.6a8.9 8.9 0 0 0 5.6 1.9Z" />
  </svg>
);

export default function Navbar() {
  const [isSocialsOpen, setIsSocialsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLiveHovered, setIsLiveHovered] = useState(false);
  const [liveStatus, setLiveStatus] = useState<{
    isLive: boolean;
    videoId: string | null;
    title: string | null;
  }>({ isLive: false, videoId: null, title: null });
  const socialsButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const liveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { cart, setCartOpen } = useCart();
  const itemCount = cart?.totalQuantity ?? 0;

  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Check YouTube live status once per session (on mount only)
  useEffect(() => {
    let cancelled = false;

    fetch("/api/youtube/live")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && !cancelled) setLiveStatus(data);
      })
      .catch(() => {
        // Silently fail — indicator just won't show
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLiveMouseEnter = useCallback(() => {
    if (liveTimeoutRef.current) clearTimeout(liveTimeoutRef.current);
    setIsLiveHovered(true);
  }, []);

  const handleLiveMouseLeave = useCallback(() => {
    liveTimeoutRef.current = setTimeout(() => setIsLiveHovered(false), 200);
  }, []);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        socialsButtonRef.current &&
        !socialsButtonRef.current.contains(event.target as Node)
      ) {
        setIsSocialsOpen(false);
      }
    };

    if (isSocialsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSocialsOpen]);

  const getDropdownPosition = () => {
    if (!socialsButtonRef.current) return { top: 0, right: 0 };
    const rect = socialsButtonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 12,
      right: window.innerWidth - rect.right,
    };
  };

  const dropdownContent = isSocialsOpen && mounted ? (
    <>
      <div
        className="fixed inset-0 z-[9998]"
        onClick={() => setIsSocialsOpen(false)}
      />
      <div
        ref={dropdownRef}
        className="fixed z-[9999] w-40 border border-black/20 backdrop-blur-md bg-white/80"
        style={getDropdownPosition()}
      >
        <a
          href="https://www.instagram.com/lateedition.mag/?hl=en"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 border-b border-black/20 px-3 py-2 text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50"
        >
          <InstagramIcon className="w-3.5 h-3.5 shrink-0" />
          Instagram
        </a>
        <a
          href="https://www.youtube.com/@LateEditionLive"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 border-b border-black/20 px-3 py-2 text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50"
        >
          <YouTubeIcon className="w-3.5 h-3.5 shrink-0" />
          YouTube
        </a>
        <a
          href="https://www.tiktok.com/@late.edition"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2 text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50"
        >
          <TikTokIcon className="w-3.5 h-3.5 shrink-0" />
          TikTok
        </a>
      </div>
    </>
  ) : null;

  return (
    <>
      <nav className="w-full border-b border-black/10 bg-white/60 backdrop-blur-xl" style={{ willChange: 'auto' }}>
        {/* ─── Desktop navbar (md+) ─── */}
        <div className="relative hidden md:flex items-center justify-between w-full px-6 py-8 lg:px-8">
          {/* Left side */}
          <div className="flex items-center justify-start gap-6 lg:gap-8 flex-1">
            <Link href="/events" className="text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50">Events</Link>
            <Link href="/music" className="text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50">Music</Link>
            <Link href="/photos" className="text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50">Photos</Link>
            <Link href="/articles" className="text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50">Articles</Link>
          </div>

          {/* Center - Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <Link href="/#lookbook" className="relative overflow-hidden w-[220px] h-[36px]">
              <Image src="/logo.png" alt="Late Edition" fill className="object-cover mix-blend-multiply" style={{ objectPosition: '50% 44%' }} sizes="220px" priority />
            </Link>
            {liveStatus.isLive && (
              <div className="relative flex items-center" onMouseEnter={handleLiveMouseEnter} onMouseLeave={handleLiveMouseLeave}>
                <a
                  href={liveStatus.videoId ? `https://www.youtube.com/watch?v=${liveStatus.videoId}` : "https://www.youtube.com/@LateEditionLive"}
                  target="_blank" rel="noopener noreferrer"
                  className="relative flex items-center justify-center w-4 h-4 cursor-pointer" aria-label="Live on YouTube"
                >
                  <span className="absolute inline-flex h-2 w-2 rounded-full bg-red-500 opacity-75 animate-[live-ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-red-500" />
                </a>
                <div
                  className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 transition-all duration-200 ${isLiveHovered ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"}`}
                  onMouseEnter={handleLiveMouseEnter} onMouseLeave={handleLiveMouseLeave}
                >
                  <a
                    href={liveStatus.videoId ? `https://www.youtube.com/watch?v=${liveStatus.videoId}` : "https://www.youtube.com/@LateEditionLive"}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 whitespace-nowrap border border-black/20 backdrop-blur-md bg-white/80 px-3 py-1.5 text-[10px] uppercase tracking-wider text-black transition-opacity hover:opacity-50"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-[live-ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                    </span>
                    Live on YouTube
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center justify-end gap-6 lg:gap-8 flex-1">
            <Link href="/shop" className="text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50">Shop</Link>
            <Link href="/about" className="text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50">About</Link>
            <Link href="/contact" className="text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50">Contact</Link>
            <div className="relative flex items-center">
              <button ref={socialsButtonRef} onClick={() => setIsSocialsOpen(!isSocialsOpen)} className="text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50">Socials</button>
            </div>
            <button onClick={() => setCartOpen(true)} className="relative text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50" aria-label="Open cart">
              Cart
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-3 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-medium bg-black text-white rounded-full leading-none">{itemCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* ─── Mobile navbar (<md) ─── */}
        <div className="flex md:hidden items-center justify-between w-full px-4 py-4">
          {/* Hamburger button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex flex-col justify-center items-center w-8 h-8 gap-[5px]"
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-[1.5px] bg-black transition-all duration-300 ${isMobileMenuOpen ? "translate-y-[6.5px] rotate-45" : ""}`} />
            <span className={`block w-5 h-[1.5px] bg-black transition-all duration-300 ${isMobileMenuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-[1.5px] bg-black transition-all duration-300 ${isMobileMenuOpen ? "-translate-y-[6.5px] -rotate-45" : ""}`} />
          </button>

          {/* Center - Logo */}
          <Link href="/#lookbook" className="relative overflow-hidden w-[140px] h-[24px]">
            <Image src="/logo.png" alt="Late Edition" fill className="object-cover mix-blend-multiply" style={{ objectPosition: '50% 44%' }} sizes="140px" priority />
          </Link>

          {/* Cart button */}
          <button onClick={() => setCartOpen(true)} className="relative w-8 h-8 flex items-center justify-center text-[10px] uppercase tracking-wider text-black transition-opacity hover:opacity-50" aria-label="Open cart">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-medium bg-black text-white rounded-full leading-none">{itemCount}</span>
            )}
          </button>
        </div>
      </nav>

      {/* ─── Mobile fullscreen menu ─── */}
      {mounted && createPortal(
        <div
          className={`fixed inset-0 z-[9990] bg-white transition-all duration-300 md:hidden flex flex-col ${isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          style={{ top: 0 }}
        >
          {/* Header with close button */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-black/10">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex flex-col justify-center items-center w-8 h-8 gap-[5px]"
              aria-label="Close menu"
            >
              <span className="block w-5 h-[1.5px] bg-black translate-y-[6.5px] rotate-45 transition-all duration-300" />
              <span className="block w-5 h-[1.5px] bg-black opacity-0 transition-all duration-300" />
              <span className="block w-5 h-[1.5px] bg-black -translate-y-[6.5px] -rotate-45 transition-all duration-300" />
            </button>
            <Link href="/#lookbook" className="relative overflow-hidden w-[140px] h-[24px]" onClick={() => setIsMobileMenuOpen(false)}>
              <Image src="/logo.png" alt="Late Edition" fill className="object-cover mix-blend-multiply" style={{ objectPosition: '50% 44%' }} sizes="140px" priority />
            </Link>
            <div className="w-8" />
          </div>

          {/* Nav links */}
          <div className="flex-1 flex flex-col justify-center items-center gap-6 px-4">
            {[
              { href: "/events", label: "Events" },
              { href: "/music", label: "Music" },
              { href: "/photos", label: "Photos" },
              { href: "/articles", label: "Articles" },
              { href: "/shop", label: "Shop" },
              { href: "/about", label: "About" },
              { href: "/contact", label: "Contact" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-sm uppercase tracking-[0.2em] transition-opacity hover:opacity-50 ${pathname === href ? "text-black font-medium" : "text-black/70"}`}
              >
                {label}
              </Link>
            ))}

            {/* Live indicator in mobile menu */}
            {liveStatus.isLive && (
              <a
                href={liveStatus.videoId ? `https://www.youtube.com/watch?v=${liveStatus.videoId}` : "https://www.youtube.com/@LateEditionLive"}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-black/70 transition-opacity hover:opacity-50"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-[live-ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                Live
              </a>
            )}
          </div>

          {/* Footer socials */}
          <div className="flex items-center justify-center gap-8 py-8 border-t border-black/10">
            <a href="https://www.instagram.com/lateedition.mag/?hl=en" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-black/50 transition-opacity hover:opacity-50">
              <InstagramIcon className="w-5 h-5" />
            </a>
            <a href="https://www.youtube.com/@LateEditionLive" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-black/50 transition-opacity hover:opacity-50">
              <YouTubeIcon className="w-5 h-5" />
            </a>
            <a href="https://www.tiktok.com/@late.edition" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-black/50 transition-opacity hover:opacity-50">
              <TikTokIcon className="w-5 h-5" />
            </a>
          </div>
        </div>,
        document.body
      )}

      {mounted && createPortal(dropdownContent, document.body)}
    </>
  );
}

