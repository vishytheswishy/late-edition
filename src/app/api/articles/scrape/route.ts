import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import {
  getPostIndex,
  savePostIndex,
  savePost,
  generateId,
  type Post,
  type PostMeta,
} from "@/lib/posts";
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
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function parseArticleListing(html: string): { title: string; slug: string }[] {
  const $ = cheerio.load(html);
  const articles: { title: string; slug: string }[] = [];

  // Find all article links on the listing page
  $('a[href*="/articles/"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/\/articles\/([^/?#]+)/);
    if (!match) return;

    const slug = match[1];
    // Skip the listing page itself or duplicate slugs
    if (!slug || slug === "articles" || articles.some((a) => a.slug === slug))
      return;

    // Try to get the title from the link text or a heading inside
    const title =
      $(el).find("h1, h2, h3, h4").first().text().trim() ||
      $(el).text().trim();

    if (title) {
      articles.push({ title, slug });
    }
  });

  return articles;
}

function parseArticlePage(html: string, slug: string): ScrapedArticle {
  const $ = cheerio.load(html);

  // Extract title from h1
  const title = $("h1").first().text().trim();

  // Extract date — look for common date patterns in the page
  let date = "";
  let author = "Kamden";

  // Look for date in meta or visible text near the top
  // Squarespace often puts dates in <time> tags or specific class elements
  $("time").each((_, el) => {
    const datetime = $(el).attr("datetime") || $(el).text().trim();
    if (datetime) date = datetime;
  });

  // If no <time> tag, search for date-like text in the page metadata area
  if (!date) {
    $(".blog-meta, .entry-date, .post-date, .date, [class*='date']").each(
      (_, el) => {
        const text = $(el).text().trim();
        if (text && !date) date = text;
      }
    );
  }

  // Build the article content as HTML
  // Look for the main content area
  const contentParts: string[] = [];
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

  if ($content) {
    // Process paragraphs and text within the content
    $content.find("p, h2, h3, h4, blockquote").each((_, el) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tag = (el as any).tagName;
      const innerHtml = $(el).html()?.trim();
      if (innerHtml) {
        contentParts.push(`<${tag}>${innerHtml}</${tag}>`);
      }
    });
  }

  // Fallback: grab all paragraphs from the page body
  if (contentParts.length === 0) {
    $("p").each((_, el) => {
      const text = $(el).html()?.trim();
      if (text && text.length > 20) {
        contentParts.push(`<p>${text}</p>`);
      }
    });
  }

  const content = contentParts.join("\n");

  // Build excerpt from first meaningful paragraph
  const firstParagraph = contentParts.find((p) => {
    const text = p.replace(/<[^>]+>/g, "").trim();
    return text.length > 30;
  });
  const excerpt = firstParagraph
    ? firstParagraph.replace(/<[^>]+>/g, "").trim().slice(0, 200)
    : "";

  return {
    title: title || slug.replace(/-/g, " "),
    slug,
    date,
    author,
    content,
    excerpt,
  };
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Scrape the articles listing page
    const listingHtml = await fetchPage(ARTICLES_URL);
    const articleLinks = parseArticleListing(listingHtml);

    if (articleLinks.length === 0) {
      return NextResponse.json(
        { error: "No articles found on the listing page" },
        { status: 404 }
      );
    }

    // Step 2: Scrape each individual article page
    const articles: ScrapedArticle[] = [];

    for (const link of articleLinks) {
      try {
        const articleUrl = `${ARTICLES_URL}/${link.slug}`;
        const articleHtml = await fetchPage(articleUrl);
        const article = parseArticlePage(articleHtml, link.slug);
        articles.push(article);
      } catch (err) {
        console.error(`Failed to scrape article ${link.slug}:`, err);
        // Continue with remaining articles
      }
    }

    return NextResponse.json({
      count: articles.length,
      articles,
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
    // Step 1: Scrape articles (same as GET)
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
        const article = parseArticlePage(articleHtml, link.slug);
        scrapedArticles.push(article);
      } catch (err) {
        console.error(`Failed to scrape article ${link.slug}:`, err);
      }
    }

    // Step 2: Check for duplicates and save new articles as posts
    const existingIndex = await getPostIndex();
    const existingSlugs = new Set(existingIndex.map((p) => p.slug));

    const saved: Post[] = [];
    const skipped: string[] = [];
    const newMetas: PostMeta[] = [];

    for (const article of scrapedArticles) {
      if (existingSlugs.has(article.slug)) {
        skipped.push(article.slug);
        continue;
      }

      const id = generateId();
      const now = new Date().toISOString();
      let createdAt = now;

      // Try parsing the scraped date
      if (article.date) {
        const parsed = new Date(article.date);
        if (!isNaN(parsed.getTime())) {
          if (parsed.getFullYear() < 2020) {
            parsed.setFullYear(2024);
          }
          createdAt = parsed.toISOString();
        }
      }

      const post: Post = {
        id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        coverImage: "",
        content: article.content,
        createdAt,
        updatedAt: createdAt,
      };

      await savePost(post);
      saved.push(post);

      const meta: PostMeta = {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };

      newMetas.push(meta);
    }

    // Save updated index with all new posts
    if (newMetas.length > 0) {
      const updatedIndex = [...existingIndex, ...newMetas];
      await savePostIndex(updatedIndex);
    }

    return NextResponse.json({
      saved: saved.length,
      skipped: skipped.length,
      skippedSlugs: skipped,
      posts: saved,
    });
  } catch (err) {
    console.error("Failed to scrape and save articles:", err);
    return NextResponse.json(
      { error: "Failed to scrape and save articles" },
      { status: 500 }
    );
  }
}
