import { useEffect, useState } from "react";
import {
  useFetcher,
  useLoaderData,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "react-router";
import {
  storefrontClient,
  CART_QUERY,
  CART_LINES_UPDATE_MUTATION,
  CART_LINES_REMOVE_MUTATION,
} from "~/storefront.server";
import type { Cart } from "~/storefront.types";
import { useCart } from "../_storefront";
import { getCartId, clearCartId } from "~/utils/cart-storage";
import { CartLineItem } from "~/components/storefront/CartLineItem";
import { CartSummary } from "~/components/storefront/CartSummary";
import { EmptyState } from "~/components/storefront/EmptyState";
import styles from "./styles.module.css";

interface LoaderData {
  cart: Cart | null;
  error?: string;
}

interface ActionData {
  success: boolean;
  cart?: Cart;
  error?: string;
  action?: string;
}

// Client-side loader to get cart ID from localStorage
export async function clientLoader(): Promise<{ cartId: string | null }> {
  const cartId = getCartId();
  return { cartId };
}

// Server loader fetches cart data
export async function loader({
  request,
}: LoaderFunctionArgs): Promise<LoaderData> {
  const url = new URL(request.url);
  const cartId = url.searchParams.get("cartId");

  if (!cartId) {
    return { cart: null };
  }

  try {
    const { data, errors } = await storefrontClient.request(CART_QUERY, {
      variables: { cartId },
    });

    if (errors) {
      console.error("Cart query errors:", errors);
      return { cart: null, error: "Failed to load cart" };
    }

    return { cart: data?.cart as Cart | null };
  } catch (error) {
    console.error("Failed to fetch cart:", error);
    return { cart: null, error: "Failed to load cart" };
  }
}

export async function action({
  request,
}: ActionFunctionArgs): Promise<ActionData> {
  const formData = await request.formData();
  const actionType = formData.get("_action") as string;
  const cartId = formData.get("cartId") as string;

  if (!cartId) {
    return { success: false, error: "Cart ID is required" };
  }

  try {
    if (actionType === "update") {
      const lineId = formData.get("lineId") as string;
      const quantity = parseInt(formData.get("quantity") as string);

      const { data, errors } = await storefrontClient.request(
        CART_LINES_UPDATE_MUTATION,
        {
          variables: {
            cartId,
            lines: [{ id: lineId, quantity }],
          },
        }
      );

      if (errors || data?.cartLinesUpdate?.userErrors?.length > 0) {
        return { success: false, error: "Failed to update item", action: "update" };
      }

      return { success: true, cart: data.cartLinesUpdate.cart as Cart, action: "update" };
    }

    if (actionType === "remove") {
      const lineId = formData.get("lineId") as string;

      const { data, errors } = await storefrontClient.request(
        CART_LINES_REMOVE_MUTATION,
        {
          variables: {
            cartId,
            lineIds: [lineId],
          },
        }
      );

      if (errors || data?.cartLinesRemove?.userErrors?.length > 0) {
        return { success: false, error: "Failed to remove item", action: "remove" };
      }

      return { success: true, cart: data.cartLinesRemove.cart as Cart, action: "remove" };
    }

    return { success: false, error: "Unknown action" };
  } catch (error) {
    console.error("Cart action failed:", error);
    return { success: false, error: "Cart operation failed" };
  }
}

export default function CartPage() {
  const loaderData = useLoaderData<LoaderData>();
  const { cartId, setCartCount, setCheckoutUrl, checkoutUrl } = useCart();
  const fetcher = useFetcher<ActionData>();
  const cartFetcher = useFetcher<LoaderData>();

  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch cart data when we have a cart ID (client-side)
  useEffect(() => {
    if (cartId && !isInitialized) {
      cartFetcher.load(`/cart?cartId=${encodeURIComponent(cartId)}`);
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId, isInitialized]);

  // Update cart context when fetcher returns updated cart
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data.cart) {
      const cart = fetcher.data.cart;
      setCartCount(cart.totalQuantity);
      setCheckoutUrl(cart.checkoutUrl);

      // Clear cart from storage if it's now empty
      if (cart.totalQuantity === 0) {
        clearCartId();
      }
    }
  }, [fetcher.data, setCartCount, setCheckoutUrl]);

  // Get the cart data from cartFetcher or action response
  const cart = fetcher.data?.cart || cartFetcher.data?.cart || loaderData.cart;
  const isLoading = cartFetcher.state === "loading" && !cart;
  const isSubmitting = fetcher.state === "submitting";

  // Handle quantity update
  const handleQuantityChange = (lineId: string, quantity: number) => {
    if (!cartId) return;

    if (quantity === 0) {
      // Remove item
      fetcher.submit(
        { _action: "remove", cartId, lineId },
        { method: "post" }
      );
    } else {
      // Update quantity
      fetcher.submit(
        { _action: "update", cartId, lineId, quantity: quantity.toString() },
        { method: "post" }
      );
    }
  };

  // Handle item removal
  const handleRemove = (lineId: string) => {
    if (!cartId) return;
    fetcher.submit(
      { _action: "remove", cartId, lineId },
      { method: "post" }
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Your Cart</h1>
        <div className={styles.loading}>Loading cart...</div>
      </div>
    );
  }

  // Show empty state
  if (!cart || cart.lines.nodes.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Your Cart</h1>
        <EmptyState
          heading="Your cart is empty"
          message="Looks like you haven't added anything to your cart yet."
          actionLabel="Continue Shopping"
          actionHref="/"
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Your Cart</h1>

      {fetcher.data?.error && (
        <p className={styles.error}>{fetcher.data.error}</p>
      )}

      <div className={styles.content}>
        <div className={styles.items}>
          {cart.lines.nodes.map((line) => (
            <CartLineItem
              key={line.id}
              line={line}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemove}
              isDisabled={isSubmitting}
            />
          ))}
        </div>

        <CartSummary
          cart={cart}
          checkoutUrl={checkoutUrl || cart.checkoutUrl}
        />
      </div>
    </div>
  );
}
