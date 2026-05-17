// Enforce that any image reference saved to Postgres lives in Vercel Blob.
// Inline data: URIs and external image URLs are rejected so the DB stays a
// pure URL index — the bytes always live in blob storage.

const BLOB_HOST_RE = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i;
const DATA_URI_RE = /^data:/i;

export class NonBlobUrlError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "NonBlobUrlError";
  }
}

export function isBlobUrl(url: string): boolean {
  return BLOB_HOST_RE.test(url);
}

/** Reject the value if it's a non-blob URL. Empty strings pass through. */
export function assertImageUrl(
  value: string | null | undefined,
  field: string,
): void {
  if (!value) return;
  if (DATA_URI_RE.test(value)) {
    throw new NonBlobUrlError(
      `${field} cannot be an inline data URI — upload via /api/upload first`,
    );
  }
  if (!isBlobUrl(value)) {
    throw new NonBlobUrlError(
      `${field} must be a Vercel Blob URL (got: ${value.slice(0, 80)})`,
    );
  }
}

/** Validate every entry in a gallery array. Throws on the first non-blob URL. */
export function assertImageUrlArray(
  value: unknown,
  field: string,
): asserts value is string[] {
  if (!Array.isArray(value)) {
    throw new NonBlobUrlError(`${field} must be an array of URLs`);
  }
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (typeof item !== "string") {
      throw new NonBlobUrlError(`${field}[${i}] must be a string`);
    }
    assertImageUrl(item, `${field}[${i}]`);
  }
}

/**
 * Scan rich-text HTML for <img> tags and require every src to be a blob URL.
 * Allows in-repo /static paths so the lookbook covers / logos still work.
 */
export function assertHtmlImagesAreBlob(
  html: string | null | undefined,
  field: string,
): void {
  if (!html) return;
  const matches = html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi);
  for (const m of matches) {
    const src = m[1];
    if (DATA_URI_RE.test(src)) {
      throw new NonBlobUrlError(
        `${field} contains an inline base64 image — paste/drop into the editor should upload to blob, not inline`,
      );
    }
    if (src.startsWith("/")) continue; // repo-relative static asset
    if (!isBlobUrl(src)) {
      throw new NonBlobUrlError(
        `${field} contains a non-blob image src (${src.slice(0, 80)}) — hotlinking external images is not allowed`,
      );
    }
  }
}
