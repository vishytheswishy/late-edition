"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { EventMeta } from "@/lib/events";

export default function Events() {
  const [events, setEvents] = useState<EventMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  return (
    <section id="events" className="w-full min-h-screen bg-white py-16 md:py-24 px-4 md:px-6 lg:px-8 scroll-mt-20">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-4xl uppercase tracking-wider text-black mb-8 md:mb-12">
          Events
        </h2>
        <div className="space-y-8 md:space-y-12">
          {loading ? (
            <div className="border-b border-black/10 pb-8">
              <p className="text-sm md:text-base uppercase tracking-wider text-black/40">
                Loading events...
              </p>
            </div>
          ) : events.length === 0 ? (
            <div className="border-b border-black/10 pb-8">
              <p className="text-sm md:text-base uppercase tracking-wider text-black/60">
                No upcoming events
              </p>
            </div>
          ) : (
            events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="block border-b border-black/10 pb-8 group"
              >
                <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                  {event.coverImage && (
                    <div className="w-full md:w-64 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.coverImage}
                        alt={event.title}
                        className="w-full h-48 md:h-40 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-wider text-black/40 mb-2">
                      {new Date(event.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <h3 className="text-lg md:text-2xl uppercase tracking-wider text-black group-hover:text-black/70 transition-colors">
                      {event.title}
                    </h3>
                    {event.excerpt && (
                      <p className="text-sm md:text-base text-black/60 mt-2 line-clamp-2">
                        {event.excerpt}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
