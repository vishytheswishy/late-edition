import { NextResponse } from "next/server";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_HANDLE = process.env.YOUTUBE_CHANNEL_HANDLE || "@LateEditionLive";

// In-memory cache to avoid burning API quota (search.list costs 100 units)
let cache: { data: LiveStatus; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

interface LiveStatus {
  isLive: boolean;
  videoId: string | null;
  title: string | null;
}

async function resolveChannelId(handle: string): Promise<string | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "id");
  url.searchParams.set("forHandle", handle);
  url.searchParams.set("key", YOUTUBE_API_KEY!);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } }); // cache channel ID for 24h
  if (!res.ok) return null;

  const data = await res.json();
  return data.items?.[0]?.id ?? null;
}

async function checkLiveStatus(channelId: string): Promise<LiveStatus> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("eventType", "live");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", YOUTUBE_API_KEY!);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    console.error("YouTube search API error:", res.status, await res.text());
    return { isLive: false, videoId: null, title: null };
  }

  const data = await res.json();
  const item = data.items?.[0];

  if (!item) {
    return { isLive: false, videoId: null, title: null };
  }

  return {
    isLive: true,
    videoId: item.id?.videoId ?? null,
    title: item.snippet?.title ?? null,
  };
}

export async function GET() {
  if (!YOUTUBE_API_KEY) {
    return NextResponse.json(
      { isLive: false, videoId: null, title: null, error: "YouTube API key not configured" },
      { status: 200 } // Still return 200 so the client degrades gracefully
    );
  }

  // Return cached response if still fresh
  const now = Date.now();
  if (cache && now < cache.expiresAt) {
    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" },
    });
  }

  try {
    const channelId = await resolveChannelId(YOUTUBE_CHANNEL_HANDLE);
    if (!channelId) {
      return NextResponse.json(
        { isLive: false, videoId: null, title: null, error: "Channel not found" },
        { status: 200 }
      );
    }

    const status = await checkLiveStatus(channelId);

    // Update cache
    cache = { data: status, expiresAt: now + CACHE_TTL_MS };

    return NextResponse.json(status, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error("YouTube live check failed:", error);
    return NextResponse.json(
      { isLive: false, videoId: null, title: null },
      { status: 200 }
    );
  }
}
