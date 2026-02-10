import { put, list, del } from "@vercel/blob";

export interface AlbumPhoto {
  url: string;
  caption: string;
}

export interface AlbumMeta {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Album extends AlbumMeta {
  photos: AlbumPhoto[];
}

const INDEX_PATH = "albums/index.json";

function albumPath(id: string) {
  return `albums/${id}.json`;
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

export async function getAlbumIndex(): Promise<AlbumMeta[]> {
  try {
    const { blobs } = await list({ prefix: "albums/index" });
    const indexBlob = blobs.find((b) => b.pathname === INDEX_PATH);
    if (!indexBlob) return [];

    const response = await fetchBlob(indexBlob.url);
    if (!response) return [];
    return (await response.json()) as AlbumMeta[];
  } catch {
    return [];
  }
}

export async function saveAlbumIndex(albums: AlbumMeta[]): Promise<void> {
  await put(INDEX_PATH, JSON.stringify(albums), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

export async function getAlbum(id: string): Promise<Album | null> {
  try {
    const { blobs } = await list({ prefix: `albums/${id}` });
    const albumBlob = blobs.find((b) => b.pathname === albumPath(id));
    if (!albumBlob) return null;

    const response = await fetchBlob(albumBlob.url);
    if (!response) return null;
    return (await response.json()) as Album;
  } catch {
    return null;
  }
}

export async function getAlbumBySlug(slug: string): Promise<Album | null> {
  const index = await getAlbumIndex();
  const meta = index.find((a) => a.slug === slug);
  if (!meta) return null;
  return getAlbum(meta.id);
}

export async function saveAlbum(album: Album): Promise<void> {
  await put(albumPath(album.id), JSON.stringify(album), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

export async function deleteAlbum(id: string): Promise<void> {
  // Remove from index first, then delete the blob
  const index = await getAlbumIndex();
  const updated = index.filter((a) => a.id !== id);
  if (updated.length !== index.length) {
    await saveAlbumIndex(updated);
  }

  // Delete the album blob
  const { blobs } = await list({ prefix: `albums/${id}` });
  for (const blob of blobs) {
    await del(blob.url);
  }
}
