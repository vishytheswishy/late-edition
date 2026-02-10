import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import {
  getPostIndex,
  savePost,
  generateId,
  type Post,
} from "@/lib/posts";
import { put } from "@vercel/blob";
import * as cheerio from "cheerio";

const BASE_URL = "https://www.lateedition.org";
const ARTICLES_URL = `${BASE_URL}/articles`;

interface ScrapedArticle {
  title: string;
  slug: string;
  date: string;
  author: string;
  content: string;
  excerpt: string;
  coverImage: string;
  images: string[];
  youtubeVideoId: string;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

/**
 * Download an image from a URL and upload it to Vercel Blob storage.
 * Returns the blob URL.
 */
async function uploadImageToBlob(
  imageUrl: string,
  slug: string,
  index: number
): Promise<string> {
  try {
    const res = await fetch(imageUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    // Extract original filename from URL or generate one
    const urlPath = new URL(imageUrl).pathname;
    const originalName = urlPath.split("/").pop() || `image-${index}.jpg`;
    const ext = originalName.split(".").pop() || "jpg";
    const blobPath = `articles/${slug}/${index}-${Date.now()}.${ext}`;

    const blob = await put(blobPath, Buffer.from(buffer), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });

    return blob.url;
  } catch (err) {
    console.error(`Failed to upload image ${imageUrl}:`, err);
    return imageUrl; // Fallback to original URL
  }
}

function parseArticleListing(
  html: string
): { title: string; slug: string; coverImage: string }[] {
  const $ = cheerio.load(html);
  const articles: { title: string; slug: string; coverImage: string }[] = [];

  // Find all article links on the listing page
  $('a[href*="/articles/"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/\/articles\/([^/?#]+)/);
    if (!match) return;

    const slug = match[1];
    if (!slug || slug === "articles" || articles.some((a) => a.slug === slug))
      return;

    // Get the title from heading inside the link
    const title =
      $(el).find("h1, h2, h3, h4").first().text().trim() ||
      $(el).text().trim();

    // Extract cover image from the listing card
    // Squarespace uses data-src for lazy-loaded images, or regular src, or noscript img
    let coverImage = "";
    const img = $(el).find("img").first();
    if (img.length) {
      coverImage =
        img.attr("data-src") || img.attr("src") || "";
      // Clean up format params — get a high-res version
      if (coverImage && coverImage.includes("images.squarespace-cdn.com")) {
        coverImage = coverImage.split("?")[0] + "?format=1500w";
      }
    }

    if (title) {
      articles.push({ title, slug, coverImage });
    }
  });

  return articles;
}

