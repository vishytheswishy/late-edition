import Home from "@/components/Home";
import { getLookbookData } from "@/lib/lookbook";
import { getEventIndex } from "@/lib/events";

export const revalidate = 300;

// Shuffle server-side so the client hydrates with the same order it rendered
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default async function Page() {
  const [lookbook, events] = await Promise.all([
    getLookbookData(),
    getEventIndex(),
  ]);

  const lookbookImages = shuffleArray(lookbook.images.map((img) => img.url));
  const latestEvents = [...events]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 3);

  return (
    <>
      <link
        rel="preload"
        as="image"
        href="/cover/front.jpg"
        fetchPriority="high"
      />
      <link rel="preload" as="image" href="/cover/back.jpg" />
      <link rel="preload" as="image" href="/cover/spine.jpg" />
      <Home lookbookImages={lookbookImages} events={latestEvents} />
    </>
  );
}
