"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { EventMeta } from "@/lib/events";

// ── Animation variants ──

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
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

// ── Component ──

interface EventsGalleryProps {
  events: EventMeta[];
}

export default function EventsGallery({ events }: EventsGalleryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      {/* ── Hero ── */}
      <section className="relative w-full border-b border-black/10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center py-10 md:py-14">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[10px] uppercase tracking-[0.3em] text-black/40 mb-3"
            >
              What&apos;s Happening
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-3xl md:text-4xl font-light tracking-tight text-black"
            >
              Events
            </motion.h1>
          </div>
        </div>
      </section>

      {/* ── Gallery ── */}
      <section className="relative w-full">
        <div className="container mx-auto px-4">
          {events.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-40 md:py-52">
              <svg
                viewBox="0 0 120 80"
                fill="none"
                className="w-24 md:w-32 mb-8"
                aria-hidden
              >
                {/* Calendar icon */}
                <rect
                  x="15"
                  y="20"
                  width="90"
                  height="55"
                  rx="4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-black/20"
                  fill="none"
                />
                <line
                  x1="15"
                  y1="38"
                  x2="105"
                  y2="38"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-black/20"
                />
                <line
                  x1="40"
                  y1="10"
                  x2="40"
                  y2="28"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-black/20"
                />
                <line
                  x1="80"
                  y1="10"
                  x2="80"
                  y2="28"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-black/20"
                />
              </svg>
              <p className="text-sm text-black/40 font-light">
                Nothing on the calendar yet.
              </p>
              <p className="text-[10px] uppercase tracking-widest text-black/25 mt-2">
                Check back soon
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="py-8 md:py-16 max-w-5xl mx-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                {events.map((event) => {
                  const isHovered = hoveredId === event.id;

                  return (
                    <motion.div
                      key={event.id}
                      variants={itemVariants}
                      className="relative"
                      onMouseEnter={() => setHoveredId(event.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <Link
                        href={`/events/${event.slug}`}
                        className="group block"
                      >
                        {/* Event flyer image */}
                        <div className="relative aspect-square w-full overflow-hidden bg-neutral-50 rounded-sm">
                          {event.coverImage ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={event.coverImage}
                                alt={event.title}
                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                              />

                              {/* Hover overlay */}
                              <AnimatePresence>
                                {isHovered && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute inset-0 bg-black/[0.04] flex items-end justify-center pb-6"
                                  >
                                    <span className="text-[10px] uppercase tracking-[0.2em] text-black/60 bg-white/80 backdrop-blur-sm px-5 py-2.5 border border-black/10">
                                      View Event
                                    </span>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                              <svg
                                viewBox="0 0 120 80"
                                fill="none"
                                className="w-16 md:w-20"
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

                        {/* Event info */}
                        <div className="pt-4 pb-2">
                          <p className="text-[10px] uppercase tracking-[0.15em] text-black/40 mb-1.5">
                            {new Date(event.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </p>
                          <h2 className="text-base md:text-lg font-normal tracking-tight leading-snug text-black group-hover:text-black/70 transition-colors">
                            {event.title}
                          </h2>
                          {event.excerpt && (
                            <p className="text-sm text-black/50 font-light line-clamp-2 mt-1">
                              {event.excerpt}
                            </p>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom spacer */}
        {events.length > 0 && <div className="pb-8 md:pb-16" />}
      </section>
    </div>
  );
}
