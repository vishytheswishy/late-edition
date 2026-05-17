"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UploadStatus = "queued" | "uploading" | "done" | "error";

export interface UploadItem {
  id: string;
  name: string;
  preview: string;
  status: UploadStatus;
  url?: string;
  error?: string;
}

interface Options {
  /** Maximum number of in-flight uploads at once. */
  concurrency?: number;
  /** Endpoint that accepts a single `file` form field and returns `{ url }`. */
  endpoint?: string;
  /** Called for each successfully uploaded file in completion order. */
  onItemDone?: (url: string, file: File) => void;
}

/**
 * Drop-in parallel uploader. Hands /api/upload N files at a time and
 * surfaces per-item status so the UI can show a live queue. Replaces the
 * sequential `for (const file of files) await fetch(…)` patterns scattered
 * across the admin forms.
 */
export function useParallelUpload({
  concurrency = 6,
  endpoint = "/api/upload",
  onItemDone,
}: Options = {}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [active, setActive] = useState(0);
  // Keep the latest done-callback in a ref so the workers see fresh handlers
  // without us having to recreate `upload` on every render.
  const onItemDoneRef = useRef(onItemDone);
  onItemDoneRef.current = onItemDone;

  useEffect(() => {
    return () => {
      // Release object URLs on unmount so we don't leak.
      setItems((current) => {
        current.forEach((c) => URL.revokeObjectURL(c.preview));
        return current;
      });
    };
  }, []);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return [] as string[];

      const queued: (UploadItem & { file: File })[] = arr.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        preview: URL.createObjectURL(file),
        status: "queued",
        file,
      }));

      setItems((prev) => [
        ...prev,
        ...queued.map(({ file: _f, ...rest }) => {
          void _f;
          return rest;
        }),
      ]);

      const urls: (string | null)[] = new Array(queued.length).fill(null);
      let cursor = 0;

      async function runOne(index: number) {
        const item = queued[index];
        setActive((n) => n + 1);
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: "uploading" } : p)),
        );
        try {
          const fd = new FormData();
          fd.append("file", item.file);
          const res = await fetch(endpoint, { method: "POST", body: fd });
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(body.slice(0, 120) || `HTTP ${res.status}`);
          }
          const { url } = (await res.json()) as { url: string };
          urls[index] = url;
          setItems((prev) =>
            prev.map((p) =>
              p.id === item.id ? { ...p, status: "done", url } : p,
            ),
          );
          onItemDoneRef.current?.(url, item.file);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          setItems((prev) =>
            prev.map((p) =>
              p.id === item.id ? { ...p, status: "error", error: message } : p,
            ),
          );
        } finally {
          setActive((n) => n - 1);
        }
      }

      const workerCount = Math.min(concurrency, queued.length);
      const workers = Array.from({ length: workerCount }, async () => {
        while (true) {
          const idx = cursor++;
          if (idx >= queued.length) return;
          await runOne(idx);
        }
      });
      await Promise.all(workers);

      return urls.filter((u): u is string => u !== null);
    },
    [concurrency, endpoint],
  );

  const clearDone = useCallback(() => {
    setItems((prev) => {
      const removed = prev.filter((p) => p.status === "done");
      removed.forEach((r) => URL.revokeObjectURL(r.preview));
      return prev.filter((p) => p.status !== "done");
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return [];
    });
  }, []);

  return {
    items,
    activeCount: active,
    isUploading: active > 0,
    upload,
    clearDone,
    clearAll,
  };
}
