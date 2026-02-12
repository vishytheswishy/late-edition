"use client";

import dynamic from "next/dynamic";
import type { AlbumPhoto } from "@/lib/albums";

const PhotoBook = dynamic(() => import("@/components/PhotoBook"), {
  ssr: false,
  // Plain background during JS chunk download — the transition overlay
  // (if active) covers this, and PhotoBook handles its own loading text.
  loading: () => <div className="min-h-screen bg-[#fafafa]" />,
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
