# feat: Customer-Facing Storefront

**Date:** 2026-03-13
**Type:** Feature
**Status:** Ready for implementation
**Brainstorm:** [2026-03-13-storefront-brainstorm.md](../brainstorms/2026-03-13-storefront-brainstorm.md)

---

## Overview

Build a customer-facing public storefront with three pages: product listing, product details, and shopping cart. Uses Shopify Storefront API for products and Cart API for cart operations, with redirect to Shopify-hosted checkout.

---

## Problem Statement / Motivation

The app currently only has admin-facing routes (`/app/*`). Customers need a public-facing storefront to browse products and make purchases without requiring Shopify Admin authentication.

---

## Proposed Solution

Create a new route prefix `/store/*` with:
- **Layout** (`store.tsx`): Navigation header with dropdown menus, cart icon, and footer
- **Storefront** (`store._index`): Brand info + product grid
- **Product Details** (`store.product.$handle`): Single product with variant selection and add-to-cart
- **Cart** (`store.cart`): Line items, totals, checkout button

---

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Customer)                       │
├─────────────────────────────────────────────────────────────┤
│  localStorage: cartId                                        │
│  React Components: Navigation, ProductGrid, Cart, etc.       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  React Router 7 Server                       │
├─────────────────────────────────────────────────────────────┤
│  store.tsx (layout)                                          │
│  store._index/route.tsx (products)                           │
│  store.product.$handle/route.tsx (details)                   │
│  store.cart/route.tsx (cart)                                 │
├─────────────────────────────────────────────────────────────┤
│  storefront.server.ts (Storefront API client)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Shopify Storefront API                       │
├─────────────────────────────────────────────────────────────┤
│  Products Query    │  Product Query    │  Cart Mutations     │
│  (listing)         │  (by handle)      │  (create/update)    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Shopify Checkout (redirect)                 │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
app/
├── storefront.server.ts              # NEW: Storefront API client
├── utils/
│   └── cart-storage.ts               # NEW: Cart ID localStorage helpers
├── routes/
│   ├── store.tsx                     # NEW: Layout (nav, outlet, footer)
│   ├── store._index/
│   │   ├── route.tsx                 # NEW: Storefront page
│   │   └── styles.module.css         # NEW: Page styles
│   ├── store.product.$handle/
│   │   ├── route.tsx                 # NEW: Product details page
│   │   └── styles.module.css         # NEW: Page styles
│   └── store.cart/
│       ├── route.tsx                 # NEW: Cart page
│       └── styles.module.css         # NEW: Page styles
└── components/
    └── storefront/                   # NEW: Shared components
        ├── Navigation.tsx
        ├── Navigation.module.css
        ├── NavigationDropdown.tsx
        ├── ProductCard.tsx
        ├── ProductCard.module.css
        ├── ProductGrid.tsx
        ├── VariantSelector.tsx
        ├── AddToCartButton.tsx
        ├── CartIcon.tsx
        ├── CartLineItem.tsx
        ├── CartSummary.tsx
        ├── EmptyState.tsx
        ├── LoadingGrid.tsx
        └── Footer.tsx
```

---

## Implementation Phases

### Phase 1: Foundation

Setup Storefront API client and layout structure.

#### Tasks

- [x] Create `app/storefront.server.ts` with Storefront API client
- [ ] Add `SHOPIFY_STOREFRONT_ACCESS_TOKEN` to environment
- [x] Create `app/utils/cart-storage.ts` with localStorage helpers
- [x] Create `app/routes/store.tsx` layout with Outlet and cart context
- [x] Create `app/components/storefront/` directory
- [x] Create basic `Navigation.tsx` component (logo + placeholder links + cart icon)
- [x] Create basic `Footer.tsx` component (placeholder)
- [x] Create `CartIcon.tsx` with item count badge (receives count as prop)

#### Files

**app/storefront.server.ts**
```typescript
import { createStorefrontApiClient } from "@shopify/storefront-api-client";

