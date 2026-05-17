"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  images: string[];
  onChange: (next: string[]) => void;
}

export default function GalleryUploader({ images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploadingCount(files.length);

      const fileArr = Array.from(files);
      const results = await Promise.all(
        fileArr.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          try {
            const res = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });
            if (!res.ok) throw new Error("Upload failed");
            const { url } = (await res.json()) as { url: string };
            return url;
          } catch {
            return null;
          }
        })
      );

      const fresh = results.filter((u): u is string => Boolean(u));
      if (fresh.length < fileArr.length) {
        alert(
          `${fileArr.length - fresh.length} image(s) failed to upload. Please retry.`
        );
      }
      if (fresh.length > 0) onChange([...images, ...fresh]);
      setUploadingCount(0);
    },
    [images, onChange]
  );

  const removeAt = useCallback(
    (idx: number) => {
      onChange(images.filter((_, i) => i !== idx));
    },
    [images, onChange]
  );

  const move = useCallback(
    (idx: number, dir: -1 | 1) => {
      const target = idx + dir;
      if (target < 0 || target >= images.length) return;
      const next = images.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      onChange(next);
    },
    [images, onChange]
  );

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative aspect-square rounded-lg overflow-hidden border border-black/10 bg-black/[0.02] group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />

              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
                {i + 1}
              </div>

              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded bg-white/90 text-black text-xs hover:bg-white transition-colors"
                aria-label="Remove image"
              >
                ×
              </button>

              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="h-6 w-6 rounded bg-white/90 text-black text-xs hover:bg-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="Move left"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === images.length - 1}
                  className="h-6 w-6 rounded bg-white/90 text-black text-xs hover:bg-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="Move right"
                >
                  ›
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploadingCount > 0}
        className="w-full px-4 py-6 border-2 border-dashed border-black/20 rounded-lg text-sm text-black/40 hover:border-black/30 hover:text-black/60 transition-colors disabled:opacity-50"
      >
        {uploadingCount > 0
          ? `Uploading ${uploadingCount} image${uploadingCount === 1 ? "" : "s"}…`
          : images.length === 0
            ? "Click to upload carousel images"
            : "Add more images"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
