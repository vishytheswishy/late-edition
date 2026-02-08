import { getProduct } from "@/lib/shopify";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(parseFloat(amount));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product) {
    notFound();
  }

  const price = product.priceRange.minVariantPrice;

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-16">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center gap-2 text-xs text-black/50">
            <li>
              <Link
                href="/shop"
                className="hover:text-black transition-colors"
              >
                Shop
              </Link>
            </li>
            <li>/</li>
            <li className="text-black">{product.title}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 max-w-6xl">
          {/* Images */}
          <div className="space-y-4">
            {product.images.length > 0 ? (
              product.images.map((image, i) => (
                <div
                  key={image.url}
                  className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100"
                >
                  <Image
                    src={image.url}
                    alt={image.altText ?? `${product.title} - Image ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority={i === 0}
                  />
                </div>
              ))
            ) : (
              <div className="aspect-[3/4] w-full bg-neutral-100 flex items-center justify-center">
                <span className="text-xs text-black/30 uppercase tracking-wider">
                  No image
                </span>
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="md:sticky md:top-32 md:self-start space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-normal tracking-tight mb-2">
                {product.title}
              </h1>
              <p className="text-sm text-black/60">
                {formatPrice(price.amount, price.currencyCode)}
              </p>
            </div>

            <AddToCartButton variants={product.variants} />

            {product.descriptionHtml && (
              <div
                className="prose prose-sm prose-neutral max-w-none text-black/70 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
