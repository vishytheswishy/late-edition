import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { generateId, slugify } from "@/lib/posts";
import {
  getEventIndex,
  saveEventIndex,
  saveEvent,
  type Event,
  type EventMeta,
} from "@/lib/events";

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
    const { title, slug, excerpt, coverImage, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
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
      createdAt: now,
      updatedAt: now,
    };

    await saveEvent(event);

    const meta: EventMeta = {
      id: event.id,
      title: event.title,
      slug: event.slug,
      excerpt: event.excerpt,
      coverImage: event.coverImage,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };

    const index = await getEventIndex();
    index.push(meta);
    await saveEventIndex(index);

    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
