import {
  pgTable,
  text,
  integer,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";

// ── Posts ──

export const posts = pgTable("posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull().default(""),
  coverImage: text("cover_image").notNull().default(""),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Events ──

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull().default(""),
  coverImage: text("cover_image").notNull().default(""),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Albums ──

export const albums = pgTable("albums", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  coverImage: text("cover_image").notNull().default(""),
  photoCount: integer("photo_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const albumPhotos = pgTable("album_photos", {
  id: serial("id").primaryKey(),
  albumId: text("album_id")
    .notNull()
    .references(() => albums.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption").notNull().default(""),
  order: integer("order").notNull().default(0),
});

// ── Music ──

export const mixes = pgTable("mixes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull().default(""),
  url: text("url").notNull(),
  order: integer("order").notNull().default(0),
});

export const staffPicks = pgTable("staff_picks", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  label: text("label").notNull().default(""),
  spotifyUrl: text("spotify_url").notNull(),
  order: integer("order").notNull().default(0),
});

// ── Lookbook ──

export const lookbookImages = pgTable("lookbook_images", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  order: integer("order").notNull().default(0),
});
