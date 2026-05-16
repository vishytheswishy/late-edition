import Home from "@/components/Home";

export default function Page() {
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
      <Home />
    </>
  );
}
