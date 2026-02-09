"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const [isSocialsOpen, setIsSocialsOpen] = useState(false);
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

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleEventsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const eventsSection = document.getElementById("events");
    if (eventsSection) {
      eventsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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
        className="fixed z-[9999] w-32 border border-black/20 backdrop-blur-md bg-white/80"
        style={getDropdownPosition()}
      >
        <a
          href="https://www.instagram.com/lateedition.mag/?hl=en"
          target="_blank"
          rel="noopener noreferrer"
          className="block border-b border-black/20 px-3 py-2 text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50"
        >
          Instagram
        </a>
        <a
          href="https://www.youtube.com/@LateEditionLive"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-3 py-2 text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50"
        >
          YouTube
        </a>
      </div>
    </>
  ) : null;

  return (
    <>
      <nav className="w-full border-b border-black/10 backdrop-blur-md bg-white/70" style={{ willChange: 'auto' }}>
        <div className="relative flex items-center justify-between w-full px-4 py-4 md:px-6 md:py-8 lg:px-8">
          {/* Left side - 4 items */}
          <div className="flex items-center justify-start gap-3 md:gap-6 lg:gap-8 flex-1">
            <a
              href="#events"
              onClick={handleEventsClick}
              className="text-[10px] md:text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50 cursor-pointer"
            >
              Events
            </a>
            <Link
              href="/music"
              className="text-[10px] md:text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50"
            >
              Music
            </Link>
            <Link
              href="/photos"
              className="text-[10px] md:text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50 hidden sm:inline-block"
            >
              Photos
            </Link>
            <Link
              href="/articles"
              className="text-[10px] md:text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50 hidden md:inline-block"
            >
              Articles
            </Link>
          </div>

          {/* Center - Late Edition */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <Link
              href="/#lookbook"
              className="relative overflow-hidden w-[160px] h-[28px] md:w-[220px] md:h-[36px]"
            >
              <Image
                src="/logo.png"
                alt="Late Edition"
                fill
                className="object-cover mix-blend-multiply"
                style={{ objectPosition: '50% 44%' }}
                sizes="(min-width: 768px) 220px, 160px"
                priority
              />
            </Link>
            {/* Live indicator — only visible when channel is streaming */}
            {liveStatus.isLive && (
              <div
                className="relative flex items-center"
                onMouseEnter={handleLiveMouseEnter}
                onMouseLeave={handleLiveMouseLeave}
              >
                <a
                  href={
                    liveStatus.videoId
                      ? `https://www.youtube.com/watch?v=${liveStatus.videoId}`
                      : "https://www.youtube.com/@LateEditionLive"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative flex items-center justify-center w-4 h-4 cursor-pointer"
                  aria-label="Live on YouTube"
                >
                  <span className="absolute inline-flex h-2 w-2 rounded-full bg-red-500 opacity-75 animate-[live-ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-red-500" />
                </a>
                {/* Hover tooltip */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 transition-all duration-200 ${
                    isLiveHovered
                      ? "opacity-100 translate-y-0 pointer-events-auto"
                      : "opacity-0 -translate-y-1 pointer-events-none"
                  }`}
                  onMouseEnter={handleLiveMouseEnter}
                  onMouseLeave={handleLiveMouseLeave}
                >
                  <a
                    href={
                      liveStatus.videoId
                        ? `https://www.youtube.com/watch?v=${liveStatus.videoId}`
                        : "https://www.youtube.com/@LateEditionLive"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
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

          {/* Right side - 3 items + socials dropdown */}
          <div className="flex items-center justify-end gap-3 md:gap-6 lg:gap-8 flex-1">
            <Link
              href="/shop"
              className="text-[10px] md:text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50"
            >
              Shop
            </Link>
            <Link
              href="/about"
              className="text-[10px] md:text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50 hidden sm:inline-block"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-[10px] md:text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50 hidden md:inline-block"
            >
              Contact
            </Link>
            <div className="relative flex items-center">
              <button
                ref={socialsButtonRef}
                onClick={() => setIsSocialsOpen(!isSocialsOpen)}
                className="text-[10px] md:text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50"
              >
                Socials
              </button>
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="relative text-[10px] md:text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50"
              aria-label="Open cart"
            >
              Cart
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-3 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-medium bg-black text-white rounded-full leading-none">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
      {mounted && createPortal(dropdownContent, document.body)}
    </>
  );
}

