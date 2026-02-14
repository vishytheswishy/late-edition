"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { slugify } from "@/lib/utils";

const TiptapEditor = dynamic(() => import("@/components/TiptapEditor"), {
  ssr: false,
  loading: () => (
    <div className="border border-black/20 rounded-lg p-4 min-h-[300px] flex items-center justify-center">
      <p className="text-sm text-black/40">Loading editor...</p>
    </div>
  ),
});

export default function NewPostPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || slugify(title),
          excerpt: excerpt.trim(),
          coverImage,
          content,
        }),
      });

      if (res.status === 401) {
        router.push("/admin");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create post");
      }

      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-normal tracking-tight">New Post</h1>
          <button
            onClick={() => router.push("/admin")}
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
              placeholder="Post title"
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
              placeholder="post-url-slug"
              className="w-full px-4 py-3 border border-black/20 rounded-lg text-sm font-mono focus:outline-none focus:border-black/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief description (shown in article listing)"
              rows={2}
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
            <label className="block text-sm font-medium mb-2">Content</label>
            <TiptapEditor content={content} onChange={setContent} />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors disabled:opacity-50"
            >
              {saving ? "Publishing..." : "Publish"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
