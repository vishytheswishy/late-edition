import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { generateId, slugify } from "@/lib/posts";
import {
  getEventIndex,
  saveEvent,
  type Event,
} from "@/lib/events";
import {
  assertImageUrl,
  assertHtmlImagesAreBlob,
  NonBlobUrlError,
} from "@/lib/imageGuard";
import { revalidateEvents } from "@/lib/revalidate";

export async function GET(request: Request) {
  try {
    const events = await getEventIndex();
    const sorted = events.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const { searchParams } = new URL(request.url);
    const noCache = searchParams.has("fresh");
    return NextResponse.json(sorted, {
      headers: noCache
        ? { "Cache-Control": "no-store" }
        : { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, slug, excerpt, coverImage, content, rsvpEnabled, eventDate } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    try {
      assertImageUrl(coverImage, "coverImage");
      assertHtmlImagesAreBlob(content, "content");
    } catch (err) {
      if (err instanceof NonBlobUrlError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    const id = generateId();
    const now = new Date().toISOString();

    const event: Event = {
      id,
      title,
      slug: slug || slugify(title),
      excerpt: excerpt || "",
      coverImage: coverImage || "",
      content,
      rsvpEnabled: rsvpEnabled ?? false,
      eventDate: eventDate ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await saveEvent(event);
    revalidateEvents(event.slug);

    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
