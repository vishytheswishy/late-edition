"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PostMeta } from "@/lib/posts";
import type { EventMeta } from "@/lib/events";
import type { AlbumMeta } from "@/lib/albums";

type Tab = "posts" | "events" | "albums";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [posts, setPosts] = useState<PostMeta[]>([]);
  const [events, setEvents] = useState<EventMeta[]>([]);
  const [albums, setAlbums] = useState<AlbumMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get("tab") as Tab) || "posts"
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

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authenticated) {
      setLoading(true);
      Promise.all([fetchPosts(), fetchEvents(), fetchAlbums()]).finally(() =>
        setLoading(false)
      );
    }
  }, [authenticated, fetchPosts, fetchEvents, fetchAlbums]);

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
    { key: "posts", label: "Posts" },
    { key: "events", label: "Events" },
    { key: "albums", label: "Albums" },
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
            {/* Posts Tab */}
            {activeTab === "posts" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-normal tracking-tight">Posts</h2>
                  <button
                    onClick={() => router.push("/admin/new")}
                    className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors"
                  >
                    New Post
                  </button>
                </div>
                {posts.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-black/40 text-sm mb-4">No posts yet</p>
                    <button
                      onClick={() => router.push("/admin/new")}
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors"
                    >
                      Create Your First Post
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
          </>
        )}
      </main>
    </div>
  );
}
