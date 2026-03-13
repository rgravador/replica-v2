import { Outlet, useOutletContext } from "react-router";
import { useState, useEffect } from "react";
import { Navigation } from "~/components/storefront/Navigation";
import { Footer } from "~/components/storefront/Footer";
import { getCartId, getCartCount, setCartId as setCartIdStorage, setCartCount as setCartCountStorage } from "~/utils/cart-storage";
import "~/styles/global.css";
import "~/styles/store.css";

export type CartContext = {
  cartCount: number;
  setCartCount: (count: number) => void;
  cartId: string | null;
  setCartId: (id: string) => void;
  checkoutUrl: string | null;
  setCheckoutUrl: (url: string | null) => void;
  isHydrated: boolean;
};

export default function StoreLayout() {
  const [cartCount, setCartCountState] = useState(0);
  const [cartId, setCartIdState] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart state from localStorage on mount
  useEffect(() => {
    const storedCartId = getCartId();
    const storedCartCount = getCartCount();
    console.log("[Cart Context] Hydrating from storage:", { storedCartId, storedCartCount });
    setCartIdState(storedCartId);
    setCartCountState(storedCartCount);
    setIsHydrated(true);
  }, []);

  // Wrapper to update both state and localStorage
  const setCartCount = (count: number) => {
    console.log("[Cart Context] setCartCount called:", count);
    setCartCountState(count);
    setCartCountStorage(count);
  };

  const setCartId = (id: string) => {
    console.log("[Cart Context] setCartId called:", id);
    setCartIdState(id);
    setCartIdStorage(id);
  };

  return (
    <div className="store-layout">
      <Navigation cartCount={cartCount} />
      <main className="store-main">
        <Outlet
          context={{
            cartCount,
            setCartCount,
            cartId,
            setCartId,
            checkoutUrl,
            setCheckoutUrl,
            isHydrated,
          } satisfies CartContext}
        />
      </main>
      <Footer />
    </div>
  );
}

/**
 * Hook for child routes to access cart context
 */
export function useCart() {
  return useOutletContext<CartContext>();
}
