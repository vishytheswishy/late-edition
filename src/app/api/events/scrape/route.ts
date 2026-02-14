import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { generateId, slugify } from "@/lib/posts";
import {
  getEventIndex,
  saveEvent,
  type Event,
} from "@/lib/events";
import { put } from "@vercel/blob";
import * as cheerio from "cheerio";

const EVENTS_URL = "https://www.lateedition.org/events";

interface ScrapedEvent {
  title: string;
  slug: string;
  dateTime: string;
  location: string;
  coverImage: string;
  excerpt: string;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

/**
 * Download an image and upload it to Vercel Blob.
 */
async function uploadImageToBlob(
  imageUrl: string,
  slug: string
): Promise<string> {
  try {
    const res = await fetch(imageUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    const urlPath = new URL(imageUrl).pathname;
    const originalName = urlPath.split("/").pop() || "cover.jpg";
    const ext = originalName.split(".").pop() || "jpg";
    const blobPath = `events/${slug}/cover-${Date.now()}.${ext}`;

    const blob = await put(blobPath, Buffer.from(buffer), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });

    return blob.url;
  } catch (err) {
    console.error(`Failed to upload image ${imageUrl}:`, err);
    return imageUrl; // Fallback to original URL
  }
}

/**
 * Parse the Squarespace events listing page.
 *
 * The page uses `user-items-list-item-container` divs, each containing:
 * - `.list-item-content__title` (h2) → event title
 * - `.list-item-content__description` → paragraphs with date/time and location
 * - `.list-item-media img` → flyer image (data-src or src)
 */
function parseEventsPage(html: string): ScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];
  const seenTitles = new Set<string>();

  // Each event item is a container with list-item-content and list-item-media
  $(".user-items-list-item-container").each((_, container) => {
    const $item = $(container);

    // Title
    const title = $item.find(".list-item-content__title").first().text().trim();
    if (!title || seenTitles.has(title)) return;
    seenTitles.add(title);

    // Description paragraphs — typically: first = date/time, second = location
    const descParagraphs: string[] = [];
    $item
      .find(".list-item-content__description p")
      .each((_, p) => {
        const text = $(p).text().trim();
        if (text) descParagraphs.push(text);
      });

    const dateTime = descParagraphs[0] || "";
    const location = descParagraphs[1] || "";

    // Image — flyer/poster
    let coverImage = "";
    const img = $item.find(".list-item-media img, img.list-image").first();
    if (img.length) {
      coverImage = img.attr("data-src") || img.attr("src") || "";
      if (coverImage && coverImage.includes("squarespace-cdn.com")) {
        coverImage = coverImage.split("?")[0] + "?format=1500w";
      }
    }

    const slug = slugify(title);
    const excerpt = [dateTime, location].filter(Boolean).join(" · ");

    events.push({
      title,
      slug,
      dateTime,
      location,
      coverImage,
      excerpt,
    });
  });

  return events;
}

/**
 * Try to parse a date string like "11/1 9pm - Late" or "9/26/25 6pm - 10pm"
 * or "2/1/25 10am - 3pm" into an ISO date.
 */
function parseDateString(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();

  // Extract the date portion before any time info
  // Patterns: "11/1 9pm", "9/26/25 6pm", "12/21/24 9PM"
  const dateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!dateMatch) return new Date().toISOString();

  const month = parseInt(dateMatch[1], 10);
  const day = parseInt(dateMatch[2], 10);
  let year = dateMatch[3] ? parseInt(dateMatch[3], 10) : new Date().getFullYear();

  // Handle 2-digit years
  if (year < 100) {
    year += 2000;
  }

  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return new Date().toISOString();

  return date.toISOString();
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const html = await fetchPage(EVENTS_URL);
    const events = parseEventsPage(html);

    if (events.length === 0) {
      return NextResponse.json(
        { error: "No events found on the page" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      count: events.length,
      events: events.map((e) => ({
        title: e.title,
        slug: e.slug,
        dateTime: e.dateTime,
        location: e.location,
        coverImage: e.coverImage,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to scrape events" },
      { status: 500 }
    );
  }
}

export async function POST() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const html = await fetchPage(EVENTS_URL);
    const scrapedEvents = parseEventsPage(html);

    if (scrapedEvents.length === 0) {
      return NextResponse.json(
        { error: "No events found on the page" },
        { status: 404 }
      );
    }

    // Check for duplicates by slug
    const existingIndex = await getEventIndex();
    const existingSlugs = new Set(existingIndex.map((e) => e.slug));

    const saved: Event[] = [];
    const skipped: string[] = [];

    for (const scraped of scrapedEvents) {
      if (existingSlugs.has(scraped.slug)) {
        skipped.push(scraped.slug);
        continue;
      }

      const id = generateId();
      const createdAt = parseDateString(scraped.dateTime);

      // Upload flyer image to Vercel Blob
      let coverImageUrl = scraped.coverImage;
      if (coverImageUrl && coverImageUrl.includes("squarespace-cdn.com")) {
        coverImageUrl = await uploadImageToBlob(coverImageUrl, scraped.slug);
      }

      // Build content HTML with the flyer image and event details
      const contentParts: string[] = [];

      if (coverImageUrl) {
        contentParts.push(
          `<div class="event-flyer" style="margin-bottom:2rem;">` +
            `<img src="${coverImageUrl}" alt="${scraped.title}" loading="lazy" style="width:100%;max-width:500px;border-radius:12px;" />` +
            `</div>`
        );
      }

      if (scraped.dateTime) {
        contentParts.push(
          `<p><strong>Date &amp; Time:</strong> ${scraped.dateTime}</p>`
        );
      }

      if (scraped.location) {
        contentParts.push(
          `<p><strong>Location:</strong> ${scraped.location}</p>`
        );
      }

      const content = contentParts.join("\n");

      const event: Event = {
        id,
        title: scraped.title,
        slug: scraped.slug,
        excerpt: scraped.excerpt,
        coverImage: coverImageUrl,
        content,
        rsvpEnabled: false,
        createdAt,
        updatedAt: createdAt,
      };

      await saveEvent(event);
      saved.push(event);
    }

    return NextResponse.json({
      saved: saved.length,
      skipped: skipped.length,
      skippedSlugs: skipped,
      events: saved.map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        coverImage: e.coverImage,
      })),
    });
  } catch (err) {
    console.error("Failed to scrape and save events:", err);
    return NextResponse.json(
      { error: "Failed to scrape and save events" },
      { status: 500 }
    );
  }
}
