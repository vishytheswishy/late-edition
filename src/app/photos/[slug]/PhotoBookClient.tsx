"use client";

import dynamic from "next/dynamic";
import type { AlbumPhoto } from "@/lib/albums";

const PhotoBook = dynamic(() => import("@/components/PhotoBook"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-xs uppercase tracking-wider text-black/40">
        Preparing album...
      </p>
    </div>
  ),
});

export default function PhotoBookClient({
  title,
  coverImage,
  photos,
}: {
  title: string;
  coverImage: string | null;
  photos: AlbumPhoto[];
}) {
  return <PhotoBook title={title} coverImage={coverImage} photos={photos} />;
}
