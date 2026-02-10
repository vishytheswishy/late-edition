import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { lookbookImages } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export interface LookbookImage {
  id: string;
  url: string;
  order: number;
}

export interface LookbookData {
  images: LookbookImage[];
}

/**
 * List all lookbook images from the database.
 */
export async function getLookbookData(): Promise<LookbookData> {
  try {
    const rows = await db
      .select()
      .from(lookbookImages)
      .orderBy(asc(lookbookImages.order));

    return { images: rows };
  } catch {
    return { images: [] };
  }
}

export async function uploadLookbookImage(file: File): Promise<string> {
  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
  const blobPath = `lookbook/images/${Date.now()}-${sanitized}`;

  // Upload binary to Vercel Blob
  const blob = await put(blobPath, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
  });

  // Get current count for ordering
  const existing = await db.select().from(lookbookImages);

  // Store metadata in Neon
  await db.insert(lookbookImages).values({
    id: blob.pathname,
    url: blob.url,
    order: existing.length,
  });

  return blob.url;
}

export async function deleteLookbookImage(url: string): Promise<void> {
  try {
    // Delete binary from Vercel Blob
    await del(url);
  } catch {
    // Ignore errors if the blob doesn't exist
  }

  // Delete metadata from Neon
  await db.delete(lookbookImages).where(eq(lookbookImages.url, url));
}
