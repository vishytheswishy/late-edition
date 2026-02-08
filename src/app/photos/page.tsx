import Link from "next/link";
import { getAlbumIndex } from "@/lib/albums";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const albums = await getAlbumIndex();
  const sorted = albums.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-normal tracking-tight mb-12">Photos</h1>

        {sorted.length === 0 ? (
          <p className="text-sm text-black/60">No albums yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((album) => (
              <Link
                key={album.id}
                href={`/photos/${album.slug}`}
                className="group block"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-black/5">
                  {album.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={album.coverImage}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-sm text-black/30">No cover</span>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <h2 className="text-lg font-medium group-hover:text-black/70 transition-colors">
                    {album.title}
                  </h2>
                  {album.description && (
                    <p className="text-sm text-black/50 mt-1 line-clamp-2">
                      {album.description}
                    </p>
                  )}
                  <p className="text-xs text-black/40 mt-1">
                    {album.photoCount} {album.photoCount === 1 ? "photo" : "photos"}
                    {" · "}
                    {new Date(album.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
