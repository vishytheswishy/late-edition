import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import {
  getEvent,
  saveEvent,
  deleteEvent,
} from "@/lib/events";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await getEvent(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await getEvent(id);
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { title, slug, excerpt, coverImage, content, rsvpEnabled } = await request.json();

    const updated = {
      ...existing,
      title: title ?? existing.title,
      slug: slug ?? existing.slug,
      excerpt: excerpt ?? existing.excerpt,
      coverImage: coverImage ?? existing.coverImage,
      content: content ?? existing.content,
      rsvpEnabled: rsvpEnabled ?? existing.rsvpEnabled,
      updatedAt: new Date().toISOString(),
    };

    await saveEvent(updated);

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteEvent(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
