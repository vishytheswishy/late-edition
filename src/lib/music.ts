import { put, list } from "@vercel/blob";

export interface Mix {
  id: string;
  title: string;
  artist: string;
  url: string;
  order: number;
}

export interface StaffPick {
  id: string;
  name: string;
  label: string;
  spotifyUrl: string;
  order: number;
}

export interface MusicData {
  mixes: Mix[];
  staffPicks: StaffPick[];
}

const INDEX_PATH = "music/index.json";
const LATE_EDITION_MUSIC_URL = "https://www.lateedition.org/music";

/**
 * Scrape lateedition.org/music to build seed data dynamically.
 * - SoundCloud track URLs are extracted from the HTML, then enriched
 *   via the SoundCloud oEmbed API to get title + artist.
 * - Spotify playlist URLs and their associated names/labels are
 *   extracted from the HTML text content.
 */
async function scrapeSeedData(): Promise<MusicData> {
  const html = await fetch(LATE_EDITION_MUSIC_URL).then((r) => r.text());

  // ── Mixes: find SoundCloud track URLs (not profile links) ──
  const scTrackLinks = [
    ...html.matchAll(/href=["'](https:\/\/soundcloud\.com\/[^/"']+\/[^"']+)["']/gi),
  ]
    .map((m) => m[1])
    .filter((u) => {
      const parts = new URL(u).pathname.split("/").filter(Boolean);
      return parts.length >= 2; // must be /:user/:track
    });
  const uniqueTrackUrls = [...new Set(scTrackLinks)];

  // Enrich each track via SoundCloud oEmbed
  const mixes: Mix[] = await Promise.all(
    uniqueTrackUrls.map(async (url, i) => {
      try {
        const oembed = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;
        const data = await fetch(oembed).then((r) => r.json());
        const artist = (data.author_name as string) || "";
        let title = (data.title as string) || "";
        // oEmbed returns "Title by Artist" — strip the suffix
        if (artist && title.endsWith(` by ${artist}`)) {
          title = title.slice(0, -` by ${artist}`.length);
        }
        return { id: generateId(), title, artist, url, order: i };
      } catch {
        // Fallback: derive title from URL slug
        const slug = new URL(url).pathname.split("/").pop() || "";
        return {
          id: generateId(),
          title: slug.replace(/-/g, " "),
          artist: "",
          url,
          order: i,
        };
      }
    })
  );

  // ── Staff Picks: Spotify URLs + names/labels from text ──
  const spLinks = [
    ...html.matchAll(/href=["'](https:\/\/open\.spotify\.com\/[^"']+)["']/gi),
  ].map((m) => m[1].replace(/&amp;/g, "&"));

  const textContent = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "|");

  const staffMatches = [
    ...textContent.matchAll(/([A-Z][a-z]+)\s*\|?\s*(Staff Picks Playlist \d+)/g),
  ];

  const staffPicks: StaffPick[] = spLinks.map((url, i) => ({
    id: generateId(),
    name: staffMatches[i]?.[1]?.trim() || "",
    label: staffMatches[i]?.[2]?.trim() || "",
    spotifyUrl: url,
    order: i,
  }));

  return { mixes, staffPicks };
}

export async function getMusicData(): Promise<MusicData> {
  try {
    const { blobs } = await list({ prefix: "music/index" });
    const indexBlob = blobs.find((b) => b.pathname === INDEX_PATH);

    if (!indexBlob) {
      // Auto-seed by scraping lateedition.org on first access
      try {
        const seed = await scrapeSeedData();
        await saveMusicData(seed);
        return seed;
      } catch {
        return { mixes: [], staffPicks: [] };
      }
    }

    const url = new URL(indexBlob.url);
    url.searchParams.set("download", "1");
    url.searchParams.set("_t", Date.now().toString());
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return { mixes: [], staffPicks: [] };
    return (await response.json()) as MusicData;
  } catch {
    return { mixes: [], staffPicks: [] };
  }
}

export async function saveMusicData(data: MusicData): Promise<void> {
  // Sort by order before saving
  data.mixes.sort((a, b) => a.order - b.order);
  data.staffPicks.sort((a, b) => a.order - b.order);

  await put(INDEX_PATH, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
