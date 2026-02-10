import Link from "next/link";
import { getEventIndex } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await getEventIndex();
  const sorted = events.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-light tracking-tight mb-16">Events</h1>

        {sorted.length === 0 ? (
          <p className="text-sm text-black/60">
            No events yet. Check back soon.
          </p>
        ) : (
          <div className="flex flex-col gap-16">
            {sorted.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group block"
              >
                <article className="flex flex-col">
                  {event.coverImage && (
                    <div className="w-full aspect-[4/3] overflow-hidden mb-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.coverImage}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                  )}
                  <p className="text-xs text-black/60 font-light tracking-wide mb-2">
                    {new Date(event.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4 group-hover:underline decoration-black/30 underline-offset-4">
                    {event.title}
                  </h2>
                  {event.excerpt && (
                    <p className="text-sm text-black/50 font-light line-clamp-2 mb-3">
                      {event.excerpt}
                    </p>
                  )}
                  <span className="text-sm text-black/70 font-light underline decoration-black/30 underline-offset-4 group-hover:decoration-black/50 transition-colors">
                    View Event
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
