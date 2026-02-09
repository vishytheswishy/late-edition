import { NextRequest, NextResponse } from "next/server";

// Cache the client_id for the lifetime of the serverless function
let cachedClientId: string | null = null;

/**
 * Extract a SoundCloud client_id by fetching the widget page and parsing it
 * from one of the JS bundles.
 */
async function getClientId(): Promise<string> {
  if (cachedClientId) return cachedClientId;

  // Fetch the SoundCloud widget player page to find script URLs
  const widgetHtml = await fetch("https://w.soundcloud.com/player/?url=https://soundcloud.com").then(
    (r) => r.text()
  );

  // Find script src URLs
  const scriptUrls = [...widgetHtml.matchAll(/src="(https:\/\/[^"]+\.js)"/g)].map(
    (m) => m[1]
  );

  // Search each script for client_id
  for (const url of scriptUrls) {
    try {
      const js = await fetch(url).then((r) => r.text());
      // Pattern: client_id:s?"ID1":"ID2" (ternary) or client_id:"ID"
      const ternary = js.match(
        /client_id:\w+\?"([a-zA-Z0-9]+)":"([a-zA-Z0-9]+)"/
      );
      if (ternary?.[1]) {
        cachedClientId = ternary[1];
        return cachedClientId;
      }
      const simple = js.match(/client_id:"([a-zA-Z0-9]+)"/);
      if (simple?.[1]) {
        cachedClientId = simple[1];
        return cachedClientId;
      }
    } catch {
      continue;
    }
  }

  throw new Error("Could not extract SoundCloud client_id");
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const clientId = await getClientId();

    // Resolve the track URL to get track metadata
    const resolveUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${clientId}`;
    const trackRes = await fetch(resolveUrl);

    if (!trackRes.ok) {
      return NextResponse.json(
        { error: "Failed to resolve track" },
        { status: 502 }
      );
    }

    const track = await trackRes.json();

    // Find a progressive (MP3) transcoding
    const transcodings = track.media?.transcodings as
      | { url: string; format: { protocol: string; mime_type: string } }[]
      | undefined;

    if (!transcodings?.length) {
      return NextResponse.json(
        { error: "No transcodings available" },
        { status: 404 }
      );
    }

    // Prefer progressive (direct MP3) over HLS
    const progressive = transcodings.find(
      (t) => t.format.protocol === "progressive"
    );
    const transcoding = progressive || transcodings[0];

    // Fetch the actual stream URL from the transcoding endpoint
    const streamRes = await fetch(
      `${transcoding.url}?client_id=${clientId}`
    );

    if (!streamRes.ok) {
      return NextResponse.json(
        { error: "Failed to get stream URL" },
        { status: 502 }
      );
    }

    const streamData = await streamRes.json();

    return NextResponse.json({
      streamUrl: streamData.url,
      artworkUrl: track.artwork_url
        ? track.artwork_url.replace("-large", "-t500x500")
        : null,
      title: track.title || "",
      artist: track.user?.username || "",
      duration: track.duration || 0, // ms
    });
  } catch (err) {
    console.error("sc-stream error:", err);
    // Invalidate cached client_id on failure so next request retries
    cachedClientId = null;
    return NextResponse.json(
      { error: "Internal error resolving stream" },
      { status: 500 }
    );
  }
}