if (!process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  throw new Error("SHOPIFY_STOREFRONT_ACCESS_TOKEN is required");
}

export const storefrontClient = createStorefrontApiClient({
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN || "your-store.myshopify.com",
  apiVersion: "2025-04",
  publicAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
});

// GraphQL fragments for reuse
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
```

**app/utils/cart-storage.ts**
```typescript
const CART_ID_KEY = "shopify_cart_id";

export function getCartId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CART_ID_KEY);
  } catch {
    return sessionStorage.getItem(CART_ID_KEY) || null;
  }
}

export function setCartId(cartId: string): void {
  try {
    localStorage.setItem(CART_ID_KEY, cartId);
  } catch {
    sessionStorage.setItem(CART_ID_KEY, cartId);
  }
}

export function clearCartId(): void {
  try {
    localStorage.removeItem(CART_ID_KEY);
  } catch {
    sessionStorage.removeItem(CART_ID_KEY);
  }
}
```

**app/routes/store.tsx**
```typescript
import { Outlet, useOutletContext } from "react-router";
import { useState, useEffect } from "react";
import { Navigation } from "~/components/storefront/Navigation";
import { Footer } from "~/components/storefront/Footer";
import { getCartId } from "~/utils/cart-storage";

type CartContext = {
  cartCount: number;
  setCartCount: (count: number) => void;
  cartId: string | null;
  setCartId: (id: string) => void;
};

export default function StoreLayout() {
  const [cartCount, setCartCount] = useState(0);
  const [cartId, setCartIdState] = useState<string | null>(null);

  // Load cart ID from localStorage on mount
  useEffect(() => {
    setCartIdState(getCartId());
  }, []);

  return (
    <div className="store-layout">
      <Navigation cartCount={cartCount} />
      <main>
        <Outlet context={{ cartCount, setCartCount, cartId, setCartId: setCartIdState } satisfies CartContext} />
      </main>
      <Footer />
    </div>
  );
}

// Hook for child routes to access cart context
export function useCart() {
  return useOutletContext<CartContext>();
}
```

---

### Phase 2: Storefront Page

Product listing with grid layout.

#### Tasks

- [x] Create `store._index/route.tsx` with loader for products
- [x] Create `ProductCard.tsx` component
- [x] Create `ProductGrid.tsx` component
- [ ] Create `LoadingGrid.tsx` skeleton component
- [x] Create `EmptyState.tsx` for no products
- [x] Add pagination (24 products per page)

#### GraphQL Query

```graphql
query GetProducts($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    pageInfo {
      hasNextPage
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
```

#### Files

**app/routes/store._index/route.tsx**
```typescript
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { storefrontClient, PRODUCT_CARD_FRAGMENT } from "~/storefront.server";
import { ProductGrid } from "~/components/storefront/ProductGrid";
import { EmptyState } from "~/components/storefront/EmptyState";

const PRODUCTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query GetProducts($first: Int!) {
    products(first: $first) {
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

export async function loader({ request }: LoaderFunctionArgs) {
  const { data, errors } = await storefrontClient.request(PRODUCTS_QUERY, {
    variables: { first: 24 },
  });

  if (errors) {
    throw new Response("Failed to load products", { status: 500 });
  }

  return { products: data.products.nodes, shop: data.shop };
}

export default function Storefront() {
  const { products, shop } = useLoaderData<typeof loader>();

  return (
    <s-page>
      <s-section heading={shop.name}>
        <s-paragraph>{shop.description}</s-paragraph>
      </s-section>
      <s-section heading="Products">
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <EmptyState
            heading="No products available"
            message="Check back soon for new arrivals."
          />
        )}
      </s-section>
    </s-page>
  );
}
```

---

### Phase 3: Product Details Page

Single product view with variant selection and add-to-cart.

#### Tasks

- [x] Create `store.product.$handle/route.tsx` with loader and action
- [x] Create `VariantSelector.tsx` component
- [x] Create `AddToCartButton.tsx` with useFetcher
- [x] Handle product not found (404)
- [x] Handle out-of-stock variants (disable selection)
- [x] Show variant-specific pricing

#### GraphQL Query

```graphql
query GetProduct($handle: String!) {
  product(handle: $handle) {
    id
    title
    description
    images(first: 5) {
      nodes {
        url
        altText
      }
    }
    options {
      name
      values
    }
    variants(first: 100) {
      nodes {
        id
        title
        availableForSale
        selectedOptions {
          name
          value
        }
        price {
          amount
          currencyCode
        }
      }
    }
  }
}
```

#### Cart Create/Add Mutation

```graphql
mutation CartCreate($lines: [CartLineInput!]!) {
  cartCreate(input: { lines: $lines }) {
    cart {
      id
      checkoutUrl
      totalQuantity
    }
    userErrors {
      field
      message
    }
  }
}

mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart {
      id
      checkoutUrl
      totalQuantity
    }
    userErrors {
      field
      message
    }
  }
}
```

#### Files

**app/routes/store.product.$handle/route.tsx**
```typescript
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { storefrontClient } from "~/storefront.server";
import { VariantSelector } from "~/components/storefront/VariantSelector";
import { AddToCartButton } from "~/components/storefront/AddToCartButton";

