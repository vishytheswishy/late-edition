/**
 * Rewrite a Vercel Blob image URL through the Next.js image optimizer so
 * canvas/texture pipelines download a resized WebP instead of the original
 * multi-megabyte upload. Non-blob URLs are returned unchanged.
 *
 * `width` must be one of Next's allowed sizes (e.g. 256, 384, 640, 750,
 * 828, 1080, 1200, 1920, 2048, 3840) or the optimizer rejects the request.
 */
const BLOB_URL = /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//;

export function optimizedImageUrl(
  url: string,
  width: number,
  quality = 75
): string {
  if (!BLOB_URL.test(url)) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
}
