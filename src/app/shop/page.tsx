import { getProducts } from "@/lib/shopify";
import WaresCatalog from "@/components/WaresCatalog";

export const revalidate = 300;

export default async function ShopPage() {
  let products;
  try {
    products = await getProducts();
  } catch {
    products = null;
  }

  return <WaresCatalog products={products} />;
}
