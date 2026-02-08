"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { ShopifyCart } from "@/lib/shopify";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CartContextValue {
  cart: ShopifyCart | null;
  cartOpen: boolean;
  loading: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  updateLineItem: (lineId: string, quantity: number) => Promise<void>;
  removeLineItem: (lineId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const CART_ID_KEY = "shopify_cart_id";

// ---------------------------------------------------------------------------
// Helper: call the /api/cart proxy
// ---------------------------------------------------------------------------

async function cartFetch(body: Record<string, unknown>): Promise<ShopifyCart> {
  const res = await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Cart API error");
  return json.cart;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<ShopifyCart | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Hydrate cart from localStorage on mount
  useEffect(() => {
    const savedCartId = localStorage.getItem(CART_ID_KEY);
    if (!savedCartId) return;

    cartFetch({ action: "get", cartId: savedCartId })
      .then((c) => {
        if (c && c.lines.length > 0) {
          setCart(c);
        } else {
          // Cart expired or empty — clear it
          localStorage.removeItem(CART_ID_KEY);
        }
      })
      .catch(() => {
        localStorage.removeItem(CART_ID_KEY);
      });
  }, []);

  // Persist cart id whenever it changes
  useEffect(() => {
    if (cart?.id) {
      localStorage.setItem(CART_ID_KEY, cart.id);
    }
  }, [cart?.id]);

  const ensureCart = useCallback(async (): Promise<string> => {
    if (cart?.id) return cart.id;
    const newCart = await cartFetch({ action: "create" });
    setCart(newCart);
    return newCart.id;
  }, [cart?.id]);

  const addToCart = useCallback(
    async (variantId: string, quantity = 1) => {
      setLoading(true);
      try {
        const cartId = await ensureCart();
        const updatedCart = await cartFetch({
          action: "add",
          cartId,
          variantId,
          quantity,
        });
        setCart(updatedCart);
        setCartOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [ensureCart],
  );

  const updateLineItem = useCallback(
    async (lineId: string, quantity: number) => {
      if (!cart?.id) return;
      setLoading(true);
      try {
        const updatedCart = await cartFetch({
          action: "update",
          cartId: cart.id,
          lineId,
          quantity,
        });
        setCart(updatedCart);
      } finally {
        setLoading(false);
      }
    },
    [cart?.id],
  );

  const removeLineItem = useCallback(
    async (lineId: string) => {
      if (!cart?.id) return;
      setLoading(true);
      try {
        const updatedCart = await cartFetch({
          action: "remove",
          cartId: cart.id,
          lineIds: [lineId],
        });
        setCart(updatedCart);
      } finally {
        setLoading(false);
      }
    },
    [cart?.id],
  );

  const value = useMemo(
    () => ({
      cart,
      cartOpen,
      loading,
      setCartOpen,
      addToCart,
      updateLineItem,
      removeLineItem,
    }),
    [cart, cartOpen, loading, addToCart, updateLineItem, removeLineItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
