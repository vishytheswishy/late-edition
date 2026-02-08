"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/posts";
import type { AlbumPhoto } from "@/lib/albums";

export default function NewAlbumPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const router = useRouter();

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (!slugManuallyEdited) {
        setSlug(slugify(value));
      }
    },
    [slugManuallyEdited]
  );

  const handleCoverUpload = useCallback(async (file: File) => {
    setUploadingCover(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setCoverImage(url);
    } catch {
      alert("Failed to upload cover image");
    } finally {
      setUploadingCover(false);
    }
  }, []);

  const handlePhotosUpload = useCallback(async (files: FileList) => {
    setUploadingPhotos(true);
    const newPhotos: AlbumPhoto[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) continue;
        const { url } = await res.json();
        newPhotos.push({ url, caption: "" });
      } catch {
        // Skip failed uploads
      }
    }
    setPhotos((prev) => [...prev, ...newPhotos]);
    setUploadingPhotos(false);
  }, []);

  const updateCaption = useCallback((index: number, caption: string) => {
    setPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, caption } : p))
    );
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const movePhoto = useCallback((index: number, direction: -1 | 1) => {
    setPhotos((prev) => {
      const next = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= next.length) return prev;
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || slugify(title),
          description: description.trim(),
          coverImage,
          photos,
        }),
      });

      if (res.status === 401) {
        router.push("/admin");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create album");
      }

      router.push("/admin?tab=albums");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create album");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-normal tracking-tight">New Album</h1>
          <button
            onClick={() => router.push("/admin?tab=albums")}
            className="px-4 py-2 border border-black/20 rounded-lg text-sm hover:bg-black/5 transition-colors"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Album title"
              className="w-full px-4 py-3 border border-black/20 rounded-lg text-sm focus:outline-none focus:border-black/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManuallyEdited(true);
              }}
              placeholder="album-url-slug"
              className="w-full px-4 py-3 border border-black/20 rounded-lg text-sm font-mono focus:outline-none focus:border-black/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the album"
              rows={3}
              className="w-full px-4 py-3 border border-black/20 rounded-lg text-sm focus:outline-none focus:border-black/40 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Cover Image
            </label>
            {coverImage ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="w-full h-48 object-cover rounded-lg border border-black/10"
                />
                <button
                  type="button"
                  onClick={() => setCoverImage("")}
                  className="absolute top-2 right-2 px-2 py-1 bg-white/90 rounded text-sm hover:bg-white transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="w-full px-4 py-8 border-2 border-dashed border-black/20 rounded-lg text-sm text-black/40 hover:border-black/30 hover:text-black/60 transition-colors"
              >
                {uploadingCover ? "Uploading..." : "Click to upload cover image"}
              </button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleCoverUpload(file);
                  e.target.value = "";
                }
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Photos</label>
              <button
                type="button"
                onClick={() => photosInputRef.current?.click()}
                disabled={uploadingPhotos}
                className="px-3 py-1.5 text-sm border border-black/20 rounded hover:bg-black/5 transition-colors disabled:opacity-50"
              >
                {uploadingPhotos ? "Uploading..." : "Add Photos"}
              </button>
            </div>
            <input
              ref={photosInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  handlePhotosUpload(files);
                  e.target.value = "";
                }
              }}
            />

            {photos.length === 0 ? (
              <button
                type="button"
                onClick={() => photosInputRef.current?.click()}
                disabled={uploadingPhotos}
                className="w-full px-4 py-12 border-2 border-dashed border-black/20 rounded-lg text-sm text-black/40 hover:border-black/30 hover:text-black/60 transition-colors"
              >
                {uploadingPhotos
                  ? "Uploading photos..."
                  : "Click to upload photos"}
              </button>
            ) : (
              <div className="space-y-3">
                {photos.map((photo, index) => (
                  <div
                    key={`${photo.url}-${index}`}
                    className="flex gap-3 items-start p-3 border border-black/10 rounded-lg"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || `Photo ${index + 1}`}
                      className="w-24 h-24 object-cover rounded shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={photo.caption}
                        onChange={(e) => updateCaption(index, e.target.value)}
                        placeholder="Caption (optional)"
                        className="w-full px-3 py-2 border border-black/20 rounded text-sm focus:outline-none focus:border-black/40 transition-colors"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => movePhoto(index, -1)}
                          disabled={index === 0}
                          className="px-2 py-1 text-xs border border-black/20 rounded hover:bg-black/5 transition-colors disabled:opacity-30"
                        >
                          Move Up
                        </button>
                        <button
                          type="button"
                          onClick={() => movePhoto(index, 1)}
                          disabled={index === photos.length - 1}
                          className="px-2 py-1 text-xs border border-black/20 rounded hover:bg-black/5 transition-colors disabled:opacity-30"
                        >
                          Move Down
                        </button>
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors disabled:opacity-50"
            >
              {saving ? "Publishing..." : "Publish Album"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