// ... loader fetches product by handle
// ... action handles cart create/add

export default function ProductDetails() {
  const { product } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  // Variant selection state
  // Add to cart form with fetcher

  return (
    <s-page>
      {/* Product images, title, description */}
      {/* Variant selector */}
      {/* Add to cart button */}
    </s-page>
  );
}
```

---

### Phase 4: Cart Page

Shopping cart with line items, quantity controls, and checkout.

#### Tasks

- [x] Create `store.cart/route.tsx` with loader and action
- [x] Create `CartLineItem.tsx` with quantity controls
- [x] Create `CartSummary.tsx` with totals
- [x] Handle empty cart state
- [x] Handle quantity update (useFetcher)
- [x] Handle remove item (useFetcher)
- [x] Checkout button redirects to `checkoutUrl`
- [ ] Handle expired/invalid cart ID (create new cart)

#### GraphQL Query

```graphql
query GetCart($cartId: ID!) {
  cart(id: $cartId) {
    id
    checkoutUrl
    totalQuantity
    lines(first: 50) {
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
    }
  }
}
```

#### Cart Update/Remove Mutations

```graphql
mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
  cartLinesUpdate(cartId: $cartId, lines: $lines) {
    cart {
      id
      totalQuantity
    }
    userErrors {
      field
      message
    }
  }
}

mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
    cart {
      id
      totalQuantity
    }
    userErrors {
      field
      message
    }
  }
}
```

---

### Phase 5: Navigation Dropdowns

Full navigation with dropdown menus.

#### Tasks

- [x] Create `NavigationDropdown.tsx` component
- [x] Add navigation data structure (from brainstorm)
- [x] Style dropdown menus with hover/click behavior
- [ ] Make navigation responsive (mobile menu)
- [x] Links use `#` placeholders (collection pages deferred)

#### Navigation Data

