import { put, list, del } from "@vercel/blob";

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

const INDEX_PATH = "posts/index.json";

function postPath(id: string) {
  return `posts/${id}.json`;
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

export async function getPostIndex(): Promise<PostMeta[]> {
  try {
    const { blobs } = await list({ prefix: "posts/index" });
    const indexBlob = blobs.find((b) => b.pathname === INDEX_PATH);
    if (!indexBlob) return [];

    const response = await fetchBlob(indexBlob.url);
    if (!response) return [];
    return (await response.json()) as PostMeta[];
  } catch {
    return [];
  }
}

export async function savePostIndex(posts: PostMeta[]): Promise<void> {
  await put(INDEX_PATH, JSON.stringify(posts), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function getPost(id: string): Promise<Post | null> {
  try {
    const { blobs } = await list({ prefix: `posts/${id}` });
    const postBlob = blobs.find((b) => b.pathname === postPath(id));
    if (!postBlob) return null;

    const response = await fetchBlob(postBlob.url);
    if (!response) return null;
    return (await response.json()) as Post;
  } catch {
    return null;
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const index = await getPostIndex();
  const meta = index.find((p) => p.slug === slug);
  if (!meta) return null;
  return getPost(meta.id);
}

export async function savePost(post: Post): Promise<void> {
  await put(postPath(post.id), JSON.stringify(post), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function deletePost(id: string): Promise<void> {
  // Remove from index first, then delete the blob
  const index = await getPostIndex();
  const updated = index.filter((p) => p.id !== id);
  if (updated.length !== index.length) {
    await savePostIndex(updated);
  }

  // Delete the post blob
  const { blobs } = await list({ prefix: `posts/${id}` });
  for (const blob of blobs) {
    await del(blob.url);
  }
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
