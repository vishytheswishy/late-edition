import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import {
  getAlbum,
  saveAlbum,
  deleteAlbum,
} from "@/lib/albums";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const album = await getAlbum(id);
    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }
    return NextResponse.json(album);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch album" },
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
    const existing = await getAlbum(id);
    if (!existing) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const { title, slug, description, coverImage, photos } =
      await request.json();

    const photoList = photos ?? existing.photos;

    const updated = {
      ...existing,
      title: title ?? existing.title,
      slug: slug ?? existing.slug,
      description: description ?? existing.description,
      coverImage: coverImage ?? existing.coverImage,
      photos: photoList,
      photoCount: photoList.length,
      updatedAt: new Date().toISOString(),
    };

    await saveAlbum(updated);

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update album" },
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
    await deleteAlbum(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete album" },
      { status: 500 }
    );
  }
}
