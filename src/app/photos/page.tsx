import { getAlbumIndex } from "@/lib/albums";
import PhotosClient from "@/components/PhotosClient";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const albums = await getAlbumIndex();
  const sorted = albums.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return <PhotosClient albums={sorted} />;
}
