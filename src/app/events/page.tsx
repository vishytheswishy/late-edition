import { getEventIndex } from "@/lib/events";
import EventsGallery from "@/components/EventsGallery";

export const revalidate = 60;

export default async function EventsPage() {
  const events = await getEventIndex();
  const sorted = events.sort((a, b) => {
    const aDate = new Date(a.eventDate ?? a.createdAt).getTime();
    const bDate = new Date(b.eventDate ?? b.createdAt).getTime();
    return bDate - aDate;
  });

  // Pick the soonest future event (with a real eventDate). Fall back to the
  // most recent event so the timer always has something to render.
  const now = Date.now();
  const withDate = sorted.filter((e) => e.eventDate);
  const upcoming = withDate
    .filter((e) => new Date(e.eventDate!).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime(),
    )[0];
  const featured = upcoming ?? withDate[0];

  return (
    <div className="pt-16 md:pt-20">
      <EventsGallery
        events={sorted}
        nextEvent={
          featured?.eventDate
            ? { targetISO: featured.eventDate, title: featured.title }
            : null
        }
      />
    </div>
  );
}
