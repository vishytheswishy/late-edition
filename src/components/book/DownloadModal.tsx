"use client";

import type { AlbumPhoto } from "@/lib/albums";
import type { GridCell } from "./types";
import { CANVAS_W, CANVAS_H } from "./constants";

export function detectPhotoAtClick(
  clickX: number,
  clickY: number,
  imgRect: DOMRect,
  photos: AlbumPhoto[],
  cells: GridCell[]
): AlbumPhoto | null {
  if (photos.length === 0 || cells.length === 0) return null;

  const nx = (clickX - imgRect.left) / imgRect.width;
  const ny = (clickY - imgRect.top) / imgRect.height;
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;

  const canvasX = nx * CANVAS_W;
  const canvasY = ny * CANVAS_H;

  for (let i = 0; i < cells.length && i < photos.length; i++) {
    const c = cells[i];
    if (
      canvasX >= c.x &&
      canvasX <= c.x + c.w &&
      canvasY >= c.y &&
      canvasY <= c.y + c.h
    ) {
      return photos[i];
    }
  }
  return null;
}

export default function DownloadModal({
  photo,
  onClose,
}: {
  photo: AlbumPhoto;
  onClose: () => void;
}) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = photo.url;
    a.download = photo.caption || "photo";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl max-h-[85vh] mx-4 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.caption || "Photo"}
          className="max-h-[70vh] w-auto object-contain rounded-lg"
        />
        {photo.caption && (
          <p className="text-sm text-white/70 font-light mt-3 text-center">
            {photo.caption}
          </p>
        )}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleDownload}
            className="px-5 py-2.5 rounded-full bg-white text-black text-xs uppercase tracking-wider hover:bg-white/90 transition-colors"
          >
            Download
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-white/30 text-white text-xs uppercase tracking-wider hover:border-white/60 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
