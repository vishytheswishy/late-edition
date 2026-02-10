import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import {
  getPostIndex,
  savePost,
  generateId,
  type Post,
} from "@/lib/posts";

export async function GET(request: Request) {
  try {
    const posts = await getPostIndex();
    const sorted = posts.sort(
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
      { error: "Failed to fetch posts" },
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
    const { title, slug, excerpt, coverImage, content } = await request.json();

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "Title, slug, and content are required" },
        { status: 400 }
      );
    }

    const id = generateId();
    const now = new Date().toISOString();

    const post: Post = {
      id,
      title,
      slug,
      excerpt: excerpt || "",
      coverImage: coverImage || "",
      content,
      createdAt: now,
      updatedAt: now,
    };

    await savePost(post);

    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
