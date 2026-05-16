import { getPostIndex } from "@/lib/posts";
import ArticlesGallery from "@/components/ArticlesGallery";

export const revalidate = 60;

export default async function ArticlesPage() {
  const posts = await getPostIndex();
  const sorted = posts.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return <ArticlesGallery posts={sorted} />;
}
