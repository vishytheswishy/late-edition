import { getProducts } from "@/lib/shopify";
import Image from "next/image";
import Link from "next/link";

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(parseFloat(amount));
}

export default async function ShopPage() {
  let products;
  try {
    products = await getProducts();
  } catch {
    products = null;
  }

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-normal tracking-tight mb-12">Shop</h1>

        {!products || products.length === 0 ? (
          <p className="text-sm text-black/60">
            No products available yet. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
            {products.map((product) => {
              const image = product.images[0];
              const price = product.priceRange.minVariantPrice;

              return (
                <Link
                  key={product.id}
                  href={`/shop/${product.handle}`}
                  className="group block"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 mb-4">
                    {image ? (
                      <Image
                        src={image.url}
                        alt={image.altText ?? product.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-black/30 uppercase tracking-wider">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-sm font-normal tracking-tight leading-snug">
                      {product.title}
                    </h2>
                    <p className="text-xs text-black/60">
                      {formatPrice(price.amount, price.currencyCode)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
