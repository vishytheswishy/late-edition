import Link from "next/link";
import { getPostIndex } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const posts = await getPostIndex();
  const sorted = posts.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-normal tracking-tight mb-12">Articles</h1>

        {sorted.length === 0 ? (
          <p className="text-sm text-black/60">No articles yet. Check back soon.</p>
        ) : (
          <div className="grid gap-8">
            {sorted.map((post) => (
              <Link
                key={post.id}
                href={`/articles/${post.slug}`}
                className="group block"
              >
                <article className="flex flex-col sm:flex-row gap-6">
                  {post.coverImage && (
                    <div className="sm:w-64 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-44 sm:h-40 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="flex flex-col justify-center">
                    <time className="text-xs text-black/40 uppercase tracking-wider">
                      {new Date(post.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                    <h2 className="text-xl font-normal tracking-tight mt-1 group-hover:underline decoration-black/30 underline-offset-4">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm text-black/60 mt-2 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