**app/components/storefront/navigation-data.ts**
```typescript
export type NavItem = {
  title: string;
  href: string;
  children?: NavItem[];
};

export const navigationItems: NavItem[] = [
  {
    title: "INFO",
    href: "#info",
    children: [
      { title: "ABOUT US", href: "#about" },
      { title: "BE A RESELLER", href: "#reseller" },
      { title: "BLOGS", href: "#blogs" },
      { title: "DISCLAIMER", href: "#disclaimer" },
      { title: "SUBMIT YOUR LICENSE", href: "#license" },
      { title: "LICENSE AND PERMIT APPLICATION", href: "#permit" },
      { title: "WARRANTY AND RETURN POLICY", href: "#warranty" },
      { title: "FAQS", href: "#faqs" },
      { title: "CONTACT US", href: "#contact" },
    ],
  },
  {
    title: "BRANDS",
    href: "#brands",
    children: [
      { title: "DENIX", href: "#denix" },
      { title: "GONHER", href: "#gonher" },
      { title: "SCHROEDEL", href: "#schroedel" },
      { title: "VILLA GIOCATTOLI S.R.L", href: "#villa" },
      { title: "EDISON", href: "#edison" },
    ],
  },
  {
    title: "ERA",
    href: "#era",
    children: [
      { title: "NEW ARRIVALS", href: "#new-arrivals" },
      { title: "CAP GUNS", href: "#cap-guns" },
      { title: "COLONIAL AND PIRATE", href: "#colonial" },
      { title: "HISTORICAL WEAPONS", href: "#historical" },
      { title: "WESTERN", href: "#western" },
      { title: "WORLD WAR I", href: "#ww1" },
      { title: "WORLD WAR II", href: "#ww2" },
      { title: "POST WORLD WAR II", href: "#post-ww2" },
    ],
  },
  {
    title: "PRODUCT TYPE",
    href: "#products",
    children: [
      { title: "FLINTLOCK AND PERCUSSION PISTOLS", href: "#flintlock-pistols" },
      { title: "FLINTLOCK AND PERCUSSION RIFLES", href: "#flintlock-rifles" },
      { title: "WESTERN PISTOLS", href: "#western-pistols" },
      { title: "WESTERN RIFLES", href: "#western-rifles" },
      { title: "MILITARY AND POLICE PISTOLS", href: "#military-pistols" },
      { title: "MILITARY AND POLICE RIFLES", href: "#military-rifles" },
      { title: "CAP GUNS", href: "#cap-guns-type" },
      { title: "CANNONS", href: "#cannons" },
      { title: "BULLETS, ACCESSORIES AND HOLSTERS", href: "#accessories" },
      { title: "STANDS AND BRACKETS", href: "#stands" },
      { title: "GIFT CARDS", href: "#gift-cards" },
    ],
  },
  {
    title: "THE VAULT",
    href: "#vault",
    children: [
      { title: "TOP 24 BESTSELLING DENIX REPLICAS", href: "#bestselling" },
      { title: "GUNS OF NED KELLY", href: "#ned-kelly" },
    ],
  },
];
```

---

## Cart ID Flow (Client ↔ Server)

Since localStorage is client-only and loaders run on the server, cart operations use this pattern:

### Adding to Cart (Product Page)
1. Client reads cart ID from localStorage
2. Client sends cart ID in form data to action
3. Action creates cart (if no ID) or adds line (if ID exists)
4. Action returns new cart ID and count
5. Client stores cart ID in localStorage and updates context

```typescript
// In product page action
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const cartId = formData.get("cartId") as string | null;
  const variantId = formData.get("variantId") as string;
  const quantity = Number(formData.get("quantity") || 1);

  if (cartId) {
    // Add to existing cart
    const { data } = await storefrontClient.request(CART_LINES_ADD, {
      variables: { cartId, lines: [{ merchandiseId: variantId, quantity }] },
    });
    return { cart: data.cartLinesAdd.cart };
  } else {
    // Create new cart
    const { data } = await storefrontClient.request(CART_CREATE, {
      variables: { lines: [{ merchandiseId: variantId, quantity }] },
    });
    return { cart: data.cartCreate.cart, isNew: true };
  }
}

// In product page component
const fetcher = useFetcher();
const { cartId, setCartId, setCartCount } = useCart();

useEffect(() => {
  if (fetcher.data?.cart) {
    if (fetcher.data.isNew) {
      setCartId(fetcher.data.cart.id);
      setCartIdStorage(fetcher.data.cart.id);
    }
    setCartCount(fetcher.data.cart.totalQuantity);
  }
}, [fetcher.data]);
```

### Loading Cart (Cart Page)
1. Page renders with client-side loader
2. Client reads cart ID from localStorage
3. Client fetches cart data via useFetcher or clientLoader
4. Displays cart or empty state

