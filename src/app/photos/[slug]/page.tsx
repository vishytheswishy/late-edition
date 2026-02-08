import Link from "next/link";
import { notFound } from "next/navigation";
import { getAlbumBySlug } from "@/lib/albums";

export const dynamic = "force-dynamic";

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const album = await getAlbumBySlug(slug);

  if (!album) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        <Link
          href="/photos"
          className="text-sm text-black/40 hover:text-black/60 transition-colors"
        >
          &larr; All Albums
        </Link>

        <header className="mt-8 mb-10">
          <h1 className="text-4xl sm:text-5xl font-normal tracking-tight">
            {album.title}
          </h1>
          {album.description && (
            <p className="text-lg text-black/50 mt-4">{album.description}</p>
          )}
          <p className="text-xs text-black/40 mt-2">
            {album.photos.length}{" "}
            {album.photos.length === 1 ? "photo" : "photos"}
            {" · "}
            {new Date(album.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </header>

        {album.photos.length === 0 ? (
          <p className="text-sm text-black/40">No photos in this album yet.</p>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {album.photos.map((photo, index) => (
              <div key={`${photo.url}-${index}`} className="break-inside-avoid">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption || `Photo ${index + 1}`}
                  className="w-full rounded-lg"
                />
                {photo.caption && (
                  <p className="text-sm text-black/50 mt-2 mb-4">
                    {photo.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
