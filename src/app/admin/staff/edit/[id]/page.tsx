"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import type { StaffMember, StaffPhoto } from "@/lib/staff";

export default function EditStaffMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [member, setMember] = useState<StaffMember | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [photos, setPhotos] = useState<StaffPhoto[]>([]);
  const [order, setOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchMember() {
      try {
        const res = await fetch(`/api/staff/${id}`);
        if (res.status === 404) {
          router.push("/admin?tab=staff");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch staff member");
        const data: StaffMember = await res.json();
        setMember(data);
        setName(data.name);
        setRole(data.role);
        setBio(data.bio);
        setCoverImage(data.coverImage);
        setPhotos(data.photos);
        setOrder(data.order);
      } catch {
        setError("Failed to load staff member");
      } finally {
        setLoading(false);
      }
    }
    fetchMember();
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

  const handlePhotosUpload = useCallback(async (files: FileList) => {
    setUploadingPhotos(true);
    const newPhotos: StaffPhoto[] = [];
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
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          bio: bio.trim(),
          coverImage,
          photos,
          order,
        }),
      });

      if (res.status === 401) {
        router.push("/admin");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update staff member");
      }

      router.push("/admin?tab=staff");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update staff member");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-16 md:pt-20 flex items-center justify-center">
        <p className="text-sm text-black/40">Loading member...</p>
      </div>
    );
  }

  if (!member && !loading) {
    return (
      <div className="min-h-screen bg-white pt-16 md:pt-20 flex items-center justify-center">
        <p className="text-sm text-black/40">Staff member not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-normal tracking-tight">Edit Staff Member</h1>
          <button
            onClick={() => router.push("/admin?tab=staff")}
            className="px-4 py-2 border border-black/20 rounded-lg text-sm hover:bg-black/5 transition-colors"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full px-4 py-3 border border-black/20 rounded-lg text-sm focus:outline-none focus:border-black/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Editor, Photographer, Creative Director"
              className="w-full px-4 py-3 border border-black/20 rounded-lg text-sm focus:outline-none focus:border-black/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short bio"
              rows={3}
              className="w-full px-4 py-3 border border-black/20 rounded-lg text-sm focus:outline-none focus:border-black/40 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Display Order</label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
              className="w-32 px-4 py-3 border border-black/20 rounded-lg text-sm focus:outline-none focus:border-black/40 transition-colors"
            />
            <p className="text-xs text-black/40 mt-1">Lower numbers appear first</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cover Image</label>
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Slideshow Photos</label>
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
                  : "Click to upload slideshow photos"}
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
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
