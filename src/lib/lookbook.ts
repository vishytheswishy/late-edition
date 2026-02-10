import { put, list } from "@vercel/blob";

export interface LookbookImage {
  id: string;
  url: string;
  order: number;
}

export interface LookbookData {
  images: LookbookImage[];
}

const INDEX_PATH = "lookbook/index.json";

export async function getLookbookData(): Promise<LookbookData> {
  try {
    const { blobs } = await list({ prefix: "lookbook/index" });
    const indexBlob = blobs.find((b) => b.pathname === INDEX_PATH);

    if (!indexBlob) {
      return { images: [] };
    }

    const url = new URL(indexBlob.url);
    url.searchParams.set("download", "1");
    url.searchParams.set("_t", Date.now().toString());
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return { images: [] };
    return (await response.json()) as LookbookData;
  } catch {
    return { images: [] };
  }
}

export async function saveLookbookData(data: LookbookData): Promise<void> {
  data.images.sort((a, b) => a.order - b.order);

  await put(INDEX_PATH, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
