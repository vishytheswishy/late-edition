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
      {/* ── Wardrobe hero ── */}
      <section className="relative w-full border-b border-black/10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center py-20 md:py-28">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[10px] uppercase tracking-[0.3em] text-black/40 mb-4"
            >
              The Wardrobe
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-5xl md:text-7xl font-light tracking-tight text-black"
            >
              Shop
            </motion.h1>
          </div>
        </div>
      </section>

      {/* ── Clothing rail ── */}
      <section className="relative w-full">
        {/* The rail — a bold horizontal line */}
        <div className="relative">
          <div className="w-full h-[2px] bg-black/15" />
          {/* Small end caps */}
          <div className="absolute left-4 md:left-8 -top-[4px] w-[10px] h-[10px] rounded-full bg-black/10" />
          <div className="absolute right-4 md:right-8 -top-[4px] w-[10px] h-[10px] rounded-full bg-black/10" />
        </div>

        {/* ── Products ── */}
        <div className="container mx-auto px-4">
          {!hasProducts ? (
            /* Empty wardrobe */
            <div className="flex flex-col items-center justify-center py-40 md:py-52">
              {/* Single empty hanger */}
              <svg
                viewBox="0 0 120 60"
                fill="none"
                className="w-24 md:w-32 mb-8"
                aria-hidden
              >
                <path
                  d="M60 0 C60 0 60 8 60 12 C60 18 54 22 54 22"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-black/20"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M60 22 L12 52 L108 52 L60 22 Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-black/20"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              <p className="text-sm text-black/40 font-light">
                Nothing hanging here yet.
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
              className="py-12 md:py-16"
            >
              {/* Product grid — each item hangs from the rail */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-0 gap-y-0">
                {products.map((product) => {
                  const image = product.images[0];
                  const price = product.priceRange.minVariantPrice;
                  const isHovered = hoveredId === product.id;

                  return (
                    <motion.div
                      key={product.id}
                      variants={itemVariants}
                      className="relative border-b border-r border-black/10 last:border-r-0 sm:last:border-r sm:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(3n)]:border-r-0"
                      onMouseEnter={() => setHoveredId(product.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <Link
                        href={`/shop/${product.handle}`}
                        className="group block"
                      >
                        {/* Hanger wire — connects to rail */}
                        <div className="flex justify-center pt-6 pb-2">
                          <svg
                            viewBox="0 0 100 50"
                            fill="none"
                            className="w-20 md:w-24"
                            aria-hidden
                          >
                            {/* Hook curve */}
                            <path
                              d="M50 0 C50 0 50 6 50 10 C50 16 45 18 45 18"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              className="text-black/20 group-hover:text-black/35 transition-colors duration-300"
                              strokeLinecap="round"
                              fill="none"
                            />
                            {/* Left shoulder */}
                            <path
                              d="M50 18 L10 44"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              className="text-black/20 group-hover:text-black/35 transition-colors duration-300"
                              strokeLinecap="round"
                            />
                            {/* Right shoulder */}
                            <path
                              d="M50 18 L90 44"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              className="text-black/20 group-hover:text-black/35 transition-colors duration-300"
                              strokeLinecap="round"
                            />
                            {/* Bottom bar */}
                            <path
                              d="M10 44 L90 44"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              className="text-black/20 group-hover:text-black/35 transition-colors duration-300"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>

                        {/* Product image */}
                        <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-50 mx-auto">
                          {image ? (
                            <Image
                              src={image.url}
                              alt={image.altText ?? product.title}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-xs text-black/30 uppercase tracking-wider">
                              No image
                            </div>
                          )}

                          {/* Hover overlay — quick-view hint */}
                          <AnimatePresence>
                            {isHovered && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 bg-black/[0.03] flex items-end justify-center pb-6"
                              >
                                <span className="text-[10px] uppercase tracking-[0.2em] text-black/50 bg-white/80 backdrop-blur-sm px-4 py-2 border border-black/10">
                                  View
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Product info */}
                        <div className="px-5 py-5 md:px-6 md:py-6">
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

        {/* Bottom shelf */}
        <div className="w-full h-[2px] bg-black/15" />
      </section>
    </div>
  );
}
