"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  images: string[];
  title: string;
}

export default function ArticleCarousel({ images, title }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 4);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }, []);

  return (
    <div className="relative group">
      <div
        ref={trackRef}
        className="flex gap-3 px-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${i}`}
            src={src}
            alt={`${title} — photo ${i + 1}`}
            loading={i < 2 ? "eager" : "lazy"}
            className="h-[28rem] md:h-[36rem] w-auto object-cover rounded-lg flex-shrink-0 snap-center"
          />
        ))}
        <div className="flex-shrink-0 w-1" aria-hidden="true" />
      </div>

      <button
        type="button"
        onClick={() => scrollBy(-1)}
        disabled={!canScrollPrev}
        aria-label="Previous image"
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full bg-white/85 backdrop-blur border border-black/10 shadow-sm text-black/70 hover:bg-white hover:text-black transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:pointer-events-none"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => scrollBy(1)}
        disabled={!canScrollNext}
        aria-label="Next image"
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full bg-white/85 backdrop-blur border border-black/10 shadow-sm text-black/70 hover:bg-white hover:text-black transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:pointer-events-none"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
