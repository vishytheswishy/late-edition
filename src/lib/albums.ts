import { db } from "@/lib/db";
import { albums, albumPhotos } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

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

export async function getAlbumIndex(): Promise<AlbumMeta[]> {
  try {
    const rows = await db
      .select({
        id: albums.id,
        title: albums.title,
        slug: albums.slug,
        description: albums.description,
        coverImage: albums.coverImage,
        photoCount: albums.photoCount,
        createdAt: albums.createdAt,
        updatedAt: albums.updatedAt,
      })
      .from(albums);

    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

/** No-op: index is now implicit in the albums table */
export async function saveAlbumIndex(_albums: AlbumMeta[]): Promise<void> {}

export async function getAlbum(id: string): Promise<Album | null> {
  try {
    const albumRows = await db
      .select()
      .from(albums)
      .where(eq(albums.id, id));
    if (albumRows.length === 0) return null;

    const r = albumRows[0];
    const photoRows = await db
      .select({ url: albumPhotos.url, caption: albumPhotos.caption })
      .from(albumPhotos)
      .where(eq(albumPhotos.albumId, id))
      .orderBy(asc(albumPhotos.order));

    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      coverImage: r.coverImage,
      photoCount: r.photoCount,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      photos: photoRows,
    };
  } catch {
    return null;
  }
}

export async function getAlbumBySlug(slug: string): Promise<Album | null> {
  try {
    const albumRows = await db
      .select()
      .from(albums)
      .where(eq(albums.slug, slug));
    if (albumRows.length === 0) return null;

    const r = albumRows[0];
    const photoRows = await db
      .select({ url: albumPhotos.url, caption: albumPhotos.caption })
      .from(albumPhotos)
      .where(eq(albumPhotos.albumId, r.id))
      .orderBy(asc(albumPhotos.order));

    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      coverImage: r.coverImage,
      photoCount: r.photoCount,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      photos: photoRows,
    };
  } catch {
    return null;
  }
}

export async function saveAlbum(album: Album): Promise<void> {
  // Upsert the album row
  await db
    .insert(albums)
    .values({
      id: album.id,
      title: album.title,
      slug: album.slug,
      description: album.description,
      coverImage: album.coverImage,
      photoCount: album.photos.length,
      createdAt: new Date(album.createdAt),
      updatedAt: new Date(album.updatedAt),
    })
    .onConflictDoUpdate({
      target: albums.id,
      set: {
        title: album.title,
        slug: album.slug,
        description: album.description,
        coverImage: album.coverImage,
        photoCount: album.photos.length,
        updatedAt: new Date(album.updatedAt),
      },
    });

  // Replace photos: delete existing, then insert new ones
  await db.delete(albumPhotos).where(eq(albumPhotos.albumId, album.id));

  if (album.photos.length > 0) {
    await db.insert(albumPhotos).values(
      album.photos.map((photo, i) => ({
        albumId: album.id,
        url: photo.url,
        caption: photo.caption,
        order: i,
      }))
    );
  }
}

export async function deleteAlbum(id: string): Promise<void> {
  // album_photos cascade-deletes via FK, but be explicit
  await db.delete(albumPhotos).where(eq(albumPhotos.albumId, id));
  await db.delete(albums).where(eq(albums.id, id));
}
