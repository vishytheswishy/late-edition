"use client";

import { useCart } from "@/context/CartContext";
import { useState } from "react";
import type { ShopifyVariant } from "@/lib/shopify";

interface AddToCartButtonProps {
  variants: ShopifyVariant[];
}

export default function AddToCartButton({ variants }: AddToCartButtonProps) {
  const { addToCart, loading } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState(
    variants[0]?.id ?? "",
  );

  const hasMultipleVariants =
    variants.length > 1 || (variants.length === 1 && variants[0].title !== "Default Title");

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const isAvailable = selectedVariant?.availableForSale ?? false;

  return (
    <div className="space-y-4">
      {/* Variant selector */}
      {hasMultipleVariants && (
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-black/50 mb-2">
            Option
          </label>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariantId(variant.id)}
                disabled={!variant.availableForSale}
                className={`px-4 py-2 text-xs uppercase tracking-wider border transition-colors ${
                  selectedVariantId === variant.id
                    ? "border-black bg-black text-white"
                    : variant.availableForSale
                      ? "border-black/20 text-black hover:border-black"
                      : "border-black/10 text-black/30 cursor-not-allowed line-through"
                }`}
              >
                {variant.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add to cart */}
      <button
        onClick={() => addToCart(selectedVariantId)}
        disabled={loading || !isAvailable}
        className={`w-full py-3 text-xs uppercase tracking-wider transition-colors ${
          isAvailable
            ? "bg-black text-white hover:bg-black/80"
            : "bg-black/10 text-black/30 cursor-not-allowed"
        }`}
      >
        {loading
          ? "Adding..."
          : isAvailable
            ? "Add to Cart"
            : "Sold Out"}
      </button>
    </div>
  );
}
