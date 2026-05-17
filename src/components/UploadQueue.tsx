"use client";

import type { UploadItem } from "@/lib/useParallelUpload";

interface Props {
  items: UploadItem[];
  isUploading: boolean;
  onClearDone?: () => void;
}

const statusLabel: Record<UploadItem["status"], string> = {
  queued: "Queued",
  uploading: "Uploading",
  done: "Done",
  error: "Failed",
};

const statusColor: Record<UploadItem["status"], string> = {
  queued: "bg-black/30 text-white",
  uploading: "bg-black text-white",
  done: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
};

export default function UploadQueue({
  items,
  isUploading,
  onClearDone,
}: Props) {
  if (items.length === 0) return null;

  const done = items.filter((i) => i.status === "done").length;
  const errored = items.filter((i) => i.status === "error").length;
  const active = items.filter(
    (i) => i.status === "queued" || i.status === "uploading",
  ).length;

  return (
    <div className="border border-black/15 rounded bg-black/[0.02] p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-[0.25em] text-black/60">
          Upload queue · {done}/{items.length} done
          {errored > 0 && (
            <span className="ml-2 text-red-600">{errored} failed</span>
          )}
          {isUploading && (
            <span className="ml-2 text-black/40">{active} in flight</span>
          )}
        </p>
        {done > 0 && !isUploading && onClearDone && (
          <button
            type="button"
            onClick={onClearDone}
            className="text-[10px] uppercase tracking-[0.2em] text-black/50 hover:text-black"
          >
            Dismiss
          </button>
        )}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="relative aspect-square overflow-hidden bg-black/5 border border-black/10"
            title={item.error ?? item.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.preview}
              alt={item.name}
              className={`absolute inset-0 w-full h-full object-cover ${
                item.status === "error" || item.status === "queued"
                  ? "opacity-50"
                  : ""
              }`}
            />
            {item.status === "uploading" && (
              <div className="absolute inset-0 bg-black/20 animate-pulse" />
            )}
            <span
              className={`absolute bottom-0 inset-x-0 text-[9px] uppercase tracking-[0.15em] px-1 py-0.5 text-center ${statusColor[item.status]}`}
            >
              {statusLabel[item.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
