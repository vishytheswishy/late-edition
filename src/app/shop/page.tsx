import { getProducts } from "@/lib/shopify";
import WardrobeShop from "@/components/WardrobeShop";

export default async function ShopPage() {
  let products;
  try {
    products = await getProducts();
  } catch {
    products = null;
  }

  return <WardrobeShop products={products} />;
}
