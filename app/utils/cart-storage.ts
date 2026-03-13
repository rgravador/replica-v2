const CART_ID_KEY = "shopify_cart_id";
const CART_COUNT_KEY = "shopify_cart_count";

/**
 * Get cart ID from storage
 * Falls back to sessionStorage if localStorage is unavailable (private browsing)
 */
export function getCartId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CART_ID_KEY);
  } catch {
    return sessionStorage.getItem(CART_ID_KEY) || null;
  }
}

/**
 * Store cart ID in storage
 */
export function setCartId(cartId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_ID_KEY, cartId);
  } catch {
    sessionStorage.setItem(CART_ID_KEY, cartId);
  }
}

/**
 * Clear cart ID from storage
 */
export function clearCartId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CART_ID_KEY);
    localStorage.removeItem(CART_COUNT_KEY);
  } catch {
    sessionStorage.removeItem(CART_ID_KEY);
    sessionStorage.removeItem(CART_COUNT_KEY);
  }
}

/**
 * Get cached cart count from storage
 * Used to show count immediately before fetching from API
 */
export function getCartCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const count = localStorage.getItem(CART_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch {
    const count = sessionStorage.getItem(CART_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  }
}

/**
 * Cache cart count in storage
 */
export function setCartCount(count: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_COUNT_KEY, count.toString());
  } catch {
    sessionStorage.setItem(CART_COUNT_KEY, count.toString());
  }
}
