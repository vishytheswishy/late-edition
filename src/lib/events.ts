import { db } from "@/lib/db";
import { events } from "@/lib/schema";
import { eq } from "drizzle-orm";

export interface EventMeta {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  rsvpEnabled: boolean;
  eventDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Event extends EventMeta {
  content: string;
}

export async function getEventIndex(): Promise<EventMeta[]> {
  try {
    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        excerpt: events.excerpt,
        coverImage: events.coverImage,
        rsvpEnabled: events.rsvpEnabled,
        eventDate: events.eventDate,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
      })
      .from(events);

    return rows.map((r) => ({
      ...r,
      eventDate: r.eventDate ? r.eventDate.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function getEvent(id: string): Promise<Event | null> {
  try {
    const rows = await db.select().from(events).where(eq(events.id, id));
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      eventDate: r.eventDate ? r.eventDate.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  try {
    const rows = await db.select().from(events).where(eq(events.slug, slug));
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      eventDate: r.eventDate ? r.eventDate.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function saveEvent(event: Event): Promise<void> {
  const eventDateValue = event.eventDate ? new Date(event.eventDate) : null;
  await db
    .insert(events)
    .values({
      id: event.id,
      title: event.title,
      slug: event.slug,
      excerpt: event.excerpt,
      coverImage: event.coverImage,
      content: event.content,
      rsvpEnabled: event.rsvpEnabled,
      eventDate: eventDateValue,
      createdAt: new Date(event.createdAt),
      updatedAt: new Date(event.updatedAt),
    })
    .onConflictDoUpdate({
      target: events.id,
      set: {
        title: event.title,
        slug: event.slug,
        excerpt: event.excerpt,
        coverImage: event.coverImage,
        content: event.content,
        rsvpEnabled: event.rsvpEnabled,
        eventDate: eventDateValue,
        updatedAt: new Date(event.updatedAt),
      },
    });
}

export async function deleteEvent(id: string): Promise<void> {
  await db.delete(events).where(eq(events.id, id));
}
