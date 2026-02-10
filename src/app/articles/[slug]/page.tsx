import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";


export const dynamic = "force-dynamic";

function splitGalleryAndContent(html: string) {
  const galleryRegex =
    /<div class="article-gallery"[^>]*>([\s\S]*?)<\/div>/i;
  const match = html.match(galleryRegex);

  if (!match) return { galleryImages: [] as string[], textContent: html };

  // Extract image URLs from gallery
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
  const galleryImages: string[] = [];
  let imgMatch;
  while ((imgMatch = imgRegex.exec(match[1])) !== null) {
    galleryImages.push(imgMatch[1]);
  }

  // Remove the gallery div from content
  const textContent = html.replace(galleryRegex, "").trim();

  return { galleryImages, textContent };
}

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

  const { galleryImages, textContent } = splitGalleryAndContent(post.content);
  const hasGallery = galleryImages.length > 0;

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      {/* Header section */}
      <div className="container mx-auto px-4 pt-16 max-w-3xl">
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
        </article>
      </div>

      {/* Photo album — horizontal scroll with masonry-height columns */}
      {hasGallery && (
        <div className="w-full mb-16 overflow-hidden">
          <div
            className="flex gap-3 px-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {galleryImages.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`${post.title} — photo ${i + 1}`}
                loading={i < 3 ? "eager" : "lazy"}
                className="h-[28rem] md:h-[36rem] w-auto object-cover rounded-lg flex-shrink-0 snap-center"
              />
            ))}
            {/* Spacer for last-image padding */}
            <div className="flex-shrink-0 w-1" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Cover image fallback when no gallery */}
      {!hasGallery && post.coverImage && (
        <div className="container mx-auto px-4 max-w-3xl mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full rounded-lg"
          />
        </div>
      )}

      {/* Article text */}
      <div className="container mx-auto px-4 pb-16 max-w-3xl">
        <div
          className="prose prose-lg max-w-none prose-headings:font-normal prose-headings:tracking-tight prose-a:text-black prose-a:underline-offset-4 prose-img:rounded-lg [&_.youtube-embed]:not-prose [&_iframe]:rounded-xl"
          dangerouslySetInnerHTML={{ __html: textContent }}
        />
      </div>
    </div>
  );
}
