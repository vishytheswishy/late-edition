"use client";

import LookbookLayout from "./LookbookLayout";
import Events from "./Events";
import { useState, useEffect } from "react";
import type { EventMeta } from "@/lib/events";

export default function Home({
  lookbookImages,
  events,
}: {
  lookbookImages: string[];
  events: EventMeta[];
}) {
  const [showPointer, setShowPointer] = useState(true);

  const handleScrollToEvents = () => {
    const eventsSection = document.getElementById("events");
    if (eventsSection) {
      eventsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      setShowPointer(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const eventsSection = document.getElementById("events");
      if (eventsSection) {
        const rect = eventsSection.getBoundingClientRect();
        // Hide pointer if events section is visible
        if (rect.top < window.innerHeight * 0.8) {
          setShowPointer(false);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Shorter than the viewport on mobile so the events section peeks
          above the fold and it is clear the page scrolls */}
      {/* Mobile: the scene runs full-bleed under the glass navbar
          (pt-0). md+ padding matches the slim navbar's real height
          (32px padding + 36px logo + 1px border = 69px) */}
      <section className="h-[94svh] md:h-screen bg-white flex flex-col overflow-hidden pt-0 md:pt-[69px] relative">
        <div className="flex-1 overflow-hidden">
          <LookbookLayout images={lookbookImages} />
        </div>
        {showPointer && (
          <button
            onClick={handleScrollToEvents}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 cursor-pointer animate-bounce"
            aria-label="Scroll to events"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-black"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>
        )}
      </section>
      <Events events={events} />
    </div>
  );
}

