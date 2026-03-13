# Storefront Feature Brainstorm

**Date:** 2026-03-13
**Status:** Ready for planning

---

## What We're Building

A customer-facing public storefront for replica/historical weapons e-commerce with three pages:

1. **Storefront Page** (`/store`) - Store branding and products in a grid layout
2. **Product Details Page** (`/store/product/:handle`) - Single product with add-to-cart
3. **Cart Page** (`/store/cart`) - Shopping cart with checkout redirect

All pages share a dedicated layout:
- **Navigation header**: Logo, dropdown menus, cart icon with count
- **Content outlet**: Page content
- **Footer**: TBD

---

## Why This Approach

### Architecture: `/store/*` Route Prefix

- Clean separation from admin routes (`/app/*`)
- React Router 7 automatically wraps child routes with layout
- Follows project convention: `app/routes/pagename/route.tsx`
- Intuitive URL structure for customers

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Audience | Customer-facing (public) | No admin authentication required |
| Data API | Shopify Storefront API | Public access to products |
| Cart Storage | Shopify Cart API | Persists across devices, handles inventory |
| Checkout | Redirect to Shopify Checkout | Handles payments, shipping, taxes |
| Styling | Polaris Web Components | Consistent design, faster development |
| Product Display | Grid layout | Standard e-commerce pattern |

---

## Navigation Structure

Header navigation with dropdown menus + cart icon:

```
[LOGO]  INFO▼  BRANDS▼  ERA▼  PRODUCT TYPE▼  THE VAULT▼  [CART 🛒]
```

### Dropdown Menus

**INFO**
- About Us, Be a Reseller, Blogs, Disclaimer
- Submit Your License, License and Permit Application
- Warranty and Return Policy, FAQs, Contact Us

**BRANDS**
- DENIX, GONHER, SCHROEDEL, VILLA GIOCATTOLI S.R.L, EDISON

**ERA**
- New Arrivals, Cap Guns, Colonial and Pirate, Historical Weapons
- Western, World War I, World War II, Post World War II

**PRODUCT TYPE**
- Flintlock/Percussion Pistols & Rifles, Western Pistols & Rifles
- Military/Police Pistols & Rifles, Cap Guns, Cannons
- Bullets/Accessories/Holsters, Stands/Brackets, Gift Cards

**THE VAULT**
- Top 24 Bestselling DENIX Replicas, Guns of Ned Kelly

> **Note**: Most nav links will use `#` placeholders initially. Collection/filter pages can be added later.

---

## File Structure

```
app/routes/
├── store.tsx                        # Layout: nav, <Outlet/>, footer
├── store._index/
│   └── route.tsx                    # Storefront: brand info + product grid
├── store.product.$handle/
│   └── route.tsx                    # Product details + add to cart
└── store.cart/
    └── route.tsx                    # Cart items + checkout

app/
├── storefront.server.ts             # Storefront API client
└── components/
    └── storefront/
        ├── Navigation.tsx           # Header with dropdowns
        ├── ProductCard.tsx          # Grid item
        ├── ProductGrid.tsx          # Products container
        ├── CartIcon.tsx             # Cart with count badge
        ├── CartItem.tsx             # Line item in cart
        └── Footer.tsx               # Site footer
```

---

## URL Structure

| URL | Page | Description |
|-----|------|-------------|
| `/store` | Storefront | Brand info + product grid |
| `/store/product/cool-shirt` | Product Details | Single product with variants |
| `/store/cart` | Cart | Cart items, totals, checkout button |

---

## Data Requirements

### Storefront Page
- Shop info (name, description, logo)
- Products list: title, image, price, handle

### Product Details Page
- Product: title, description, images, variants, price
- Inventory availability

### Cart Page
- Cart line items with product details
- Subtotal, taxes, total
- Checkout URL (redirects to Shopify Checkout)

---

## Cart Flow

1. User clicks "Add to Cart" on product page
2. Create cart (if none) or add line item via Storefront API
3. Store cart ID in localStorage for persistence
4. Cart icon shows item count
5. Cart page shows items, quantities, totals
6. "Checkout" button redirects to Shopify-hosted checkout

---

## Scope for Initial Build (MVP)

**In Scope:**
- Layout with navigation dropdowns and cart icon
- Storefront page with all products grid
- Product details with add-to-cart
- Cart page with Shopify checkout redirect

**Deferred:**
- Collection/category pages (nav links use `#` placeholders)
- Product search
- Product filtering/sorting
- Footer content (placeholder only)
- Info pages (About, FAQ, etc.)

---

## Next Steps

Run `/workflows:plan` to create implementation plan.
