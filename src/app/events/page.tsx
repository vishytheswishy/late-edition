import { getEventIndex } from "@/lib/events";
import EventsGallery from "@/components/EventsGallery";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await getEventIndex();
  const sorted = events.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return <EventsGallery events={sorted} />;
}
