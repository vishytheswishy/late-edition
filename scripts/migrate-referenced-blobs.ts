/**
 * Copy ONLY blobs referenced by rows in the destination DB.
 *
 * Reads every URL-bearing column from the destination DB, collects URLs
 * that match the source blob host, downloads each, re-uploads to the
 * destination blob store, then rewrites every reference to point at the
 * new URL.
 *
 * Env:
 *   SRC_BLOB_HOST                — source hostname (e.g. xyz.public.blob.vercel-storage.com)
 *   DEST_DATABASE_URL            — destination Neon URL
 *   DEST_BLOB_READ_WRITE_TOKEN   — destination blob RW token
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import {
  posts,
  events,
  albums,
  albumPhotos,
  lookbookImages,
  siteSettings,
  staffMembers,
  staffMemberPhotos,
} from "../src/lib/schema";

const SRC_BLOB_HOST = process.env.SRC_BLOB_HOST ?? "otnmmx9vd53gl8uw.public.blob.vercel-storage.com";
const DEST_DB_URL = process.env.DEST_DATABASE_URL;
const DEST_BLOB = process.env.DEST_BLOB_READ_WRITE_TOKEN;

if (!DEST_DB_URL || !DEST_BLOB) {
  console.error("Missing DEST_DATABASE_URL or DEST_BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}

const db = drizzle(neon(DEST_DB_URL));

// Match http(s)://<host>/<path> up to a non-URL char
const urlRegex = new RegExp(
  `https?://${SRC_BLOB_HOST.replace(/\./g, "\\.")}/[^\\s"'<>)]+`,
  "g",
);

function extractUrls(text: string | null | undefined, into: Set<string>) {
  if (!text) return;
  const matches = text.match(urlRegex);
  if (matches) for (const m of matches) into.add(m);
}

async function collectReferencedUrls(): Promise<Set<string>> {
  const urls = new Set<string>();

  for (const p of await db.select().from(posts)) {
    extractUrls(p.coverImage, urls);
    extractUrls(p.content, urls);
  }
  for (const e of await db.select().from(events)) {
    extractUrls(e.coverImage, urls);
    extractUrls(e.content, urls);
  }
  for (const a of await db.select().from(albums)) {
    extractUrls(a.coverImage, urls);
  }
  for (const ph of await db.select().from(albumPhotos)) {
    extractUrls(ph.url, urls);
  }
  for (const l of await db.select().from(lookbookImages)) {
    extractUrls(l.url, urls);
  }
  for (const s of await db.select().from(staffMembers)) {
    extractUrls(s.coverImage, urls);
    extractUrls(s.bio, urls);
  }
  for (const sp of await db.select().from(staffMemberPhotos)) {
    extractUrls(sp.url, urls);
  }
  for (const ss of await db.select().from(siteSettings)) {
    extractUrls(ss.value, urls);
  }

  return urls;
}

function pathnameFromUrl(u: string): string {
  // https://host/path/with/slashes.jpg → path/with/slashes.jpg
  return u.replace(/^https?:\/\/[^/]+\//, "");
}

async function copyOne(src: string): Promise<string | null> {
  const res = await fetch(src);
  if (!res.ok) {
    console.warn(`  skip ${src}: HTTP ${res.status}`);
    return null;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const uploaded = await put(pathnameFromUrl(src), buf, {
    access: "public",
    token: DEST_BLOB!,
    contentType: res.headers.get("content-type") ?? undefined,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return uploaded.url;
}

async function main() {
  console.log("→ Scanning destination DB for referenced blob URLs…");
  const urls = await collectReferencedUrls();
  console.log(`→ Found ${urls.size} referenced URLs`);

  const urlMap = new Map<string, string>();
  let i = 0;
  const all = [...urls];
  const concurrency = 8;
  for (let start = 0; start < all.length; start += concurrency) {
    const batch = all.slice(start, start + concurrency);
    const results = await Promise.all(batch.map((u) => copyOne(u)));
    results.forEach((newUrl, idx) => {
      if (newUrl) urlMap.set(batch[idx], newUrl);
    });
    i += batch.length;
    console.log(`  ${i}/${urls.size}`);
  }
  console.log(`→ Copied ${urlMap.size} blobs`);

  console.log("→ Rewriting URLs in destination DB…");
  // Posts
  for (const p of await db.select().from(posts)) {
    let cover = p.coverImage;
    let content = p.content;
    let changed = false;
    if (cover && urlMap.has(cover)) { cover = urlMap.get(cover)!; changed = true; }
    for (const [oldU, newU] of urlMap) {
      if (content.includes(oldU)) { content = content.split(oldU).join(newU); changed = true; }
    }
    if (changed) await db.update(posts).set({ coverImage: cover, content }).where(eq(posts.id, p.id));
  }
  // Events
  for (const e of await db.select().from(events)) {
    let cover = e.coverImage;
    let content = e.content;
    let changed = false;
    if (cover && urlMap.has(cover)) { cover = urlMap.get(cover)!; changed = true; }
    for (const [oldU, newU] of urlMap) {
      if (content.includes(oldU)) { content = content.split(oldU).join(newU); changed = true; }
    }
    if (changed) await db.update(events).set({ coverImage: cover, content }).where(eq(events.id, e.id));
  }
  // Albums
  for (const a of await db.select().from(albums)) {
    if (a.coverImage && urlMap.has(a.coverImage)) {
      await db.update(albums).set({ coverImage: urlMap.get(a.coverImage)! }).where(eq(albums.id, a.id));
    }
  }
  // Album photos
  for (const ph of await db.select().from(albumPhotos)) {
    if (ph.url && urlMap.has(ph.url)) {
      await db.update(albumPhotos).set({ url: urlMap.get(ph.url)! }).where(eq(albumPhotos.id, ph.id));
    }
  }
  // Lookbook
  for (const l of await db.select().from(lookbookImages)) {
    if (l.url && urlMap.has(l.url)) {
      await db.update(lookbookImages).set({ url: urlMap.get(l.url)! }).where(eq(lookbookImages.id, l.id));
    }
  }
  // Staff
  for (const s of await db.select().from(staffMembers)) {
    let cover = s.coverImage;
    let bio = s.bio;
    let changed = false;
    if (cover && urlMap.has(cover)) { cover = urlMap.get(cover)!; changed = true; }
    for (const [oldU, newU] of urlMap) {
      if (bio && bio.includes(oldU)) { bio = bio.split(oldU).join(newU); changed = true; }
    }
    if (changed) await db.update(staffMembers).set({ coverImage: cover, bio }).where(eq(staffMembers.id, s.id));
  }
  for (const sp of await db.select().from(staffMemberPhotos)) {
    if (sp.url && urlMap.has(sp.url)) {
      await db.update(staffMemberPhotos).set({ url: urlMap.get(sp.url)! }).where(eq(staffMemberPhotos.id, sp.id));
    }
  }
  // Settings
  for (const ss of await db.select().from(siteSettings)) {
    let val = ss.value;
    let changed = false;
    for (const [oldU, newU] of urlMap) {
      if (val.includes(oldU)) { val = val.split(oldU).join(newU); changed = true; }
    }
    if (changed) await db.update(siteSettings).set({ value: val }).where(eq(siteSettings.key, ss.key));
  }

  console.log("✓ Done");
}

main().catch((e) => { console.error(e); process.exit(1); });
