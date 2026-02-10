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

/** Fetch a blob URL, bypassing CDN edge cache with download param */
async function fetchBlob(blobUrl: string): Promise<Response | null> {
  try {
    const url = new URL(blobUrl);
    url.searchParams.set("download", "1");
    url.searchParams.set("_t", Date.now().toString());
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (response.ok) return response;
    return null;
  } catch {
    return null;
  }
}

export async function getEventIndex(): Promise<EventMeta[]> {
  try {
    const { blobs } = await list({ prefix: "events/index" });
    const indexBlob = blobs.find((b) => b.pathname === INDEX_PATH);
    if (!indexBlob) return [];

    const response = await fetchBlob(indexBlob.url);
    if (!response) return [];
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

    const response = await fetchBlob(eventBlob.url);
    if (!response) return null;
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
  // Remove from index first, then delete the blob
  const index = await getEventIndex();
  const updated = index.filter((e) => e.id !== id);
  if (updated.length !== index.length) {
    await saveEventIndex(updated);
  }

  // Delete the event blob
  const { blobs } = await list({ prefix: `events/${id}` });
  for (const blob of blobs) {
    await del(blob.url);
  }
}
