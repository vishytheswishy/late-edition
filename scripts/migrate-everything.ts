/**
 * Full migration: source Neon + Blob → destination Neon + Blob.
 *
 * 1. Copies every row from source DB to destination (deletes destination
 *    rows first, in FK-safe order).
 * 2. Lists every blob in the source store, downloads it, re-uploads to
 *    the destination store.
 * 3. Builds an old-URL → new-URL map and rewrites every URL-bearing
 *    column in the destination DB.
 *
 * Source creds: SRC_DATABASE_URL, SRC_BLOB_READ_WRITE_TOKEN (or fall
 * back to DATABASE_URL / BLOB_READ_WRITE_TOKEN from .env.local).
 * Destination creds: DEST_DATABASE_URL, DEST_BLOB_READ_WRITE_TOKEN.
 *
 * Usage:
 *   npx tsx scripts/migrate-everything.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { list, put, head } from "@vercel/blob";
import {
  posts,
  events,
  rsvps,
  albums,
  albumPhotos,
  mixes,
  staffPicks,
  lookbookImages,
  siteSettings,
  staffMembers,
  staffMemberPhotos,
} from "../src/lib/schema";

const SRC_DB_URL = process.env.SRC_DATABASE_URL ?? process.env.DATABASE_URL;
const SRC_BLOB = process.env.SRC_BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
const DEST_DB_URL = process.env.DEST_DATABASE_URL;
const DEST_BLOB = process.env.DEST_BLOB_READ_WRITE_TOKEN;

if (!SRC_DB_URL || !SRC_BLOB || !DEST_DB_URL || !DEST_BLOB) {
  console.error("Missing required env vars (need SRC + DEST for db and blob)");
  process.exit(1);
}

const srcDb = drizzle(neon(SRC_DB_URL));
const destDb = drizzle(neon(DEST_DB_URL));

async function copyTable<T extends { tableName?: string }>(
  label: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[],
) {
  if (rows.length === 0) {
    console.log(`  ${label}: empty`);
    return;
  }
  // Insert in chunks to avoid query size limits
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await destDb.insert(table).values(chunk);
  }
  console.log(`  ${label}: ${rows.length} rows`);
}

async function migrateDb() {
  console.log("→ Reading source DB…");
  // Order matters for FKs on insert
  const srcPosts = await srcDb.select().from(posts);
  const srcEvents = await srcDb.select().from(events);
  const srcRsvps = await srcDb.select().from(rsvps);
  const srcAlbums = await srcDb.select().from(albums);
  const srcAlbumPhotos = await srcDb.select().from(albumPhotos);
  const srcMixes = await srcDb.select().from(mixes);
  const srcStaffPicks = await srcDb.select().from(staffPicks);
  const srcLookbook = await srcDb.select().from(lookbookImages);
  const srcSettings = await srcDb.select().from(siteSettings);
  const srcStaff = await srcDb.select().from(staffMembers);
  const srcStaffPhotos = await srcDb.select().from(staffMemberPhotos);

  console.log("→ Wiping destination tables (FK-safe order)…");
  await destDb.delete(rsvps);
  await destDb.delete(albumPhotos);
  await destDb.delete(staffMemberPhotos);
  await destDb.delete(albums);
  await destDb.delete(staffMembers);
  await destDb.delete(events);
  await destDb.delete(posts);
  await destDb.delete(mixes);
  await destDb.delete(staffPicks);
  await destDb.delete(lookbookImages);
  await destDb.delete(siteSettings);

  console.log("→ Inserting into destination…");
  await copyTable("posts", posts, srcPosts);
  await copyTable("events", events, srcEvents);
  await copyTable("rsvps", rsvps, srcRsvps.map((r) => ({ ...r, id: undefined })));
  await copyTable("albums", albums, srcAlbums);
  await copyTable("album_photos", albumPhotos, srcAlbumPhotos.map((r) => ({ ...r, id: undefined })));
  await copyTable("mixes", mixes, srcMixes);
  await copyTable("staff_picks", staffPicks, srcStaffPicks);
  await copyTable("lookbook_images", lookbookImages, srcLookbook);
  await copyTable("site_settings", siteSettings, srcSettings);
  await copyTable("staff_members", staffMembers, srcStaff);
  await copyTable("staff_member_photos", staffMemberPhotos, srcStaffPhotos.map((r) => ({ ...r, id: undefined })));
}

async function migrateBlobs(): Promise<Map<string, string>> {
  console.log("→ Listing source blobs…");
  const urlMap = new Map<string, string>();
  let cursor: string | undefined;
  let total = 0;
  let copied = 0;
  let skipped = 0;

  do {
    const page = await list({ token: SRC_BLOB!, cursor, limit: 1000 });
    total += page.blobs.length;

    for (const b of page.blobs) {
      // Download from source
      const res = await fetch(b.url);
      if (!res.ok) {
        console.warn(`  skip ${b.pathname}: HTTP ${res.status}`);
        skipped++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());

      // Re-upload to destination with same pathname
      const uploaded = await put(b.pathname, buf, {
        access: "public",
        token: DEST_BLOB!,
        contentType: res.headers.get("content-type") ?? undefined,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      urlMap.set(b.url, uploaded.url);
      copied++;
      if (copied % 25 === 0) {
        console.log(`  ${copied} blobs copied…`);
      }
    }
    cursor = page.cursor;
  } while (cursor);

  console.log(`→ Blobs: ${copied} copied, ${skipped} skipped (of ${total})`);
  return urlMap;
}

async function rewriteUrls(urlMap: Map<string, string>) {
  if (urlMap.size === 0) {
    console.log("→ No URL rewrites needed");
    return;
  }
  console.log("→ Rewriting URLs in destination DB…");

  // posts.cover_image, posts.content
  const rowsPosts = await destDb.select().from(posts);
  for (const p of rowsPosts) {
    let cover = p.coverImage;
    let content = p.content;
    let changed = false;
    if (cover && urlMap.has(cover)) { cover = urlMap.get(cover)!; changed = true; }
    for (const [oldU, newU] of urlMap) {
      if (content.includes(oldU)) { content = content.split(oldU).join(newU); changed = true; }
    }
    if (changed) await destDb.update(posts).set({ coverImage: cover, content }).where(eq(posts.id, p.id));
  }

  const rowsEvents = await destDb.select().from(events);
  for (const e of rowsEvents) {
    let cover = e.coverImage;
    let content = e.content;
    let changed = false;
    if (cover && urlMap.has(cover)) { cover = urlMap.get(cover)!; changed = true; }
    for (const [oldU, newU] of urlMap) {
      if (content.includes(oldU)) { content = content.split(oldU).join(newU); changed = true; }
    }
    if (changed) await destDb.update(events).set({ coverImage: cover, content }).where(eq(events.id, e.id));
  }

  const rowsAlbums = await destDb.select().from(albums);
  for (const a of rowsAlbums) {
    if (a.coverImage && urlMap.has(a.coverImage)) {
      await destDb.update(albums).set({ coverImage: urlMap.get(a.coverImage)! }).where(eq(albums.id, a.id));
    }
  }

  const rowsAlbumPhotos = await destDb.select().from(albumPhotos);
  for (const ph of rowsAlbumPhotos) {
    if (ph.url && urlMap.has(ph.url)) {
      await destDb.update(albumPhotos).set({ url: urlMap.get(ph.url)! }).where(eq(albumPhotos.id, ph.id));
    }
  }

  const rowsLookbook = await destDb.select().from(lookbookImages);
  for (const l of rowsLookbook) {
    if (l.url && urlMap.has(l.url)) {
      await destDb.update(lookbookImages).set({ url: urlMap.get(l.url)! }).where(eq(lookbookImages.id, l.id));
    }
  }

  const rowsStaff = await destDb.select().from(staffMembers);
  for (const s of rowsStaff) {
    let cover = s.coverImage;
    let bio = s.bio;
    let changed = false;
    if (cover && urlMap.has(cover)) { cover = urlMap.get(cover)!; changed = true; }
    for (const [oldU, newU] of urlMap) {
      if (bio && bio.includes(oldU)) { bio = bio.split(oldU).join(newU); changed = true; }
    }
    if (changed) await destDb.update(staffMembers).set({ coverImage: cover, bio }).where(eq(staffMembers.id, s.id));
  }

  const rowsStaffPhotos = await destDb.select().from(staffMemberPhotos);
  for (const sp of rowsStaffPhotos) {
    if (sp.url && urlMap.has(sp.url)) {
      await destDb.update(staffMemberPhotos).set({ url: urlMap.get(sp.url)! }).where(eq(staffMemberPhotos.id, sp.id));
    }
  }

  console.log("→ URLs rewritten");
}

async function main() {
  if (process.env.SKIP_DB !== "1") {
    await migrateDb();
  } else {
    console.log("→ Skipping DB migration (SKIP_DB=1)");
  }
  const urlMap = await migrateBlobs();
  await rewriteUrls(urlMap);
  console.log("✓ Migration complete");
  // Suppress head import lint
  void head;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
