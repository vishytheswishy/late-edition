import { db } from "@/lib/db";
import { events } from "@/lib/schema";
import { eq } from "drizzle-orm";

export interface EventMeta {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
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
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
      })
      .from(events);

    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

/** No-op: index is now implicit in the events table */
export async function saveEventIndex(_events: EventMeta[]): Promise<void> {}

export async function getEvent(id: string): Promise<Event | null> {
  try {
    const rows = await db.select().from(events).where(eq(events.id, id));
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
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
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function saveEvent(event: Event): Promise<void> {
  await db
    .insert(events)
    .values({
      id: event.id,
      title: event.title,
      slug: event.slug,
      excerpt: event.excerpt,
      coverImage: event.coverImage,
      content: event.content,
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
        updatedAt: new Date(event.updatedAt),
      },
    });
}

export async function deleteEvent(id: string): Promise<void> {
  await db.delete(events).where(eq(events.id, id));
}
