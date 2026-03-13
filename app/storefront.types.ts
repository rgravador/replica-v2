// Type definitions for Storefront API responses
// This file can be imported by both server and client code

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface ProductImage {
  url: string;
  altText: string | null;
  width?: number;
  height?: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number;
  selectedOptions: Array<{ name: string; value: string }>;
  price: Money;
  compareAtPrice: Money | null;
  image: ProductImage | null;
}

export interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

export interface ProductCard {
  id: string;
  handle: string;
  title: string;
  featuredImage: ProductImage | null;
  priceRange: {
    minVariantPrice: Money;
  };
}

export interface ProductDetails {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  images: { nodes: ProductImage[] };
  options: ProductOption[];
  variants: { nodes: ProductVariant[] };
}

export interface CartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    image: ProductImage | null;
    price: Money;
    product: {
      title: string;
      handle: string;
    };
  };
  cost: {
    totalAmount: Money;
  };
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  lines: { nodes: CartLine[] };
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount: Money | null;
  };
}

export interface Shop {
  name: string;
  description: string | null;
}

// Helper function to format money
export function formatMoney(money: Money): string {
  const amount = parseFloat(money.amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: money.currencyCode,
  }).format(amount);
}
