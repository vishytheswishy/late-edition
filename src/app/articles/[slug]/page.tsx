import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <Link
          href="/articles"
          className="text-sm text-black/40 hover:text-black/60 transition-colors"
        >
          &larr; All Articles
        </Link>

        <article className="mt-8">
          <header className="mb-10">
            <time className="text-xs text-black/40 uppercase tracking-wider">
              {new Date(post.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
            <h1 className="text-4xl sm:text-5xl font-normal tracking-tight mt-2">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-lg text-black/50 mt-4">{post.excerpt}</p>
            )}
          </header>

          {post.coverImage && (
            <div className="mb-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full rounded-lg"
              />
            </div>
          )}

          <div
            className="prose prose-lg max-w-none prose-headings:font-normal prose-headings:tracking-tight prose-a:text-black prose-a:underline-offset-4 prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </main>
    </div>
  );
}
