"use client";

import dynamic from "next/dynamic";
import type { Album } from "@/lib/albums";

const PhotoAlbums = dynamic(() => import("@/components/PhotoAlbums"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
      <style>{`
        @keyframes bookOpenSimple {
          0%, 10%, 90%, 100% { transform: rotateY(0deg); }
          30%, 70% { transform: rotateY(-160deg); }
        }
      `}</style>
      <div style={{ perspective: 500 }}>
        <div
          className="relative w-10 h-[52px]"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="absolute inset-0 rounded-r bg-[#2a1a0a] shadow-lg" />
          <div className="absolute top-0.5 bottom-0.5 left-0 right-1.5 rounded-r-sm bg-[#f5f0e8]" />
          <div
            className="absolute inset-0 rounded-r bg-[#1a1a2a] shadow-md"
            style={{
              transformOrigin: "left",
              animation: "bookOpenSimple 3s ease-in-out infinite",
              backfaceVisibility: "hidden",
            }}
          />
        </div>
      </div>
    </div>
  ),
});

export default function PhotoAlbumsClient({ albums }: { albums: Album[] }) {
  return <PhotoAlbums albums={albums} />;
}
