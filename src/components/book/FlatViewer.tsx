"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AlbumPhoto } from "@/lib/albums";
import type { FaceData, PageData } from "./types";
import { ControlBar } from "./ControlBar";
import DownloadModal, { detectPhotoAtClick } from "./DownloadModal";

export default function FlatPageViewer({
  title,
  pageDataList,
  onExpand,
  onBack,
}: {
  title: string;
  pageDataList: PageData[];
  onExpand: () => void;
  onBack: () => void;
}) {
  const [faceIndex, setFaceIndex] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<AlbumPhoto | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const faces = useMemo(() => {
    const list: FaceData[] = [];
    for (let i = 0; i < pageDataList.length; i++) {
      if (pageDataList[i].front) {
        list.push({
          dataUrl: pageDataList[i].frontDataUrl,
          label: i === 0 ? "Cover" : `Page ${i * 2 - 1}`,
          photos: pageDataList[i].frontPhotos,
          cells: pageDataList[i].frontCells,
        });
      }
      if (pageDataList[i].back) {
        list.push({
          dataUrl: pageDataList[i].backDataUrl,
          label:
            i === pageDataList.length - 1 ? "Back Cover" : `Page ${i * 2}`,
          photos: pageDataList[i].backPhotos,
          cells: pageDataList[i].backCells,
        });
      }
    }
    return list;
  }, [pageDataList]);

  const totalFaces = faces.length;
  const lastFace = totalFaces - 1;

  const handleImgClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      const face = faces[faceIndex];
      if (!face || !imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const photo = detectPhotoAtClick(
        e.clientX,
        e.clientY,
        rect,
        face.photos,
        face.cells
      );
      if (photo) setSelectedPhoto(photo);
    },
    [faces, faceIndex]
  );

  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 50) {
        if (dx < 0 && faceIndex < lastFace) setFaceIndex((i) => i + 1);
        if (dx > 0 && faceIndex > 0) setFaceIndex((i) => i - 1);
      }
    },
    [faceIndex, lastFace]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight")
        setFaceIndex((i) => Math.min(i + 1, lastFace));
      if (e.key === "ArrowLeft") setFaceIndex((i) => Math.max(i - 1, 0));
      if (e.key === "Escape") setSelectedPhoto(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lastFace]);

  const handleSetFace = useCallback(
    (f: number) => {
      setFaceIndex(Math.max(0, Math.min(f, lastFace)));
    },
    [lastFace]
  );

  return (
    <div className="h-screen bg-[#fafafa] flex flex-col overflow-hidden">
      <div
        className="flex-1 flex items-center justify-center px-4 pt-14 md:pt-[4.5rem]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {faces[faceIndex] && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            ref={imgRef}
            src={faces[faceIndex].dataUrl}
            alt={faces[faceIndex].label}
            className="max-h-[60vh] md:max-h-[70vh] w-auto object-contain rounded-sm shadow-lg cursor-pointer"
            draggable={false}
            onClick={handleImgClick}
          />
        )}
      </div>

      <div className="pb-4 md:pb-6">
        <ControlBar
          title={title}
          page={faceIndex}
          totalPages={lastFace}
          onSetPage={handleSetFace}
          toggleLabel="View 3D"
          onToggle={onExpand}
          showNav
          backLabel="Albums"
          onBack={onBack}
        />
      </div>

      {selectedPhoto && (
        <DownloadModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  );
}
