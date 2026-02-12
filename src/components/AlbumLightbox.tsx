"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Album } from "@/lib/albums";

export default function AlbumLightbox({
  album,
  loading,
  onClose,
}: {
  album: Album | null;
  loading: boolean;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on click outside the content area
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-[60] w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-xl"
        aria-label="Close"
      >
        &times;
      </button>

      {/* Content */}
      <div className="w-full max-w-5xl mx-4 my-16 sm:my-20">
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {!loading && album && (
          <>
            {/* Header */}
            <header className="mb-8 text-center">
              <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-white">
                {album.title}
              </h2>
              {album.description && (
                <p className="text-base text-white/50 mt-3 max-w-2xl mx-auto">
                  {album.description}
                </p>
              )}
              <p className="text-xs text-white/30 mt-2">
                {album.photos.length}{" "}
                {album.photos.length === 1 ? "photo" : "photos"}
                {" \u00B7 "}
                {new Date(album.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </header>

            {/* Photo grid - masonry columns */}
            {album.photos.length === 0 ? (
              <p className="text-sm text-white/40 text-center">
                No photos in this album yet.
              </p>
            ) : (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                {album.photos.map((photo, index) => (
                  <div
                    key={`${photo.url}-${index}`}
                    className="break-inside-avoid"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || `Photo ${index + 1}`}
                      className="w-full rounded-lg"
                    />
                    {photo.caption && (
                      <p className="text-sm text-white/50 mt-2 mb-4">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && !album && (
          <div className="flex items-center justify-center py-32">
            <p className="text-white/40 text-sm">Failed to load album.</p>
          </div>
        )}
      </div>
    </div>
  );
}
