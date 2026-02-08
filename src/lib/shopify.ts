const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!;
const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const endpoint = `https://${domain}/api/2025-10/graphql.json`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShopifyImage {
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

export interface ShopifyPrice {
  amount: string;
  currencyCode: string;
}

export interface ShopifyVariant {
  id: string;
  title: string;
  price: ShopifyPrice;
  availableForSale: boolean;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  priceRange: {
    minVariantPrice: ShopifyPrice;
  };
  images: ShopifyImage[];
  variants: ShopifyVariant[];
}

export interface CartLineItem {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    product: {
      title: string;
      handle: string;
    };
    price: ShopifyPrice;
    image: ShopifyImage | null;
  };
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: ShopifyPrice;
    totalAmount: ShopifyPrice;
  };
  lines: CartLineItem[];
}

// ---------------------------------------------------------------------------
// GraphQL helpers
// ---------------------------------------------------------------------------

async function shopifyFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  // Private tokens (shpat_, shpss_) use a different header than public tokens
  const isPrivateToken =
    storefrontAccessToken.startsWith("shpat_") ||
    storefrontAccessToken.startsWith("shpss_");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(isPrivateToken
        ? { "Shopify-Storefront-Private-Token": storefrontAccessToken }
        : { "X-Shopify-Storefront-Access-Token": storefrontAccessToken }),
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (json.errors) {
    console.error("Shopify API errors:", json.errors);
    throw new Error(json.errors[0]?.message ?? "Unknown Shopify API error");
  }

  return json.data;
}

// ---------------------------------------------------------------------------
// Helpers to reshape Shopify connection edges into flat arrays
// ---------------------------------------------------------------------------

function reshapeProduct(node: Record<string, unknown>): ShopifyProduct {
  const images = ((node.images as { edges: { node: ShopifyImage }[] }).edges ?? []).map(
    (e: { node: ShopifyImage }) => e.node,
  );
  const variants = ((node.variants as { edges: { node: ShopifyVariant }[] }).edges ?? []).map(
    (e: { node: ShopifyVariant }) => e.node,
  );
  return { ...(node as unknown as ShopifyProduct), images, variants };
}

// ---------------------------------------------------------------------------
// Product queries
// ---------------------------------------------------------------------------

const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    title
    handle
    description
    descriptionHtml
    priceRange {
      minVariantPrice { amount currencyCode }
    }
    images(first: 8) {
      edges { node { url altText width height } }
    }
    variants(first: 25) {
      edges {
        node {
          id
          title
          price: priceV2 { amount currencyCode }
          availableForSale
        }
      }
    }
  }
`;

export async function getProducts(first = 20): Promise<ShopifyProduct[]> {
  const query = `
    ${PRODUCT_FRAGMENT}
    query Products($first: Int!) {
      products(first: $first) {
        edges { node { ...ProductFields } }
      }
    }
  `;

  const data = await shopifyFetch<{
    products: { edges: { node: Record<string, unknown> }[] };
  }>(query, { first });

  return data.products.edges.map((e) => reshapeProduct(e.node));
}

export async function getProduct(handle: string): Promise<ShopifyProduct | null> {
  const query = `
    ${PRODUCT_FRAGMENT}
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) { ...ProductFields }
    }
  `;

  const data = await shopifyFetch<{
    productByHandle: Record<string, unknown> | null;
  }>(query, { handle });

  return data.productByHandle ? reshapeProduct(data.productByHandle) : null;
}

// ---------------------------------------------------------------------------
// Cart queries & mutations
// ---------------------------------------------------------------------------

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              product { title handle }
              price: priceV2 { amount currencyCode }
              image { url altText width height }
            }
          }
        }
      }
    }
  }
`;

function reshapeCart(cart: Record<string, unknown>): ShopifyCart {
  const lines = (
    (cart.lines as { edges: { node: CartLineItem }[] }).edges ?? []
  ).map((e: { node: CartLineItem }) => e.node);
  return { ...(cart as unknown as ShopifyCart), lines };
}

export async function createCart(): Promise<ShopifyCart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartCreate {
      cartCreate { cart { ...CartFields } }
    }
  `;

  const data = await shopifyFetch<{
    cartCreate: { cart: Record<string, unknown> };
  }>(query);

  return reshapeCart(data.cartCreate.cart);
}

export async function addToCart(
  cartId: string,
  variantId: string,
  quantity = 1,
): Promise<ShopifyCart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartLinesAdd: { cart: Record<string, unknown> };
  }>(query, {
    cartId,
    lines: [{ merchandiseId: variantId, quantity }],
  });

  return reshapeCart(data.cartLinesAdd.cart);
}

export async function updateCartLine(
  cartId: string,
  lineId: string,
  quantity: number,
): Promise<ShopifyCart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartLinesUpdate: { cart: Record<string, unknown> };
  }>(query, {
    cartId,
    lines: [{ id: lineId, quantity }],
  });

  return reshapeCart(data.cartLinesUpdate.cart);
}

export async function removeFromCart(
  cartId: string,
  lineIds: string[],
): Promise<ShopifyCart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ...CartFields }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartLinesRemove: { cart: Record<string, unknown> };
  }>(query, { cartId, lineIds });

  return reshapeCart(data.cartLinesRemove.cart);
}

export async function getCart(cartId: string): Promise<ShopifyCart | null> {
  const query = `
    ${CART_FRAGMENT}
    query Cart($cartId: ID!) {
      cart(id: $cartId) { ...CartFields }
    }
  `;

  const data = await shopifyFetch<{
    cart: Record<string, unknown> | null;
  }>(query, { cartId });

  return data.cart ? reshapeCart(data.cart) : null;
}
