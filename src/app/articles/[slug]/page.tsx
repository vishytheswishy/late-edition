import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";
import ArticleCarousel from "@/components/ArticleCarousel";


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

  const { galleryImages: legacyGallery, textContent } = splitGalleryAndContent(
    post.content
  );
  const galleryImages =
    post.galleryImages && post.galleryImages.length > 0
      ? post.galleryImages
      : legacyGallery;
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
            <h1 className="text-4xl sm:text-5xl font-normal tracking-tight">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-lg text-black/50 mt-4">{post.excerpt}</p>
            )}
          </header>
        </article>
      </div>

      {/* Photo carousel */}
      {hasGallery && (
        <div className="w-full mb-16 overflow-hidden">
          <ArticleCarousel images={galleryImages} title={post.title} />
        </div>
      )}

      {/* Cover image fallback when no gallery */}
      {!hasGallery && post.coverImage && (
        <div className="container mx-auto px-4 max-w-3xl mb-10">
          <Image
            src={post.coverImage}
            alt={post.title}
            width={0}
            height={0}
            sizes="(max-width: 768px) 100vw, 768px"
            priority
            className="w-full h-auto rounded-lg"
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
