import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { generateId, slugify } from "@/lib/posts";
import {
  getAlbumIndex,
  saveAlbum,
  type Album,
} from "@/lib/albums";

export async function GET(request: Request) {
  try {
    const albums = await getAlbumIndex();
    const sorted = albums.sort(
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

    return NextResponse.json(album, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create album" },
      { status: 500 }
    );
  }
}
