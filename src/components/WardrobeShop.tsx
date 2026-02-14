"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { ShopifyProduct } from "@/lib/shopify";

// ── Helpers ──

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(parseFloat(amount));
}

// ── Animation variants ──

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

// ── Component ──

interface WardrobeShopProps {
  products: ShopifyProduct[] | null;
}

export default function WardrobeShop({ products }: WardrobeShopProps) {
  const hasProducts = products && products.length > 0;
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      {/* ── Hero ── */}
      <section className="relative w-full border-b border-black/10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center py-10 md:py-14">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[10px] uppercase tracking-[0.3em] text-black/40 mb-3"
            >
              The Wardrobe
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-3xl md:text-4xl font-light tracking-tight text-black"
            >
              Shop
            </motion.h1>
          </div>
        </div>
      </section>

      {/* ── Products ── */}
      <section className="relative w-full">
        <div className="container mx-auto px-4">
          {!hasProducts ? (
            <div className="flex flex-col items-center justify-center py-40 md:py-52">
              <p className="text-sm text-black/40 font-light">
                Nothing here yet.
              </p>
              <p className="text-[10px] uppercase tracking-widest text-black/25 mt-2">
                Check back soon
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="py-8 md:py-16 max-w-6xl mx-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {products.map((product) => {
                  const image = product.images[0];
                  const price = product.priceRange.minVariantPrice;
                  const isHovered = hoveredId === product.id;

                  return (
                    <motion.div
                      key={product.id}
                      variants={itemVariants}
                      className="relative"
                      onMouseEnter={() => setHoveredId(product.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <Link
                        href={`/shop/${product.handle}`}
                        className="group block"
                      >
                        {/* Product image */}
                        <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-50 rounded-sm">
                          {image ? (
                            <Image
                              src={image.url}
                              alt={image.altText ?? product.title}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-xs text-black/30 uppercase tracking-wider">
                              No image
                            </div>
                          )}

                          {/* Hover overlay */}
                          <AnimatePresence>
                            {isHovered && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 bg-black/[0.04] flex items-end justify-center pb-6"
                              >
                                <span className="text-[10px] uppercase tracking-[0.2em] text-black/60 bg-white/80 backdrop-blur-sm px-5 py-2.5 border border-black/10">
                                  View
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Product info */}
                        <div className="pt-4 pb-2">
                          <h2 className="text-sm font-normal tracking-tight leading-snug text-black mb-1">
                            {product.title}
                          </h2>
                          <p className="text-xs text-black/50">
                            {formatPrice(price.amount, price.currencyCode)}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom spacer */}
        {hasProducts && <div className="pb-8 md:pb-16" />}
      </section>
    </div>
  );
}
