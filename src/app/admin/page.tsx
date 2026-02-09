"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PostMeta } from "@/lib/posts";
import type { EventMeta } from "@/lib/events";
import type { AlbumMeta } from "@/lib/albums";
import type { Mix, StaffPick, MusicData } from "@/lib/music";

type Tab = "articles" | "events" | "albums" | "music";

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white pt-16 md:pt-20 flex items-center justify-center">
          <p className="text-sm text-black/40">Loading...</p>
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}

function AdminContent() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [posts, setPosts] = useState<PostMeta[]>([]);
  const [events, setEvents] = useState<EventMeta[]>([]);
  const [albums, setAlbums] = useState<AlbumMeta[]>([]);
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [staffPicks, setStaffPicks] = useState<StaffPick[]>([]);
  const [musicSaving, setMusicSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<{title: string; slug: string; date: string}[]>([]);
  const [importStatus, setImportStatus] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get("tab") as Tab) || "articles"
  );

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/posts", { method: "GET" });
      if (res.ok) {
        const testRes = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        setAuthenticated(testRes.status !== 401);
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      if (res.ok) setPosts(await res.json());
    } catch {
      console.error("Failed to fetch posts");
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      if (res.ok) setEvents(await res.json());
    } catch {
      console.error("Failed to fetch events");
    }
  }, []);

  const fetchAlbums = useCallback(async () => {
    try {
      const res = await fetch("/api/albums");
      if (res.ok) setAlbums(await res.json());
    } catch {
      console.error("Failed to fetch albums");
    }
  }, []);

  const fetchMusic = useCallback(async () => {
    try {
      const res = await fetch("/api/music");
      if (res.ok) {
        const data: MusicData = await res.json();
        setMixes(data.mixes || []);
        setStaffPicks(data.staffPicks || []);
      }
    } catch {
      console.error("Failed to fetch music");
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authenticated) {
      setLoading(true);
      Promise.all([fetchPosts(), fetchEvents(), fetchAlbums(), fetchMusic()]).finally(() =>
        setLoading(false)
      );
    }
  }, [authenticated, fetchPosts, fetchEvents, fetchAlbums, fetchMusic]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthenticated(true);
        setPassword("");
      } else {
        setError("Invalid password");
      }
    } catch {
      setError("Something went wrong");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthenticated(false);
    setPosts([]);
    setEvents([]);
    setAlbums([]);
    setMixes([]);
    setStaffPicks([]);
  };

  // ── Music helpers ──

  const addMix = () => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    setMixes((prev) => [
      ...prev,
      { id, title: "", artist: "", url: "", order: prev.length },
    ]);
  };

  const updateMix = (id: string, field: keyof Mix, value: string) => {
    setMixes((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const removeMix = (id: string) => {
    setMixes((prev) =>
      prev.filter((m) => m.id !== id).map((m, i) => ({ ...m, order: i }))
    );
  };

  const moveMix = (index: number, direction: -1 | 1) => {
    setMixes((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((m, i) => ({ ...m, order: i }));
    });
  };

  const addStaffPick = () => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    setStaffPicks((prev) => [
      ...prev,
      { id, name: "", label: "", spotifyUrl: "", order: prev.length },
    ]);
  };

  const updateStaffPick = (id: string, field: keyof StaffPick, value: string) => {
    setStaffPicks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeStaffPick = (id: string) => {
    setStaffPicks((prev) =>
      prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i }))
    );
  };

  const moveStaffPick = (index: number, direction: -1 | 1) => {
    setStaffPicks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((s, i) => ({ ...s, order: i }));
    });
  };

  const saveMusic = async () => {
    setMusicSaving(true);
    try {
      const res = await fetch("/api/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mixes, staffPicks }),
      });
      if (!res.ok) throw new Error("Save failed");
    } catch {
      alert("Failed to save music data");
    } finally {
      setMusicSaving(false);
    }
  };

  const handleImportPreview = async () => {
    setImporting(true);
    setImportStatus("Fetching articles from lateedition.org...");
    try {
      const res = await fetch("/api/articles/scrape");
      if (res.ok) {
        const data = await res.json();
        setImportPreview(data.articles || []);
        setImportStatus(`Found ${data.articles?.length || 0} articles`);
      } else {
        setImportStatus("Failed to fetch articles");
      }
    } catch {
      setImportStatus("Failed to fetch articles");
    } finally {
      setImporting(false);
    }
  };

  const handleImportSave = async () => {
    setImporting(true);
    setImportStatus("Importing articles...");
    try {
      const res = await fetch("/api/articles/scrape", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setImportStatus(`Successfully imported ${data.saved || 0} articles (${data.skipped || 0} already existed)`);
        setImportPreview([]);
        fetchPosts();
      } else {
        setImportStatus("Failed to import articles");
      }
    } catch {
      setImportStatus("Failed to import articles");
    } finally {
      setImporting(false);
    }
  };

  const handleDeletePost = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("Failed to delete post");
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert("Failed to delete event");
    }
  };

  const handleDeleteAlbum = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/albums/${id}`, { method: "DELETE" });
      if (res.ok) setAlbums((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("Failed to delete album");
    }
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    router.replace(`/admin?tab=${tab}`, { scroll: false });
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-white pt-16 md:pt-20 flex items-center justify-center">
        <p className="text-sm text-black/40">Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-white pt-16 md:pt-20 flex items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm mx-auto px-4"
        >
          <h1 className="text-2xl font-normal tracking-tight mb-8 text-center">
            Admin
          </h1>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full px-4 py-3 border border-black/20 rounded-lg text-sm focus:outline-none focus:border-black/40 transition-colors"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full px-4 py-3 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "articles", label: "Articles" },
    { key: "events", label: "Events" },
    { key: "albums", label: "Albums" },
    { key: "music", label: "Music" },
  ];

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-normal tracking-tight">Admin</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-black/20 rounded-lg text-sm hover:bg-black/5 transition-colors"
          >
            Log Out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-black/10">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? "text-black"
                  : "text-black/40 hover:text-black/60"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-black/40">Loading...</p>
        ) : (
          <>
            {/* Articles Tab */}
            {activeTab === "articles" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-normal tracking-tight">Articles</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push("/admin/new")}
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors"
                    >
                      New Article
                    </button>
                  </div>
                </div>

                {/* Import Section */}
                <div className="mb-8 p-4 border border-dashed border-black/15 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-black/60">Import from lateedition.org</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleImportPreview}
                        disabled={importing}
                        className="px-3 py-1.5 text-sm border border-black/20 rounded hover:bg-black/5 transition-colors disabled:opacity-50"
                      >
                        {importing ? "Fetching..." : "Preview"}
                      </button>
                      {importPreview.length > 0 && (
                        <button
                          onClick={handleImportSave}
                          disabled={importing}
                          className="px-3 py-1.5 text-sm bg-black text-white rounded hover:bg-black/80 transition-colors disabled:opacity-50"
                        >
                          {importing ? "Importing..." : `Import ${importPreview.length} Articles`}
                        </button>
                      )}
                    </div>
                  </div>
                  {importStatus && (
                    <p className="text-sm text-black/50 mb-3">{importStatus}</p>
                  )}
                  {importPreview.length > 0 && (
                    <div className="space-y-2">
                      {importPreview.map((article) => (
                        <div key={article.slug} className="flex items-center justify-between py-2 px-3 bg-black/[0.02] rounded text-sm">
                          <span>{article.title}</span>
                          <span className="text-black/40 text-xs">{article.date}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Articles List (same as posts) */}
                {posts.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-black/40 text-sm mb-4">No articles yet</p>
                    <button
                      onClick={handleImportPreview}
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors"
                    >
                      Import from lateedition.org
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className="flex items-center justify-between p-4 border border-black/10 rounded-lg hover:border-black/20 transition-colors"
                      >
                        <div className="min-w-0 flex-1 mr-4">
                          <h3 className="text-base font-medium truncate">
                            {post.title}
                          </h3>
                          <p className="text-sm text-black/40 mt-0.5">
                            {new Date(post.createdAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                            {post.excerpt && (
                              <span className="ml-2">
                                &middot;{" "}
                                {post.excerpt.slice(0, 60)}
                                {post.excerpt.length > 60 ? "..." : ""}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() =>
                              router.push(`/admin/edit/${post.id}`)
                            }
                            className="px-3 py-1.5 text-sm border border-black/20 rounded hover:bg-black/5 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              handleDeletePost(post.id, post.title)
                            }
                            className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Events Tab */}
            {activeTab === "events" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-normal tracking-tight">
                    Events
                  </h2>
                  <button
                    onClick={() => router.push("/admin/events/new")}
                    className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors"
                  >
                    New Event
                  </button>
                </div>
                {events.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-black/40 text-sm mb-4">
                      No events yet
                    </p>
                    <button
                      onClick={() => router.push("/admin/events/new")}
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors"
                    >
                      Create Your First Event
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-4 border border-black/10 rounded-lg hover:border-black/20 transition-colors"
                      >
                        <div className="min-w-0 flex-1 mr-4">
                          <h3 className="text-base font-medium truncate">
                            {event.title}
                          </h3>
                          <p className="text-sm text-black/40 mt-0.5">
                            {new Date(event.createdAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                            {event.excerpt && (
                              <span className="ml-2">
                                &middot;{" "}
                                {event.excerpt.slice(0, 60)}
                                {event.excerpt.length > 60 ? "..." : ""}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() =>
                              router.push(
                                `/admin/events/edit/${event.id}`
                              )
                            }
                            className="px-3 py-1.5 text-sm border border-black/20 rounded hover:bg-black/5 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteEvent(event.id, event.title)
                            }
                            className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Albums Tab */}
            {activeTab === "albums" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-normal tracking-tight">
                    Albums
                  </h2>
                  <button
                    onClick={() => router.push("/admin/albums/new")}
                    className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors"
                  >
                    New Album
                  </button>
                </div>
                {albums.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-black/40 text-sm mb-4">
                      No albums yet
                    </p>
                    <button
                      onClick={() => router.push("/admin/albums/new")}
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors"
                    >
                      Create Your First Album
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {albums.map((album) => (
                      <div
                        key={album.id}
                        className="flex items-center justify-between p-4 border border-black/10 rounded-lg hover:border-black/20 transition-colors"
                      >
                        <div className="min-w-0 flex-1 mr-4">
                          <h3 className="text-base font-medium truncate">
                            {album.title}
                          </h3>
                          <p className="text-sm text-black/40 mt-0.5">
                            {new Date(album.createdAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                            <span className="ml-2">
                              &middot; {album.photoCount}{" "}
                              {album.photoCount === 1 ? "photo" : "photos"}
                            </span>
                            {album.description && (
                              <span className="ml-2">
                                &middot;{" "}
                                {album.description.slice(0, 50)}
                                {album.description.length > 50 ? "..." : ""}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() =>
                              router.push(
                                `/admin/albums/edit/${album.id}`
                              )
                            }
                            className="px-3 py-1.5 text-sm border border-black/20 rounded hover:bg-black/5 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteAlbum(album.id, album.title)
                            }
                            className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Music Tab */}
            {activeTab === "music" && (
              <div className="space-y-10">
                {/* Mixes Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-normal tracking-tight">
                      Mixes
                    </h2>
                    <button
                      onClick={addMix}
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors"
                    >
                      Add Mix
                    </button>
                  </div>
                  {mixes.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-black/15 rounded-lg">
                      <p className="text-black/40 text-sm mb-3">
                        No mixes yet
                      </p>
                      <button
                        onClick={addMix}
                        className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors"
                      >
                        Add Your First Mix
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mixes.map((mix, index) => (
                        <div
                          key={mix.id}
                          className="p-4 border border-black/10 rounded-lg space-y-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col gap-1 shrink-0 pt-1">
                              <button
                                onClick={() => moveMix(index, -1)}
                                disabled={index === 0}
                                className="p-0.5 text-black/30 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-xs"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => moveMix(index, 1)}
                                disabled={index === mixes.length - 1}
                                className="p-0.5 text-black/30 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-xs"
                              >
                                ▼
                              </button>
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                              <input
                                type="text"
                                value={mix.title}
                                onChange={(e) =>
                                  updateMix(mix.id, "title", e.target.value)
                                }
                                placeholder="Title"
                                className="px-3 py-2 border border-black/15 rounded text-sm focus:outline-none focus:border-black/30 transition-colors"
                              />
                              <input
                                type="text"
                                value={mix.artist}
                                onChange={(e) =>
                                  updateMix(mix.id, "artist", e.target.value)
                                }
                                placeholder="Artist"
                                className="px-3 py-2 border border-black/15 rounded text-sm focus:outline-none focus:border-black/30 transition-colors"
                              />
                              <input
                                type="url"
                                value={mix.url}
                                onChange={(e) =>
                                  updateMix(mix.id, "url", e.target.value)
                                }
                                placeholder="SoundCloud URL"
                                className="px-3 py-2 border border-black/15 rounded text-sm focus:outline-none focus:border-black/30 transition-colors"
                              />
                            </div>
                            <button
                              onClick={() => removeMix(mix.id)}
                              className="shrink-0 px-2 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Staff Picks Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-normal tracking-tight">
                      Staff Picks
                    </h2>
                    <button
                      onClick={addStaffPick}
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors"
                    >
                      Add Staff Pick
                    </button>
                  </div>
                  {staffPicks.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-black/15 rounded-lg">
                      <p className="text-black/40 text-sm mb-3">
                        No staff picks yet
                      </p>
                      <button
                        onClick={addStaffPick}
                        className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors"
                      >
                        Add Your First Staff Pick
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {staffPicks.map((pick, index) => (
                        <div
                          key={pick.id}
                          className="p-4 border border-black/10 rounded-lg space-y-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col gap-1 shrink-0 pt-1">
                              <button
                                onClick={() => moveStaffPick(index, -1)}
                                disabled={index === 0}
                                className="p-0.5 text-black/30 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-xs"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => moveStaffPick(index, 1)}
                                disabled={index === staffPicks.length - 1}
                                className="p-0.5 text-black/30 hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-xs"
                              >
                                ▼
                              </button>
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                              <input
                                type="text"
                                value={pick.name}
                                onChange={(e) =>
                                  updateStaffPick(pick.id, "name", e.target.value)
                                }
                                placeholder="Name"
                                className="px-3 py-2 border border-black/15 rounded text-sm focus:outline-none focus:border-black/30 transition-colors"
                              />
                              <input
                                type="text"
                                value={pick.label}
                                onChange={(e) =>
                                  updateStaffPick(pick.id, "label", e.target.value)
                                }
                                placeholder="Label (e.g. Staff Picks Playlist 001)"
                                className="px-3 py-2 border border-black/15 rounded text-sm focus:outline-none focus:border-black/30 transition-colors"
                              />
                              <input
                                type="url"
                                value={pick.spotifyUrl}
                                onChange={(e) =>
                                  updateStaffPick(pick.id, "spotifyUrl", e.target.value)
                                }
                                placeholder="Spotify URL"
                                className="px-3 py-2 border border-black/15 rounded text-sm focus:outline-none focus:border-black/30 transition-colors"
                              />
                            </div>
                            <button
                              onClick={() => removeStaffPick(pick.id)}
                              className="shrink-0 px-2 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-black/10">
                  <button
                    onClick={saveMusic}
                    disabled={musicSaving}
                    className="px-6 py-2.5 bg-black text-white rounded-lg text-sm hover:bg-black/80 disabled:opacity-50 transition-colors"
                  >
                    {musicSaving ? "Saving..." : "Save Music"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
