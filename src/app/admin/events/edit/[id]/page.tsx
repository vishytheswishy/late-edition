"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Event } from "@/lib/events";

const TiptapEditor = dynamic(() => import("@/components/TiptapEditor"), {
  ssr: false,
  loading: () => (
    <div className="border border-black/20 rounded-lg p-4 min-h-[300px] flex items-center justify-center">
      <p className="text-sm text-black/40">Loading editor...</p>
    </div>
  ),
});

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [event, setEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [content, setContent] = useState("");
  const [rsvpEnabled, setRsvpEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${id}`);
        if (res.status === 404) {
          router.push("/admin?tab=events");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch event");
        const data: Event = await res.json();
        setEvent(data);
        setTitle(data.title);
        setSlug(data.slug);
        setExcerpt(data.excerpt);
        setCoverImage(data.coverImage);
        setContent(data.content);
        setRsvpEnabled(data.rsvpEnabled ?? false);
      } catch {
        setError("Failed to load event");
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [id, router]);

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
      const res = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim(),
          coverImage,
          content,
          rsvpEnabled,
        }),
      });

      if (res.status === 401) {
        router.push("/admin");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update event");
      }

      router.push("/admin?tab=events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-16 md:pt-20 flex items-center justify-center">
        <p className="text-sm text-black/40">Loading event...</p>
      </div>
    );
  }

  if (!event && !loading) {
    return (
      <div className="min-h-screen bg-white pt-16 md:pt-20 flex items-center justify-center">
        <p className="text-sm text-black/40">Event not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-normal tracking-tight">Edit Event</h1>
          <button
            onClick={() => router.push("/admin?tab=events")}
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
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full px-4 py-3 border border-black/20 rounded-lg text-sm focus:outline-none focus:border-black/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="event-url-slug"
              className="w-full px-4 py-3 border border-black/20 rounded-lg text-sm font-mono focus:outline-none focus:border-black/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief description (shown in event listing)"
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
                {uploadingCover
                  ? "Uploading..."
                  : "Click to upload cover image"}
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
            {content !== "" && (
              <TiptapEditor content={content} onChange={setContent} />
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={rsvpEnabled}
              onClick={() => setRsvpEnabled(!rsvpEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                rsvpEnabled ? "bg-black" : "bg-black/20"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  rsvpEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <label className="text-sm font-medium">Enable RSVP</label>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
