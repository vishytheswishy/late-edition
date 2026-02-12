"use client";

import dynamic from "next/dynamic";
import type { AlbumMeta } from "@/lib/albums";

const BookShelf = dynamic(() => import("./BookShelf"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[70vh] md:h-[80vh] flex items-center justify-center bg-[#fafafa]">
      <p className="text-xs uppercase tracking-wider text-black/40">
        Loading...
      </p>
    </div>
  ),
});

export default function PhotosClient({ albums }: { albums: AlbumMeta[] }) {
  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <div className="container mx-auto px-4 pt-10 pb-4">
        <h1 className="text-4xl font-light tracking-tight">Photos</h1>
        <p className="text-xs text-black/40 mt-2 tracking-wide">
          {albums.length} {albums.length === 1 ? "album" : "albums"} &middot;
          Click a book to explore
        </p>
      </div>

      {albums.length === 0 ? (
        <div className="container mx-auto px-4 py-16">
          <p className="text-sm text-black/60">
            No albums yet. Check back soon.
          </p>
        </div>
      ) : (
        <BookShelf albums={albums} />
      )}
    </div>
  );
}
