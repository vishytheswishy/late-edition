"use client";

import { useCart } from "@/context/CartContext";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(parseFloat(amount));
}

export default function CartDrawer() {
  const {
    cart,
    cartOpen,
    loading,
    setCartOpen,
    updateLineItem,
    removeLineItem,
  } = useCart();

  const lines = cart?.lines ?? [];

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
            className="fixed right-0 top-0 bottom-0 z-[201] w-full max-w-md bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-black/10">
              <h2 className="text-sm uppercase tracking-wider">Cart</h2>
              <button
                onClick={() => setCartOpen(false)}
                className="text-xs uppercase tracking-wider text-black/50 hover:text-black transition-colors"
              >
                Close
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {lines.length === 0 ? (
                <p className="text-sm text-black/50 text-center mt-16">
                  Your cart is empty.
                </p>
              ) : (
                <ul className="space-y-6">
                  {lines.map((line) => {
                    const merch = line.merchandise;
                    return (
                      <li key={line.id} className="flex gap-4">
                        {/* Thumbnail */}
                        <div className="relative w-20 h-24 flex-shrink-0 bg-neutral-100 overflow-hidden">
                          {merch.image ? (
                            <Image
                              src={merch.image.url}
                              alt={
                                merch.image.altText ??
                                merch.product.title
                              }
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-[8px] text-black/30 uppercase">
                              No img
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <p className="text-sm font-normal leading-snug truncate">
                              {merch.product.title}
                            </p>
                            {merch.title !== "Default Title" && (
                              <p className="text-[10px] text-black/50 uppercase tracking-wider mt-0.5">
                                {merch.title}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            {/* Quantity controls */}
                            <div className="flex items-center border border-black/15">
                              <button
                                onClick={() =>
                                  line.quantity <= 1
                                    ? removeLineItem(line.id)
                                    : updateLineItem(
                                        line.id,
                                        line.quantity - 1,
                                      )
                                }
                                disabled={loading}
                                className="px-2 py-1 text-xs text-black/60 hover:text-black transition-colors disabled:opacity-30"
                              >
                                -
                              </button>
                              <span className="px-2 py-1 text-xs min-w-[24px] text-center">
                                {line.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateLineItem(line.id, line.quantity + 1)
                                }
                                disabled={loading}
                                className="px-2 py-1 text-xs text-black/60 hover:text-black transition-colors disabled:opacity-30"
                              >
                                +
                              </button>
                            </div>

                            <p className="text-xs text-black/70">
                              {formatPrice(
                                merch.price.amount,
                                merch.price.currencyCode,
                              )}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            {lines.length > 0 && cart && (
              <div className="border-t border-black/10 px-6 py-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-black/50">
                    Subtotal
                  </span>
                  <span className="text-sm">
                    {formatPrice(
                      cart.cost.subtotalAmount.amount,
                      cart.cost.subtotalAmount.currencyCode,
                    )}
                  </span>
                </div>
                <p className="text-[10px] text-black/40">
                  Shipping and taxes calculated at checkout.
                </p>
                <a
                  href={cart.checkoutUrl}
                  className="block w-full py-3 text-center text-xs uppercase tracking-wider bg-black text-white hover:bg-black/80 transition-colors"
                >
                  Checkout
                </a>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
