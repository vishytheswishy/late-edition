import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";
import RsvpForm from "@/components/RsvpForm";

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

  const hasFlyer = event.coverImage && !event.content.includes("event-flyer");

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20 animate-[fadeInUp_0.6s_ease-out_both]">
      {/* Header section */}
      <div className="container mx-auto px-4 pt-8 max-w-3xl">
        <Link
          href="/events"
          className="text-sm text-black/40 hover:text-black/60 transition-colors"
        >
          &larr; All Events
        </Link>

        <article className="mt-6">
          <header className="mb-8 flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
            <div>
              <time className="text-[10px] text-black/40 uppercase tracking-[0.15em]">
                {new Date(event.eventDate ?? event.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              <h1 className="text-4xl sm:text-5xl font-normal tracking-tight mt-2">
                {event.title}
              </h1>
              {event.excerpt && (
                <p className="text-lg text-black/50 font-light mt-4">
                  {event.excerpt}
                </p>
              )}
            </div>
            {event.poshUrl && (
              <a
                href={event.poshUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 mt-3 inline-flex items-center gap-2 border border-black px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-black hover:bg-black hover:text-white transition-colors"
              >
                RSVP on Posh &rarr;
              </a>
            )}
          </header>
        </article>
      </div>

      {/* Cover image / flyer — full-bleed for impact */}
      {hasFlyer && (
        <div className="w-full mb-10">
          <div className="container mx-auto px-4 max-w-4xl">
            <Image
              src={event.coverImage}
              alt={event.title}
              width={0}
              height={0}
              sizes="(max-width: 896px) 100vw, 896px"
              priority
              className="w-full h-auto"
            />
          </div>
        </div>
      )}

      {/* Event content */}
      <div className="container mx-auto px-4 pb-16 max-w-3xl">
        {event.content && (
          <div
            className="prose prose-lg max-w-none prose-headings:font-normal prose-headings:tracking-tight prose-a:text-black prose-a:underline-offset-4 prose-img:rounded-lg [&_.event-flyer]:not-prose"
            dangerouslySetInnerHTML={{ __html: event.content }}
          />
        )}

        {event.rsvpEnabled && !event.poshUrl && <RsvpForm eventId={event.id} />}
      </div>
    </div>
  );
}
