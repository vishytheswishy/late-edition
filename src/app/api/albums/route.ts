import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { generateId, slugify } from "@/lib/posts";
import {
  getAlbumIndex,
  saveAlbumIndex,
  saveAlbum,
  type Album,
  type AlbumMeta,
} from "@/lib/albums";

export async function GET() {
  try {
    const albums = await getAlbumIndex();
    const sorted = albums.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json(sorted);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch albums" },
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
    const { title, slug, description, coverImage, photos } =
      await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const id = generateId();
    const now = new Date().toISOString();
    const photoList = Array.isArray(photos) ? photos : [];

    const album: Album = {
      id,
      title,
      slug: slug || slugify(title),
      description: description || "",
      coverImage: coverImage || "",
      photoCount: photoList.length,
      photos: photoList,
      createdAt: now,
      updatedAt: now,
    };

    await saveAlbum(album);

    const meta: AlbumMeta = {
      id: album.id,
      title: album.title,
      slug: album.slug,
      description: album.description,
      coverImage: album.coverImage,
      photoCount: album.photoCount,
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
    };

    const index = await getAlbumIndex();
    index.push(meta);
    await saveAlbumIndex(index);

    return NextResponse.json(album, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create album" },
      { status: 500 }
    );
  }
}
