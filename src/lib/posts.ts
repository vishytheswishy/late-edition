import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { eq } from "drizzle-orm";

export interface PostMeta {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post extends PostMeta {
  content: string;
}

export async function getPostIndex(): Promise<PostMeta[]> {
  try {
    const rows = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        excerpt: posts.excerpt,
        coverImage: posts.coverImage,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
      })
      .from(posts);

    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

/** No-op: index is now implicit in the posts table */
export async function savePostIndex(_posts: PostMeta[]): Promise<void> {}

export async function getPost(id: string): Promise<Post | null> {
  try {
    const rows = await db.select().from(posts).where(eq(posts.id, id));
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const rows = await db.select().from(posts).where(eq(posts.slug, slug));
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function savePost(post: Post): Promise<void> {
  await db
    .insert(posts)
    .values({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      content: post.content,
      createdAt: new Date(post.createdAt),
      updatedAt: new Date(post.updatedAt),
    })
    .onConflictDoUpdate({
      target: posts.id,
      set: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        content: post.content,
        updatedAt: new Date(post.updatedAt),
      },
    });
}

export async function deletePost(id: string): Promise<void> {
  await db.delete(posts).where(eq(posts.id, id));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
