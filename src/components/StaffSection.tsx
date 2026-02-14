"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StaffMember } from "@/lib/staff";

// ── Animation variants ──

const sectionVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

// ── Per-member slideshow card ──

function MemberSlideshow({ member }: { member: StaffMember }) {
  const images =
    member.photos.length > 0
      ? member.photos.map((p) => p.url)
      : member.coverImage
        ? [member.coverImage]
        : [];

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const advance = useCallback(() => {
    if (images.length <= 1) return;
    setCurrent((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goBack = useCallback(() => {
    if (images.length <= 1) return;
    setCurrent((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (images.length <= 1 || paused) return;
    const timer = setInterval(advance, 4000);
    return () => clearInterval(timer);
  }, [images.length, paused, advance]);

  return (
    <motion.div variants={cardVariants} className="group">
      {/* Image slideshow */}
      <div
        className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-50 rounded-sm"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {images.length > 0 ? (
          <>
            <AnimatePresence mode="wait">
              <motion.img
                key={`${member.id}-${current}`}
                src={images[current]}
                alt={`${member.name} – ${current + 1} of ${images.length}`}
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </AnimatePresence>

            {/* Prev / Next click zones (only when multiple images) */}
            {images.length > 1 && (
              <>
                <button
                  onClick={goBack}
                  className="absolute left-0 top-0 w-1/3 h-full z-10 cursor-w-resize"
                  aria-label="Previous photo"
                />
                <button
                  onClick={advance}
                  className="absolute right-0 top-0 w-1/3 h-full z-10 cursor-e-resize"
                  aria-label="Next photo"
                />
              </>
            )}

            {/* Dot indicators */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      i === current
                        ? "bg-white scale-110"
                        : "bg-white/50 hover:bg-white/70"
                    }`}
                    aria-label={`Go to photo ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] uppercase tracking-widest text-black/25">
              No photo
            </span>
          </div>
        )}
      </div>

      {/* Name & role */}
      <div className="pt-4 pb-2">
        <h3 className="text-base md:text-lg font-normal tracking-tight leading-snug text-black">
          {member.name}
        </h3>
        {member.role && (
          <p className="text-[11px] uppercase tracking-[0.15em] text-black/40 mt-1">
            {member.role}
          </p>
        )}
        {member.bio && (
          <p className="text-sm text-black/50 font-light line-clamp-3 mt-2 leading-relaxed">
            {member.bio}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Section ──

interface StaffSectionProps {
  members: StaffMember[];
}

export default function StaffSection({ members }: StaffSectionProps) {
  if (members.length === 0) return null;

  return (
    <section className="mt-16 md:mt-20">
      <h2 className="text-2xl font-normal tracking-tight mb-8">The Team</h2>
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 md:gap-8"
      >
        {members.map((member) => (
          <MemberSlideshow key={member.id} member={member} />
        ))}
      </motion.div>
    </section>
  );
}