function parseArticlePage(
  html: string,
  slug: string,
  listingCoverImage: string
): ScrapedArticle {
  const $ = cheerio.load(html);

  // ── Title ──
  const title = $("h1").first().text().trim();

  // ── Date & Author ──
  let date = "";
  const author = "Kamden";

  $("time").each((_, el) => {
    const datetime = $(el).attr("datetime") || $(el).text().trim();
    if (datetime) date = datetime;
  });

  if (!date) {
    $(".blog-meta, .entry-date, .post-date, .date, [class*='date']").each(
      (_, el) => {
        const text = $(el).text().trim();
        if (text && !date) date = text;
      }
    );
  }

  // ── Images ──
  // Squarespace stores images with data-src for lazy loading
  // We collect all article body images (not logo/nav images)
  const images: string[] = [];
  const seenUrls = new Set<string>();

  // Find images within the blog content area
  const contentSelectors = [
    ".blog-item-content",
    ".entry-content",
    ".post-body",
    ".sqs-block-content",
    "article",
    ".blog-item-wrapper",
    '[data-content-field="body"]',
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let $content: cheerio.Cheerio<any> | null = null;
  for (const selector of contentSelectors) {
    const found = $(selector);
    if (found.length > 0) {
      $content = found.first();
      break;
    }
  }

  // Collect images from the content area
  const imgElements = $content ? $content.find("img") : $("img");
  imgElements.each((_, el) => {
    const dataSrc = $(el).attr("data-src");
    const src = $(el).attr("src");
    let imageUrl = dataSrc || src || "";

    // Skip nav/logo images
    if (
      !imageUrl ||
      imageUrl.includes("Logo") ||
      imageUrl.includes("favicon") ||
      imageUrl.includes("memberAccountAvatars")
    )
      return;

    // Normalize URL
    if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;
    if (!imageUrl.startsWith("http")) return;

    // Get high-res version
    const baseUrl = imageUrl.split("?")[0];
    if (!seenUrls.has(baseUrl)) {
      seenUrls.add(baseUrl);
      images.push(baseUrl + "?format=1500w");
    }
  });

  // Also check noscript tags for images (Squarespace fallback)
  $("noscript").each((_, el) => {
    const noscriptHtml = $(el).html() || "";
    const noscript$ = cheerio.load(noscriptHtml);
    noscript$("img").each((_, nImg) => {
      let imgSrc = noscript$(nImg).attr("src") || "";
      if (
        !imgSrc ||
        imgSrc.includes("Logo") ||
        imgSrc.includes("favicon") ||
        imgSrc.includes("memberAccountAvatars")
      )
        return;
      if (imgSrc.startsWith("//")) imgSrc = "https:" + imgSrc;
      const baseUrl = imgSrc.split("?")[0];
      if (!seenUrls.has(baseUrl)) {
        seenUrls.add(baseUrl);
        images.push(baseUrl + "?format=1500w");
      }
    });
  });

  // ── YouTube Video ──
  // Squarespace embeds YouTube in JSON data or iframe
  let youtubeVideoId = "";

  // Method 1: Look for youtube.com/embed/VIDEO_ID in the raw HTML
  const embedMatch = html.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) {
    youtubeVideoId = embedMatch[1];
  }

  // Method 2: Look for youtu.be/VIDEO_ID
  if (!youtubeVideoId) {
    const shortMatch = html.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) {
      youtubeVideoId = shortMatch[1];
    }
  }

  // Method 3: Look for youtube.com/watch?v=VIDEO_ID
  if (!youtubeVideoId) {
    const watchMatch = html.match(
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/
    );
    if (watchMatch) {
      youtubeVideoId = watchMatch[1];
    }
  }

  // ── Article Content ──
  const contentParts: string[] = [];

  if ($content) {
    $content.find("p, h2, h3, h4, blockquote").each((_, el) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tag = (el as any).tagName;
      const innerHtml = $(el).html()?.trim();
      if (innerHtml) {
        contentParts.push(`<${tag}>${innerHtml}</${tag}>`);
      }
    });
  }

  // Fallback: grab all paragraphs
  if (contentParts.length === 0) {
    $("p").each((_, el) => {
      const text = $(el).html()?.trim();
      if (text && text.length > 20) {
        contentParts.push(`<p>${text}</p>`);
      }
    });
  }

  // Build final content with images at the top and YouTube embed at the bottom
  const finalParts: string[] = [];

  // Insert image gallery at the top of content
  if (images.length > 0) {
    const imageHtml = images
      .map(
        (url) =>
          `<img src="${url}" alt="${title}" loading="lazy" style="width:100%;border-radius:8px;margin-bottom:8px;" />`
      )
      .join("\n");
    finalParts.push(
      `<div class="article-gallery" style="display:grid;gap:8px;margin-bottom:2rem;">${imageHtml}</div>`
    );
  }

  // Add text content
  finalParts.push(...contentParts);

  // Add YouTube embed at the bottom
  if (youtubeVideoId) {
    finalParts.push(
      `<div class="youtube-embed" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin-top:2rem;border-radius:12px;">` +
        `<iframe src="https://www.youtube.com/embed/${youtubeVideoId}" ` +
        `style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:12px;" ` +
        `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
        `allowfullscreen title="${title}"></iframe>` +
        `</div>`
    );
  }

  const content = finalParts.join("\n");

  // Build excerpt
  const firstParagraph = contentParts.find((p) => {
    const text = p.replace(/<[^>]+>/g, "").trim();
    return text.length > 30;
  });
  const excerpt = firstParagraph
    ? firstParagraph.replace(/<[^>]+>/g, "").trim().slice(0, 200)
    : "";

  // Use first image as cover, or fallback to listing page cover
  const coverImage =
    images.length > 0 ? images[0] : listingCoverImage || "";

  return {
    title: title || slug.replace(/-/g, " "),
    slug,
    date,
    author,
    content,
    excerpt,
    coverImage,
    images,
    youtubeVideoId,
  };
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const listingHtml = await fetchPage(ARTICLES_URL);
    const articleLinks = parseArticleListing(listingHtml);

    if (articleLinks.length === 0) {
      return NextResponse.json(
        { error: "No articles found on the listing page" },
        { status: 404 }
      );
    }

    const articles: ScrapedArticle[] = [];

    for (const link of articleLinks) {
      try {
        const articleUrl = `${ARTICLES_URL}/${link.slug}`;
        const articleHtml = await fetchPage(articleUrl);
        const article = parseArticlePage(
          articleHtml,
          link.slug,
          link.coverImage
        );
        articles.push(article);
      } catch (err) {
        console.error(`Failed to scrape article ${link.slug}:`, err);
      }
    }

    return NextResponse.json({
      count: articles.length,
      articles: articles.map((a) => ({
        title: a.title,
        slug: a.slug,
        date: a.date,
        coverImage: a.coverImage,
        imageCount: a.images.length,
        youtubeVideoId: a.youtubeVideoId,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to scrape articles" },
      { status: 500 }
    );
  }
}

export async function POST() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Scrape articles
    const listingHtml = await fetchPage(ARTICLES_URL);
    const articleLinks = parseArticleListing(listingHtml);

    if (articleLinks.length === 0) {
      return NextResponse.json(
        { error: "No articles found on the listing page" },
        { status: 404 }
      );
    }

    const scrapedArticles: ScrapedArticle[] = [];
    for (const link of articleLinks) {
      try {
        const articleUrl = `${ARTICLES_URL}/${link.slug}`;
        const articleHtml = await fetchPage(articleUrl);
        const article = parseArticlePage(
          articleHtml,
          link.slug,
          link.coverImage
        );
        scrapedArticles.push(article);
      } catch (err) {
        console.error(`Failed to scrape article ${link.slug}:`, err);
      }
    }

    // Step 2: Check for duplicates and save new articles
    const existingIndex = await getPostIndex();
    const existingSlugs = new Set(existingIndex.map((p) => p.slug));

    const saved: Post[] = [];
    const skipped: string[] = [];

    for (const article of scrapedArticles) {
      if (existingSlugs.has(article.slug)) {
        skipped.push(article.slug);
        continue;
      }

      const id = generateId();
      const now = new Date().toISOString();
      let createdAt = now;

      if (article.date) {
        const parsed = new Date(article.date);
        if (!isNaN(parsed.getTime())) {
          if (parsed.getFullYear() < 2020) {
            parsed.setFullYear(2024);
          }
          createdAt = parsed.toISOString();
        }
      }

      // Upload images to Vercel Blob
      let coverImageUrl = article.coverImage;
      let contentWithBlobImages = article.content;

      // Upload cover image
      if (coverImageUrl && coverImageUrl.includes("squarespace-cdn.com")) {
        coverImageUrl = await uploadImageToBlob(coverImageUrl, article.slug, 0);
      }

      // Upload all article images and replace URLs in content
      for (let i = 0; i < article.images.length; i++) {
        const originalUrl = article.images[i];
        if (originalUrl.includes("squarespace-cdn.com")) {
          const blobUrl = await uploadImageToBlob(
            originalUrl,
            article.slug,
            i + 1
          );
          // Replace original URL with blob URL in content
          contentWithBlobImages = contentWithBlobImages.replaceAll(
            originalUrl,
            blobUrl
          );
        }
      }

      const post: Post = {
        id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        coverImage: coverImageUrl,
        content: contentWithBlobImages,
        createdAt,
        updatedAt: createdAt,
      };

      await savePost(post);
      saved.push(post);
    }

    return NextResponse.json({
      saved: saved.length,
      skipped: skipped.length,
      skippedSlugs: skipped,
      posts: saved.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        coverImage: p.coverImage,
        hasContent: p.content.length > 0,
      })),
    });
  } catch (err) {
    console.error("Failed to scrape and save articles:", err);
    return NextResponse.json(
      { error: "Failed to scrape and save articles" },
      { status: 500 }
    );
  }
}
