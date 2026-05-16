import { getAllAlbumsWithPhotos } from "@/lib/albums";
import PhotoAlbumsClient from "./PhotoAlbumsClient";

export const revalidate = 60;

export default async function PhotosPage() {
  const albums = await getAllAlbumsWithPhotos();
  const sorted = albums.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return <PhotoAlbumsClient albums={sorted} />;
}
