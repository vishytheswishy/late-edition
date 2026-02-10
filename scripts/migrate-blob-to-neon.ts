/**
 * One-time migration script: reads all data from Vercel Blob and inserts it into Neon Postgres.
 *
 * Prerequisites:
 *   1. Set DATABASE_URL and BLOB_READ_WRITE_TOKEN in your environment (or .env.local)
 *   2. Run `npx drizzle-kit push` first to create the tables
 *
 * Usage:
 *   npx tsx scripts/migrate-blob-to-neon.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { list } from "@vercel/blob";
import {
  posts,
  events,
  albums,
  albumPhotos,
  mixes,
  staffPicks,
  lookbookImages,
} from "../src/lib/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// ── Helpers ──

async function fetchBlobJson<T>(blobUrl: string): Promise<T | null> {
  try {
    const url = new URL(blobUrl);
    url.searchParams.set("download", "1");
    url.searchParams.set("_t", Date.now().toString());
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function findBlob(prefix: string, pathname: string) {
  const { blobs } = await list({ prefix });
  return blobs.find((b) => b.pathname === pathname) ?? null;
}

// ── Types matching the old blob JSON shapes ──

interface OldPostMeta {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  createdAt: string;
  updatedAt: string;
}

interface OldPost extends OldPostMeta {
  content: string;
}

interface OldEventMeta {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  createdAt: string;
  updatedAt: string;
}

interface OldEvent extends OldEventMeta {
  content: string;
}

interface OldAlbumPhoto {
  url: string;
  caption: string;
}

interface OldAlbumMeta {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}

interface OldAlbum extends OldAlbumMeta {
  photos: OldAlbumPhoto[];
}

interface OldMusicData {
  mixes: { id: string; title: string; artist: string; url: string; order: number }[];
  staffPicks: { id: string; name: string; label: string; spotifyUrl: string; order: number }[];
}

// ── Migration functions ──

async function migratePosts() {
  console.log("\n📄 Migrating posts...");
  const indexBlob = await findBlob("posts/index", "posts/index.json");
  if (!indexBlob) {
    console.log("  No posts index found, skipping.");
    return;
  }

  const index = await fetchBlobJson<OldPostMeta[]>(indexBlob.url);
  if (!index || index.length === 0) {
    console.log("  Posts index is empty, skipping.");
    return;
  }

  let count = 0;
  for (const meta of index) {
    const postBlob = await findBlob(`posts/${meta.id}`, `posts/${meta.id}.json`);
    if (!postBlob) {
      console.log(`  ⚠ Post ${meta.id} (${meta.slug}) blob not found, skipping.`);
      continue;
    }

    const post = await fetchBlobJson<OldPost>(postBlob.url);
    if (!post) {
      console.log(`  ⚠ Post ${meta.id} (${meta.slug}) could not be parsed, skipping.`);
      continue;
    }

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
      .onConflictDoNothing();

    count++;
  }
  console.log(`  ✓ Migrated ${count} posts.`);
}

async function migrateEvents() {
  console.log("\n📅 Migrating events...");
  const indexBlob = await findBlob("events/index", "events/index.json");
  if (!indexBlob) {
    console.log("  No events index found, skipping.");
    return;
  }

  const index = await fetchBlobJson<OldEventMeta[]>(indexBlob.url);
  if (!index || index.length === 0) {
    console.log("  Events index is empty, skipping.");
    return;
  }

  let count = 0;
  for (const meta of index) {
    const eventBlob = await findBlob(`events/${meta.id}`, `events/${meta.id}.json`);
    if (!eventBlob) {
      console.log(`  ⚠ Event ${meta.id} (${meta.slug}) blob not found, skipping.`);
      continue;
    }

    const event = await fetchBlobJson<OldEvent>(eventBlob.url);
    if (!event) {
      console.log(`  ⚠ Event ${meta.id} (${meta.slug}) could not be parsed, skipping.`);
      continue;
    }

    await db
      .insert(events)
      .values({
        id: event.id,
        title: event.title,
        slug: event.slug,
        excerpt: event.excerpt,
        coverImage: event.coverImage,
        content: event.content,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      })
      .onConflictDoNothing();

    count++;
  }
  console.log(`  ✓ Migrated ${count} events.`);
}

async function migrateAlbums() {
  console.log("\n📸 Migrating albums...");
  const indexBlob = await findBlob("albums/index", "albums/index.json");
  if (!indexBlob) {
    console.log("  No albums index found, skipping.");
    return;
  }

  const index = await fetchBlobJson<OldAlbumMeta[]>(indexBlob.url);
  if (!index || index.length === 0) {
    console.log("  Albums index is empty, skipping.");
    return;
  }

  let count = 0;
  for (const meta of index) {
    const albumBlob = await findBlob(`albums/${meta.id}`, `albums/${meta.id}.json`);
    if (!albumBlob) {
      console.log(`  ⚠ Album ${meta.id} (${meta.slug}) blob not found, skipping.`);
      continue;
    }

    const album = await fetchBlobJson<OldAlbum>(albumBlob.url);
    if (!album) {
      console.log(`  ⚠ Album ${meta.id} (${meta.slug}) could not be parsed, skipping.`);
      continue;
    }

    await db
      .insert(albums)
      .values({
        id: album.id,
        title: album.title,
        slug: album.slug,
        description: album.description,
        coverImage: album.coverImage,
        photoCount: album.photos.length,
        createdAt: new Date(album.createdAt),
        updatedAt: new Date(album.updatedAt),
      })
      .onConflictDoNothing();

    // Insert photos
    if (album.photos.length > 0) {
      await db.insert(albumPhotos).values(
        album.photos.map((photo, i) => ({
          albumId: album.id,
          url: photo.url,
          caption: photo.caption || "",
          order: i,
        }))
      );
    }

    count++;
  }
  console.log(`  ✓ Migrated ${count} albums.`);
}

async function migrateMusic() {
  console.log("\n🎵 Migrating music...");
  const indexBlob = await findBlob("music/index", "music/index.json");
  if (!indexBlob) {
    console.log("  No music index found, skipping.");
    return;
  }

  const data = await fetchBlobJson<OldMusicData>(indexBlob.url);
  if (!data) {
    console.log("  Music data could not be parsed, skipping.");
    return;
  }

  if (data.mixes.length > 0) {
    await db.insert(mixes).values(
      data.mixes.map((m) => ({
        id: m.id,
        title: m.title,
        artist: m.artist,
        url: m.url,
        order: m.order,
      }))
    );
  }

  if (data.staffPicks.length > 0) {
    await db.insert(staffPicks).values(
      data.staffPicks.map((s) => ({
        id: s.id,
        name: s.name,
        label: s.label,
        spotifyUrl: s.spotifyUrl,
        order: s.order,
      }))
    );
  }

  console.log(`  ✓ Migrated ${data.mixes.length} mixes and ${data.staffPicks.length} staff picks.`);
}

async function migrateLookbook() {
  console.log("\n🖼️  Migrating lookbook images...");
  const { blobs } = await list({ prefix: "lookbook/images/" });

  if (blobs.length === 0) {
    console.log("  No lookbook images found, skipping.");
    return;
  }

  await db.insert(lookbookImages).values(
    blobs.map((blob, i) => ({
      id: blob.pathname,
      url: blob.url,
      order: i,
    }))
  );

  console.log(`  ✓ Migrated ${blobs.length} lookbook images.`);
}

// ── Main ──

async function main() {
  console.log("🚀 Starting migration from Vercel Blob to Neon Postgres...\n");
  console.log("Make sure you have run `npx drizzle-kit push` first!\n");

  await migratePosts();
  await migrateEvents();
  await migrateAlbums();
  await migrateMusic();
  await migrateLookbook();

  console.log("\n✅ Migration complete!");
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
