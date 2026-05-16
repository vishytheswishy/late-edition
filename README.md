# Late Edition

The website behind [lateedition.live](https://lateedition.live) — a magazine, event calendar, photo gallery, mix player, and small Shopify-backed shop, all in one Next.js app.

## Stack

- **Next.js 16** App Router with the React Compiler + Turbopack
- **React 19**, Tailwind v4, Framer Motion, Geist
- **Three.js / @react-three/fiber + drei** for the 3D magazine cover, vinyl turntable, and "book pile" photo browser
- **TipTap 3** for the admin rich-text editor
- **Neon Postgres** via Drizzle ORM (`@neondatabase/serverless`) — all content lives here
- **Vercel Blob** — all image bytes (covers, photos, lookbook, staff portraits) live here; the DB only stores blob URLs (enforced server-side by `src/lib/imageGuard.ts`)
- **Shopify Storefront API** for the `/shop` page and the cart drawer (Shopify hosts checkout, which is where Stripe runs)
- **SoundCloud oEmbed** for mix artwork on `/music`
- **YouTube Data API** for the navbar live indicator

## Routes

| Route | Purpose |
|---|---|
| `/` | 3D magazine cover (`Magazine3D`) over a lookbook grid (`LookbookLayout`) |
| `/events` | Event list with a red bomb-clock countdown to the next dated event |
| `/articles` | Editorial index + `/articles/[slug]` detail |
| `/photos` | 3D book pile / album viewer (mobile: flat grid) |
| `/music` | 3D vinyl turntable, mix sidebar with per-track thumbnails, staff picks |
| `/shop` and `/shop/[handle]` | Shopify-backed product grid + detail |
| `/about` | Staff section with slideshow tiles |
| `/admin` | Password-protected editor for posts, events, albums, staff, mixes, lookbook, site settings |

## Getting started

```bash
pnpm install
cp .env.local.example .env.local   # fill in the four required vars
pnpm dev                           # http://localhost:3000
```

### Required environment variables

| Name | Where to get it |
|---|---|
| `DATABASE_URL` | Neon project → connection string (use the pooled URL for runtime, the unpooled one for `drizzle-kit`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel project → Storage → Blob → "Read & Write token" |
| `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` | e.g. `late-edition-2.myshopify.com` (public — leaked on purpose) |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Shopify admin → Apps → Storefront API → access token (private; prefix `shpat_` for private apps) |
| `ADMIN_PASSWORD` | Anything — gates `/admin` |
| `YOUTUBE_API_KEY` + `YOUTUBE_CHANNEL_HANDLE` | Optional; powers the navbar Live dot |

`.env.local.example` is the source of truth; add a var there whenever you add a new one in code.

## Database

Schema is one file: `src/lib/schema.ts`. Drizzle config: `drizzle.config.ts`. Generated migrations live in `drizzle/`.

```bash
pnpm exec drizzle-kit generate   # emit a new migration after editing schema.ts
pnpm exec drizzle-kit push       # apply the diff to whatever DATABASE_URL points at
```

Tables: `posts`, `events`, `rsvps`, `albums`, `album_photos`, `mixes`, `staff_picks`, `lookbook_images`, `site_settings`, `staff_members`, `staff_member_photos`.

**Hard rule:** image bytes never live in Postgres. Every column that holds an image is just a URL string and is validated server-side at every save endpoint to start with `https://*.public.blob.vercel-storage.com/` (or a repo-relative `/static/...` path). Inline `data:image/...` URIs are rejected with a 400. See `src/lib/imageGuard.ts` and the wired-in endpoints under `src/app/api/{posts,events,albums,staff}/`.

## Image uploads

All admin uploads go through `POST /api/upload`, which forwards the file to Vercel Blob with `access: "public"` and returns the URL. The admin forms then submit just the URL to the create/update endpoint. The TipTap editor's "Insert Image" toolbar button uses the same flow; paste/drop of base64 images is rejected by the server-side guard so the editor stays a pure URL document.

## Deployment

- Hosted on Vercel. `main` → production. PRs get preview deploys automatically.
- Custom domain: `lateedition.live` (DNS managed in the Vercel dashboard).
- Index pages use `revalidate` (60s for articles/events/photos, 300s for about/shop) so Postgres isn't hit per request.
- `next.config.ts` allows `*.public.blob.vercel-storage.com` and `cdn.shopify.com` in `images.remotePatterns`.

## Helpful scripts

- `scripts/migrate-blob-to-neon.ts` — one-time legacy import from a Vercel Blob index into Neon
- `scripts/migrate-everything.ts` — copy DB rows + every blob between two Neon/Blob pairs
- `scripts/migrate-referenced-blobs.ts` — copy only blobs that are still referenced by rows in the destination DB, then rewrite URLs

Run any with `pnpm dlx tsx scripts/<file>.ts` plus the env vars listed at the top of the file.

## Conventions

- App Router throughout. Server components by default; `"use client"` only where state, effects, or browser APIs demand it.
- No JSDoc essays. Comments only when the *why* is non-obvious.
- All Tailwind. No CSS modules. Geist (sans + mono) is the only font.
- Editorial palette: black on white, thin borders, uppercase tracking, mono-ish typographic accents (see `BombClock`, `EventCountdown`, navbar dropdown).
