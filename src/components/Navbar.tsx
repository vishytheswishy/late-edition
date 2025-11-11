"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export default function Navbar() {
  const [isSocialsOpen, setIsSocialsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const socialsButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
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
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block border-b border-black/20 px-3 py-2 text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50"
        >
          Instagram
        </a>
        <a
          href="https://twitter.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block border-b border-black/20 px-3 py-2 text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50"
        >
          Twitter
        </a>
        <a
          href="https://facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-3 py-2 text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-50"
        >
          Facebook
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
          <div className="flex-shrink-0">
            <Link
              href="/#lookbook"
              className="text-sm md:text-lg font-normal tracking-tight text-black whitespace-nowrap"
            >
              LATE EDITION
            </Link>
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
          </div>
        </div>
      </nav>
      {mounted && createPortal(dropdownContent, document.body)}
    </>
  );
}

