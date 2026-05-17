"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import BombClock from "./BombClock";
import type { ShopifyProduct } from "@/lib/shopify";

// Inline editorial dropdown — small caps trigger, hairline-bordered panel.
function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-[0.3em] text-black/45">
        {label}
      </span>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-[11px] uppercase tracking-[0.15em] text-red-600 underline underline-offset-4 decoration-1 hover:opacity-70 transition-opacity inline-flex items-center gap-1"
      >
        {value}
        <span className="text-[8px] -translate-y-[1px]">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 z-20 min-w-[140px] bg-white border border-black/20 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          {options.map((opt) => {
            const active = opt === value;
            return (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 text-[11px] uppercase tracking-[0.15em] border-b border-black/10 last:border-b-0 transition-colors ${
                  active
                    ? "text-red-600"
                    : "text-black/70 hover:text-black hover:bg-black/[0.02]"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type SortKey = "featured" | "price-asc" | "price-desc" | "alpha";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price ↑" },
  { key: "price-desc", label: "Price ↓" },
  { key: "alpha", label: "A–Z" },
];
const ALL = "All";

function priceOf(p: ShopifyProduct): number {
  return parseFloat(p.priceRange.minVariantPrice.amount);
}

function sortProducts(list: ShopifyProduct[], key: SortKey): ShopifyProduct[] {
  const arr = [...list];
  switch (key) {
    case "price-asc":
      return arr.sort((a, b) => priceOf(a) - priceOf(b));
    case "price-desc":
      return arr.sort((a, b) => priceOf(b) - priceOf(a));
    case "alpha":
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    case "featured":
    default:
      return arr;
  }
}

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(parseFloat(amount));
}

const pad = (n: number) => String(n).padStart(2, "0");

interface Props {
  products: ShopifyProduct[] | null;
}

interface RowProps {
  product: ShopifyProduct;
  itemNo: number;
}

function CatalogItem({ product, itemNo }: RowProps) {
  const price = product.priceRange.minVariantPrice;
  const img = product.images[0];
  const inStock = product.variants.some((v) => v.availableForSale);

  return (
    <article id={`item-${pad(itemNo)}`} className="flex flex-col">
      {/* Image plate — links into the product page */}
      <Link
        href={`/shop/${product.handle}`}
        aria-label={`Open ${product.title}`}
        className="relative aspect-[4/5] bg-gray-50 border border-black/10 block group focus:outline-none focus:ring-2 focus:ring-black"
      >
        {img ? (
          <Image
            src={img.url}
            alt={img.altText ?? product.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain p-4 md:p-5 transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-black/30">
              No image
            </p>
          </div>
        )}
      </Link>

      {/* Caption block — laid out like a print classified entry */}
      <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3">
        <span className="text-[10px] uppercase tracking-[0.25em] text-red-600 tabular-nums">
          №{pad(itemNo)}
        </span>
        <Link
          href={`/shop/${product.handle}`}
          className="text-sm md:text-base font-medium tracking-tight leading-snug truncate hover:text-red-600 transition-colors"
        >
          {product.title}
        </Link>
        <span className="text-sm tabular-nums text-black">
          {formatPrice(price.amount, price.currencyCode)}
        </span>
      </div>

      {(product.descriptionHtml || product.description) && (
        <div className="mt-2 text-[11px] leading-relaxed text-black/55 line-clamp-2 prose prose-sm max-w-none">
          {product.descriptionHtml ? (
            <div
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
            />
          ) : (
            <p>{product.description}</p>
          )}
        </div>
      )}

      <Link
        href={`/shop/${product.handle}`}
        className={`mt-3 self-start text-[10px] uppercase tracking-[0.3em] transition-colors ${
          inStock ? "text-black hover:text-red-600" : "text-black/40 pointer-events-none"
        }`}
      >
        {inStock ? "View →" : "Sold out"}
      </Link>
    </article>
  );
}

export default function WaresCatalog({ products }: Props) {
  const list = products ?? [];

  const [sort, setSort] = useState<SortKey>("featured");
  const [filterType, setFilterType] = useState<string>(ALL);
  const [filterTag, setFilterTag] = useState<string>(ALL);
  const [inStockOnly, setInStockOnly] = useState(false);

  // Derive filter categories from the product set (skip blanks).
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const p of list) {
      const t = (p.productType ?? "").trim();
      if (t) seen.add(t);
    }
    return [ALL, ...Array.from(seen).sort()];
  }, [list]);

  // Derive tag facet from the union of all product tags.
  const tags = useMemo(() => {
    const seen = new Set<string>();
    for (const p of list) {
      for (const t of p.tags ?? []) {
        const trimmed = t.trim();
        if (trimmed) seen.add(trimmed);
      }
    }
    return [ALL, ...Array.from(seen).sort()];
  }, [list]);

  const view = useMemo(() => {
    const filtered = list.filter((p) => {
      if (filterType !== ALL && p.productType !== filterType) return false;
      if (filterTag !== ALL && !(p.tags ?? []).includes(filterTag)) return false;
      if (inStockOnly && !p.variants.some((v) => v.availableForSale)) return false;
      return true;
    });
    return sortProducts(filtered, sort);
  }, [list, filterType, filterTag, inStockOnly, sort]);

  const sortLabel = SORTS.find((s) => s.key === sort)?.label ?? "Featured";

  // Smooth scroll for index links
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = "smooth";
    return () => {
      html.style.scrollBehavior = prev;
    };
  }, []);

  if (list.length === 0) {
    return (
      <div className="min-h-screen bg-white pt-16 md:pt-20 flex items-center justify-center">
        <p className="text-xs uppercase tracking-[0.2em] text-black/40">
          Nothing here yet. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      {/* ─── Masthead ─── */}
      <header className="border-b-2 border-black">
        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-10 pb-6">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-black/60">
                A Late Edition Mail-Order Catalog
              </p>
              <h1 className="mt-2 text-5xl md:text-7xl lg:text-8xl font-normal tracking-[-0.02em] leading-none">
                Wares
              </h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.3em] text-black/60">
                Issue 002 — Spring 2026
              </p>
              <div className="mt-2 flex justify-end">
                <BombClock />
              </div>
            </div>
          </div>
        </div>

        {/* Filter + Sort strip (inline dropdowns) */}
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-3 border-t border-black/15 flex flex-wrap items-baseline gap-x-8 gap-y-3">
          <Dropdown
            label="Browse"
            value={filterType}
            options={categories}
            onChange={setFilterType}
          />
          {tags.length > 1 && (
            <Dropdown
              label="Tag"
              value={filterTag}
              options={tags}
              onChange={setFilterTag}
            />
          )}
          <Dropdown
            label="Sort"
            value={sortLabel}
            options={SORTS.map((s) => s.label)}
            onChange={(label) => {
              const match = SORTS.find((s) => s.label === label);
              if (match) setSort(match.key);
            }}
          />
          <button
            onClick={() => setInStockOnly((v) => !v)}
            className={`text-[11px] uppercase tracking-[0.15em] transition-colors ${
              inStockOnly
                ? "text-red-600 underline underline-offset-4 decoration-1"
                : "text-black/65 hover:text-black"
            }`}
          >
            In stock only
          </button>
          <span className="ml-auto text-[10px] uppercase tracking-[0.3em] text-black/40 tabular-nums">
            Showing {pad(view.length)} / {pad(list.length)}
          </span>
        </div>

        {/* Index strip */}
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-3 border-t border-black/15 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-black/45">
            Contents
          </p>
          {view.length === 0 ? (
            <span className="text-[11px] uppercase tracking-[0.15em] text-black/35">
              No items match
            </span>
          ) : (
            view.map((p, i) => (
              <a
                key={p.id}
                href={`#item-${pad(i + 1)}`}
                className="text-[11px] uppercase tracking-[0.15em] text-black/70 hover:text-black tabular-nums"
              >
                <span className="text-red-600">№{pad(i + 1)}</span> {p.title}
              </a>
            ))
          )}
        </div>
      </header>

      {/* ─── Catalog body — 3-up grid, like a printed page spread ─── */}
      <main className="max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14">
        {view.length === 0 ? (
          <p className="text-center text-[11px] uppercase tracking-[0.25em] text-black/40 py-10">
            No items match the current filters.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 md:gap-x-10 gap-y-12 md:gap-y-16">
            {view.map((product, i) => (
              <CatalogItem key={product.id} product={product} itemNo={i + 1} />
            ))}
          </div>
        )}
      </main>

      {/* ─── Catalog footer ─── */}
      <footer className="max-w-6xl mx-auto px-6 md:px-10 py-10 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-black/45">
        <span>End of Catalog</span>
        <span className="tabular-nums">
          {pad(view.length)} of {pad(list.length)} items
        </span>
      </footer>
    </div>
  );
}
