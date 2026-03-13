import { createStorefrontApiClient } from "@shopify/storefront-api-client";

// Extract store domain from SHOPIFY_APP_URL or use dedicated env var
const getStoreDomain = (): string => {
  if (process.env.SHOPIFY_STORE_DOMAIN) {
    return process.env.SHOPIFY_STORE_DOMAIN;
  }
  // Extract from SHOPIFY_APP_URL (e.g., https://replica-weapons-store.myshopify.com/)
  const appUrl = process.env.SHOPIFY_APP_URL || "";
  const match = appUrl.match(/https?:\/\/([^/]+)/);
  return match ? match[1] : "your-store.myshopify.com";
};

// Storefront API client for public product access
// Note: Requires SHOPIFY_STOREFRONT_ACCESS_TOKEN environment variable
// To get a token:
// 1. Go to Shopify Admin → Settings → Apps and sales channels
// 2. Click "Develop apps" → Create or select an app
// 3. Configure Storefront API scopes (unauthenticated_read_product_listings, etc.)
// 4. Install app and copy the Storefront API access token
export const storefrontClient = createStorefrontApiClient({
  storeDomain: getStoreDomain(),
  apiVersion: "2025-04",
  publicAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || "",
});

// GraphQL fragments for reuse across queries
export const PRODUCT_CARD_FRAGMENT = `#graphql
  fragment ProductCard on Product {
    id
    handle
    title
    featuredImage {
      url
      altText
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
`;

export const PRODUCT_DETAILS_FRAGMENT = `#graphql
  fragment ProductDetails on Product {
    id
    handle
    title
    description
    descriptionHtml
    images(first: 10) {
      nodes {
        url
        altText
        width
        height
      }
    }
    options {
      id
      name
      values
    }
    variants(first: 100) {
      nodes {
        id
        title
        availableForSale
        quantityAvailable
        selectedOptions {
          name
          value
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        image {
          url
          altText
        }
      }
    }
  }
`;

export const CART_FRAGMENT = `#graphql
  fragment CartFragment on Cart {
    id
    checkoutUrl
    totalQuantity
    lines(first: 100) {
      nodes {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            image {
              url
              altText
            }
            price {
              amount
              currencyCode
            }
            product {
              title
              handle
            }
          }
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
      }
    }
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
    }
  }
`;

// Storefront API Queries
export const PRODUCTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        ...ProductCard
      }
    }
    shop {
      name
      description
    }
  }
`;

export const PRODUCT_QUERY = `#graphql
  ${PRODUCT_DETAILS_FRAGMENT}
  query GetProduct($handle: String!) {
    product(handle: $handle) {
      ...ProductDetails
    }
  }
`;

export const CART_QUERY = `#graphql
  ${CART_FRAGMENT}
  query GetCart($cartId: ID!) {
    cart(id: $cartId) {
      ...CartFragment
    }
  }
`;

// Storefront API Mutations
export const CART_CREATE_MUTATION = `#graphql
  ${CART_FRAGMENT}
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        ...CartFragment
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CART_LINES_ADD_MUTATION = `#graphql
  ${CART_FRAGMENT}
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CART_LINES_UPDATE_MUTATION = `#graphql
  ${CART_FRAGMENT}
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CART_LINES_REMOVE_MUTATION = `#graphql
  ${CART_FRAGMENT}
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFragment
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Re-export types from storefront.types.ts for convenience in loaders/actions
export type {
  Money,
  ProductImage,
  ProductVariant,
  ProductOption,
  ProductCard,
  ProductDetails,
  CartLine,
  Cart,
  Shop,
} from "./storefront.types";

export { formatMoney } from "./storefront.types";
