import Link from "next/link";
import { getPostIndex } from "@/lib/posts";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear().toString().slice(-2)}`;
}

export default async function ArticlesPage() {
  const posts = await getPostIndex();
  const sorted = posts.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-light tracking-tight mb-16">Articles</h1>

        {sorted.length === 0 ? (
          <p className="text-sm text-black/60">No articles yet. Check back soon.</p>
        ) : (
          <div className="flex flex-col gap-16">
            {sorted.map((post) => (
              <Link
                key={post.id}
                href={`/articles/${post.slug}`}
                className="group block"
              >
                <article className="flex flex-col">
                  {post.coverImage && (
                    <div className="w-full aspect-[4/3] overflow-hidden mb-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                  )}
                  <p className="text-xs text-black/60 font-light tracking-wide mb-2">
                    Kamden . {formatDate(post.createdAt)}
                  </p>
                  <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4 group-hover:underline decoration-black/30 underline-offset-4">
                    {post.title}
                  </h2>
                  <span className="text-sm text-black/70 font-light underline decoration-black/30 underline-offset-4 group-hover:decoration-black/50 transition-colors">
                    Read More
                  </span>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