```typescript
// Cart page uses clientLoader to access localStorage
export async function clientLoader() {
  const cartId = getCartId();
  if (!cartId) return { cart: null };

  // Fetch cart data client-side
  const response = await fetch(`/api/cart?cartId=${cartId}`);
  return response.json();
}

clientLoader.hydrate = true;
```

---

## Edge Cases and Error Handling

### Cart ID Expiration

```typescript
// In cart loader/action
try {
  const { data } = await storefrontClient.request(GET_CART_QUERY, {
    variables: { cartId },
  });

  if (!data.cart) {
    // Cart expired or deleted - clear localStorage
    return { cart: null, error: "cart_expired" };
  }

  return { cart: data.cart };
} catch (error) {
  // Handle network/API errors
  return { cart: null, error: "api_error" };
}
```

### localStorage Fallback

```typescript
// utils/cart-storage.ts
export function getCartId(): string | null {
  try {
    return localStorage.getItem("shopify_cart_id");
  } catch {
    // localStorage unavailable (private browsing)
    return sessionStorage.getItem("shopify_cart_id") || null;
  }
}

export function setCartId(cartId: string): void {
  try {
    localStorage.setItem("shopify_cart_id", cartId);
  } catch {
    sessionStorage.setItem("shopify_cart_id", cartId);
  }
}
```

### Product Not Found

```typescript
// In product loader
if (!data.product) {
  throw new Response("Product not found", { status: 404 });
}
```

### Out-of-Stock Variants

```typescript
// In VariantSelector
const isAvailable = variant.availableForSale;

<button
  disabled={!isAvailable}
  className={!isAvailable ? "sold-out" : ""}
>
  {variant.title} {!isAvailable && "(Sold Out)"}
</button>
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] User can browse products on `/store`
- [ ] User can view product details on `/store/product/:handle`
- [ ] User can select product variants (size, color, etc.)
- [ ] User can add products to cart
- [ ] User can view cart on `/store/cart`
- [ ] User can update quantities in cart
- [ ] User can remove items from cart
- [ ] User can proceed to Shopify checkout
- [ ] Cart persists across page refreshes (localStorage)
- [ ] Cart icon shows item count

### Edge Cases

- [ ] Empty storefront shows appropriate message
- [ ] Empty cart shows "Continue Shopping" CTA
- [ ] Invalid product handle shows 404 page
- [ ] Expired cart ID creates new cart gracefully
- [ ] Out-of-stock variants are disabled
- [ ] API errors show user-friendly messages

### Non-Functional Requirements

- [ ] Pages load within 2 seconds
- [ ] Optimistic UI for cart updates
- [ ] Loading skeletons during data fetch
- [ ] Responsive design (mobile-friendly)

---

## Dependencies

- `@shopify/storefront-api-client` - Already available as transitive dependency
- Environment variable: `SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- Environment variable: `SHOPIFY_STORE_DOMAIN`

### Setup Storefront Access Token

1. Go to Shopify Admin → Settings → Apps and sales channels
2. Click "Develop apps" → Create an app (or use existing)
3. Configure Storefront API scopes
4. Install app and copy Storefront API access token
5. Add to `.env`: `SHOPIFY_STOREFRONT_ACCESS_TOKEN=shpat_xxxxx`

---

## Deferred (Out of Scope for MVP)

- Collection/category pages (nav links use `#` placeholders)
- Product search functionality
- Product filtering and sorting
- Info pages (About, FAQ, Contact, etc.)
- Footer content (placeholder only)
- Product image zoom/gallery
- Recently viewed products
- Wishlist functionality

---

## References

### Internal

- Brainstorm: `docs/brainstorms/2026-03-13-storefront-brainstorm.md`
- Existing layout pattern: `app/routes/app.tsx`
- Existing route convention: `app/routes/_index/route.tsx`

### External

- [Shopify Storefront API Docs](https://shopify.dev/docs/api/storefront)
- [@shopify/storefront-api-client](https://www.npmjs.com/package/@shopify/storefront-api-client)
- [React Router 7 Data Loading](https://reactrouter.com/dev/start/framework/data-loading)
- [Shopify Cart API Guide](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart)
