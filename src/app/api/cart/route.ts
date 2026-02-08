import { NextRequest, NextResponse } from "next/server";
import {
  createCart,
  addToCart,
  updateCartLine,
  removeFromCart,
  getCart,
} from "@/lib/shopify";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const cart = await createCart();
        return NextResponse.json({ cart });
      }

      case "add": {
        const { cartId, variantId, quantity } = body;
        if (!cartId || !variantId) {
          return NextResponse.json(
            { error: "cartId and variantId are required" },
            { status: 400 },
          );
        }
        const cart = await addToCart(cartId, variantId, quantity ?? 1);
        return NextResponse.json({ cart });
      }

      case "update": {
        const { cartId: cId, lineId, quantity: qty } = body;
        if (!cId || !lineId || qty == null) {
          return NextResponse.json(
            { error: "cartId, lineId, and quantity are required" },
            { status: 400 },
          );
        }
        const cart = await updateCartLine(cId, lineId, qty);
        return NextResponse.json({ cart });
      }

      case "remove": {
        const { cartId: removeCartId, lineIds } = body;
        if (!removeCartId || !lineIds?.length) {
          return NextResponse.json(
            { error: "cartId and lineIds are required" },
            { status: 400 },
          );
        }
        const cart = await removeFromCart(removeCartId, lineIds);
        return NextResponse.json({ cart });
      }

      case "get": {
        const { cartId: getCartId } = body;
        if (!getCartId) {
          return NextResponse.json(
            { error: "cartId is required" },
            { status: 400 },
          );
        }
        const cart = await getCart(getCartId);
        return NextResponse.json({ cart });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Cart API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
