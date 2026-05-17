import { getProduct, getProducts } from "@/lib/shopify";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";

export const revalidate = 300;

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(parseFloat(amount));
}

const pad = (n: number) => String(n).padStart(2, "0");

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

  // Resolve this product's catalog item number from the full list, so the
  // detail page reads as a real catalog page ("№02 of 08").
  let itemNo: number | null = null;
  let total = 0;
  try {
    const all = await getProducts();
    total = all.length;
    const idx = all.findIndex((p) => p.handle === product.handle);
    itemNo = idx >= 0 ? idx + 1 : null;
  } catch {
    // ignore — itemNo is decorative
  }

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      {/* ─── Masthead (mirrors the catalog index) ─── */}
      <header className="border-b-2 border-black">
        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-8 pb-5">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-black/60">
                A Late Edition Mail-Order Catalog
              </p>
              <Link
                href="/shop"
                className="mt-1 inline-block text-3xl md:text-4xl font-normal tracking-[-0.02em] leading-none hover:text-red-600 transition-colors"
              >
                Wares
              </Link>
            </div>
            <div className="text-right text-[10px] uppercase tracking-[0.3em] text-black/60">
              <p>Issue 002 — Spring 2026</p>
              {itemNo && (
                <p className="mt-1 tabular-nums">
                  <span className="text-red-600">№{pad(itemNo)}</span> /{" "}
                  {pad(total)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Breadcrumb strip */}
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-3 border-t border-black/15 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-black/55">
          <Link href="/shop" className="hover:text-red-600 transition-colors">
            ← Back to Catalog
          </Link>
          <span className="text-black/20">·</span>
          <span className="text-black">{product.title}</span>
        </div>
      </header>

      {/* ─── Spread ─── */}
      <main className="max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-10">
          {/* Gallery */}
          <div className="md:col-span-7 flex flex-col gap-4">
            {product.images.length > 0 ? (
              product.images.map((image, i) => (
                <div
                  key={image.url}
                  className="relative aspect-[4/5] w-full bg-gray-50 border border-black/10"
                >
                  <Image
                    src={image.url}
                    alt={image.altText ?? `${product.title} — figure ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 55vw"
                    className="object-contain p-6 md:p-8"
                    priority={i === 0}
                  />
                  <span className="absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.3em] text-black/40 tabular-nums">
                    Fig. {pad(i + 1)}
                  </span>
                </div>
              ))
            ) : (
              <div className="aspect-[4/5] w-full bg-gray-50 border border-black/10 flex items-center justify-center">
                <span className="text-[10px] uppercase tracking-[0.2em] text-black/30">
                  No image
                </span>
              </div>
            )}
          </div>

          {/* Copy column */}
          <div className="md:col-span-5">
            <div className="md:sticky md:top-28 flex flex-col gap-6">
              <div>
                {itemNo && (
                  <p className="text-[10px] uppercase tracking-[0.3em] text-red-600 tabular-nums mb-3">
                    Item №{pad(itemNo)}
                  </p>
                )}
                <h1 className="text-3xl md:text-4xl font-normal tracking-tight leading-[1.05]">
                  {product.title}
                </h1>
                <p className="text-base md:text-lg tabular-nums mt-3 text-black/70">
                  {formatPrice(price.amount, price.currencyCode)}
                </p>
              </div>

              {(product.descriptionHtml || product.description) && (
                <div
                  className="prose prose-sm max-w-none text-black/65 border-l-2 border-black/10 pl-4 [&_p]:leading-relaxed [&_p]:my-2"
                  dangerouslySetInnerHTML={{
                    __html: product.descriptionHtml || product.description,
                  }}
                />
              )}

              <AddToCartButton variants={product.variants} />

              <p className="text-[10px] uppercase tracking-[0.3em] text-black/40 pt-2 border-t border-black/10">
                Ships within 1–2 weeks from Orange County
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="max-w-6xl mx-auto px-6 md:px-10 py-10 border-t border-black/10">
        <Link
          href="/shop"
          className="text-[10px] uppercase tracking-[0.3em] text-black/60 hover:text-red-600 transition-colors"
        >
          ← Back to Catalog
        </Link>
      </footer>
    </div>
  );
}
