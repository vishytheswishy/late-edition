import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import {
  getPost,
  getPostIndex,
  savePostIndex,
  savePost,
  deletePost,
  type PostMeta,
} from "@/lib/posts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await getPost(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch post" },
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
    const existing = await getPost(id);
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const { title, slug, excerpt, coverImage, content } = await request.json();

    const updated = {
      ...existing,
      title: title ?? existing.title,
      slug: slug ?? existing.slug,
      excerpt: excerpt ?? existing.excerpt,
      coverImage: coverImage ?? existing.coverImage,
      content: content ?? existing.content,
      updatedAt: new Date().toISOString(),
    };

    await savePost(updated);

    const meta: PostMeta = {
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      excerpt: updated.excerpt,
      coverImage: updated.coverImage,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    const index = await getPostIndex();
    const newIndex = index.map((p) => (p.id === id ? meta : p));
    await savePostIndex(newIndex);

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update post" },
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
    await deletePost(id);

    const index = await getPostIndex();
    const newIndex = index.filter((p) => p.id !== id);
    await savePostIndex(newIndex);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
