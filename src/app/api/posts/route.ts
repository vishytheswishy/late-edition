import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import {
  getPostIndex,
  savePostIndex,
  savePost,
  generateId,
  type Post,
  type PostMeta,
} from "@/lib/posts";

export async function GET() {
  try {
    const posts = await getPostIndex();
    const sorted = posts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json(sorted);
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

    const meta: PostMeta = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };

    const index = await getPostIndex();
    index.push(meta);
    await savePostIndex(index);

    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
