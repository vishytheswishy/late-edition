import { put, list, del } from "@vercel/blob";

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

const INDEX_PATH = "events/index.json";

function eventPath(id: string) {
  return `events/${id}.json`;
}

export async function getEventIndex(): Promise<EventMeta[]> {
  try {
    const { blobs } = await list({ prefix: "events/index" });
    const indexBlob = blobs.find((b) => b.pathname === INDEX_PATH);
    if (!indexBlob) return [];

    const url = new URL(indexBlob.url);
    url.searchParams.set("t", Date.now().toString());
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return [];
    return (await response.json()) as EventMeta[];
  } catch {
    return [];
  }
}

export async function saveEventIndex(events: EventMeta[]): Promise<void> {
  await put(INDEX_PATH, JSON.stringify(events), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function getEvent(id: string): Promise<Event | null> {
  try {
    const { blobs } = await list({ prefix: `events/${id}` });
    const eventBlob = blobs.find((b) => b.pathname === eventPath(id));
    if (!eventBlob) return null;

    const url = new URL(eventBlob.url);
    url.searchParams.set("t", Date.now().toString());
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as Event;
  } catch {
    return null;
  }
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const index = await getEventIndex();
  const meta = index.find((e) => e.slug === slug);
  if (!meta) return null;
  return getEvent(meta.id);
}

export async function saveEvent(event: Event): Promise<void> {
  await put(eventPath(event.id), JSON.stringify(event), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function deleteEvent(id: string): Promise<void> {
  try {
    const { blobs } = await list({ prefix: `events/${id}` });
    const eventBlob = blobs.find((b) => b.pathname === eventPath(id));
    if (eventBlob) {
      await del(eventBlob.url);
    }
  } catch {
    // Blob may not exist
  }
}
