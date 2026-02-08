import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <Link
          href="/#events"
          className="text-sm text-black/40 hover:text-black/60 transition-colors"
        >
          &larr; All Events
        </Link>

        <article className="mt-8">
          <header className="mb-10">
            <time className="text-xs text-black/40 uppercase tracking-wider">
              {new Date(event.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
            <h1 className="text-4xl sm:text-5xl font-normal tracking-tight mt-2">
              {event.title}
            </h1>
            {event.excerpt && (
              <p className="text-lg text-black/50 mt-4">{event.excerpt}</p>
            )}
          </header>

          {event.coverImage && (
            <div className="mb-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.coverImage}
                alt={event.title}
                className="w-full rounded-lg"
              />
            </div>
          )}

          <div
            className="prose prose-lg max-w-none prose-headings:font-normal prose-headings:tracking-tight prose-a:text-black prose-a:underline-offset-4 prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: event.content }}
          />
        </article>
      </main>
    </div>
  );
}
