import {
  pgTable,
  text,
  integer,
  serial,
  boolean,
  timestamp,
  uniqueIndex,
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
  rsvpEnabled: boolean("rsvp_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── RSVPs ──

export const rsvps = pgTable(
  "rsvps",
  {
    id: serial("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    status: text("status").notNull().default("going"),
    plusOne: integer("plus_one").notNull().default(0),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("rsvps_event_email_idx").on(table.eventId, table.email)]
);

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

// ── Site Settings ──

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
});

// ── Staff Members ──

export const staffMembers = pgTable("staff_members", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  bio: text("bio").notNull().default(""),
  coverImage: text("cover_image").notNull().default(""),
  order: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const staffMemberPhotos = pgTable("staff_member_photos", {
  id: serial("id").primaryKey(),
  memberId: text("member_id")
    .notNull()
    .references(() => staffMembers.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption").notNull().default(""),
  order: integer("display_order").notNull().default(0),
});
