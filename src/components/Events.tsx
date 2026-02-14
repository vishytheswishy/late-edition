"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { EventMeta } from "@/lib/events";

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

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
    <section
      id="events"
      className="w-full bg-white py-16 md:py-24 px-4 md:px-6 lg:px-8 scroll-mt-20"
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-baseline justify-between mb-10 md:mb-14">
          <h2 className="text-3xl md:text-5xl font-light tracking-tight text-black">
            Events
          </h2>
          {events.length > 0 && (
            <Link
              href="/events"
              className="text-[10px] uppercase tracking-[0.2em] text-black/40 hover:text-black/70 transition-colors"
            >
              View All
            </Link>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <p className="text-[10px] uppercase tracking-widest text-black/30">
              Loading...
            </p>
          </div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-black/40 font-light">
              No upcoming events
            </p>
            <p className="text-[10px] uppercase tracking-widest text-black/25 mt-2">
              Check back soon
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {events.slice(0, 3).map((event) => (
                <motion.div key={event.id} variants={itemVariants}>
                  <Link
                    href={`/events/${event.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-neutral-50 rounded-sm">
                      {event.coverImage ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={event.coverImage}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.04] transition-colors duration-300" />
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                          <svg
                            viewBox="0 0 120 80"
                            fill="none"
                            className="w-14"
                            aria-hidden
                          >
                            <rect
                              x="15"
                              y="20"
                              width="90"
                              height="55"
                              rx="4"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              className="text-black/15"
                              fill="none"
                            />
                            <line
                              x1="15"
                              y1="38"
                              x2="105"
                              y2="38"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              className="text-black/15"
                            />
                            <line
                              x1="40"
                              y1="10"
                              x2="40"
                              y2="28"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              className="text-black/15"
                            />
                            <line
                              x1="80"
                              y1="10"
                              x2="80"
                              y2="28"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              className="text-black/15"
                            />
                          </svg>
                          <span className="text-[10px] uppercase tracking-widest text-black/25">
                            No flyer
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-black/40 mb-1.5">
                        {new Date(event.createdAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <h3 className="text-base font-normal tracking-tight leading-snug text-black group-hover:text-black/70 transition-colors">
                        {event.title}
                      </h3>
                      {event.excerpt && (
                        <p className="text-sm text-black/50 font-light line-clamp-2 mt-1">
                          {event.excerpt}
                        </p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
