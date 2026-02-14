"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { PostMeta } from "@/lib/posts";

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

interface ArticlesGalleryProps {
  posts: PostMeta[];
}

export default function ArticlesGallery({ posts }: ArticlesGalleryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const featured = posts[0] ?? null;
  const rest = posts.slice(1);

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
              The Latest
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-3xl md:text-4xl font-light tracking-tight text-black"
            >
              Articles
            </motion.h1>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="relative w-full">
        <div className="container mx-auto px-4">
          {posts.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-40 md:py-52">
              <svg
                viewBox="0 0 120 90"
                fill="none"
                className="w-24 md:w-32 mb-8"
                aria-hidden
              >
                {/* Newspaper / article icon */}
                <rect
                  x="20"
                  y="15"
                  width="80"
                  height="60"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-black/20"
                  fill="none"
                />
                <line
                  x1="32"
                  y1="30"
                  x2="88"
                  y2="30"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-black/20"
                />
                <line
                  x1="32"
                  y1="40"
                  x2="68"
                  y2="40"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-black/15"
                />
                <line
                  x1="32"
                  y1="50"
                  x2="78"
                  y2="50"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-black/15"
                />
                <line
                  x1="32"
                  y1="60"
                  x2="58"
                  y2="60"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-black/10"
                />
              </svg>
              <p className="text-sm text-black/40 font-light">
                No articles yet.
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
              className="py-8 md:py-16 max-w-5xl mx-auto"
            >
              {/* ── Featured article (latest) ── */}
              {featured && (
                <motion.div
                  variants={itemVariants}
                  className="relative mb-8 md:mb-12"
                  onMouseEnter={() => setHoveredId(featured.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <Link
                    href={`/articles/${featured.slug}`}
                    className="group block"
                  >
                    {/* Featured cover image */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-50 rounded-sm">
                      {featured.coverImage ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={featured.coverImage}
                            alt={featured.title}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                          />

                          {/* Hover overlay */}
                          <AnimatePresence>
                            {hoveredId === featured.id && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 bg-black/[0.04] flex items-end justify-center pb-8"
                              >
                                <span className="text-[10px] uppercase tracking-[0.2em] text-black/60 bg-white/80 backdrop-blur-sm px-5 py-2.5 border border-black/10">
                                  Read Article
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-black/30 uppercase tracking-wider">
                          No cover
                        </div>
                      )}
                    </div>

                    {/* Featured info */}
                    <div className="pt-5 pb-2">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-black/40 mb-2">
                        {new Date(featured.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </p>
                      <h2 className="text-2xl md:text-3xl font-normal tracking-tight leading-snug text-black group-hover:text-black/70 transition-colors">
                        {featured.title}
                      </h2>
                      {featured.excerpt && (
                        <p className="text-sm text-black/50 font-light line-clamp-2 mt-2 max-w-2xl">
                          {featured.excerpt}
                        </p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              )}

              {/* ── Article grid ── */}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                  {rest.map((post) => {
                    const isHovered = hoveredId === post.id;

                    return (
                      <motion.div
                        key={post.id}
                        variants={itemVariants}
                        className="relative"
                        onMouseEnter={() => setHoveredId(post.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <Link
                          href={`/articles/${post.slug}`}
                          className="group block"
                        >
                          {/* Cover image */}
                          <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-50 rounded-sm">
                            {post.coverImage ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={post.coverImage}
                                  alt={post.title}
                                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                                />

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
                                        Read Article
                                      </span>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </>
                            ) : (
                              <div className="flex items-center justify-center h-full text-xs text-black/30 uppercase tracking-wider">
                                No cover
                              </div>
                            )}
                          </div>

                          {/* Article info */}
                          <div className="pt-4 pb-2">
                            <p className="text-[10px] uppercase tracking-[0.15em] text-black/40 mb-1.5">
                              {new Date(post.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </p>
                            <h2 className="text-base md:text-lg font-normal tracking-tight leading-snug text-black group-hover:text-black/70 transition-colors">
                              {post.title}
                            </h2>
                            {post.excerpt && (
                              <p className="text-sm text-black/50 font-light line-clamp-2 mt-1">
                                {post.excerpt}
                              </p>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Bottom spacer */}
        {posts.length > 0 && <div className="pb-8 md:pb-16" />}
      </section>
    </div>
  );
}
