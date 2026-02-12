import { notFound } from "next/navigation";
import { getAlbumBySlug } from "@/lib/albums";
import PhotoBookClient from "./PhotoBookClient";

export const dynamic = "force-dynamic";

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const album = await getAlbumBySlug(slug);

  if (!album) {
    notFound();
  }

  return (
    <PhotoBookClient
      title={album.title}
      coverImage={album.coverImage || null}
      photos={album.photos}
    />
  );
}
