import { put, list, del } from "@vercel/blob";

export interface LookbookImage {
  id: string;
  url: string;
  order: number;
}

export interface LookbookData {
  images: LookbookImage[];
}

const IMAGES_PREFIX = "lookbook/images/";

/**
 * List all lookbook images stored in the blob under lookbook/images/.
 * No index.json needed -- the blob listing IS the source of truth.
 */
export async function getLookbookData(): Promise<LookbookData> {
  try {
    const { blobs } = await list({ prefix: IMAGES_PREFIX });
    const images: LookbookImage[] = blobs.map((blob, i) => ({
      id: blob.pathname,
      url: blob.url,
      order: i,
    }));
    return { images };
  } catch {
    return { images: [] };
  }
}

export async function uploadLookbookImage(file: File): Promise<string> {
  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
  const blobPath = `${IMAGES_PREFIX}${Date.now()}-${sanitized}`;

  const blob = await put(blobPath, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
  });

  return blob.url;
}

export async function deleteLookbookImage(url: string): Promise<void> {
  try {
    await del(url);
  } catch {
    // Ignore errors if the blob doesn't exist
  }
}
