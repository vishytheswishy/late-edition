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

  return <EventsGallery events={sorted} />;
}
