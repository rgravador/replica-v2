import type { FetcherWithComponents } from "react-router";
import styles from "./AddToCartButton.module.css";

interface AddToCartButtonProps {
  variantId: string;
  quantity: number;
  cartId: string | null;
  isOutOfStock: boolean;
  isSubmitting: boolean;
  fetcher: FetcherWithComponents<unknown>;
}

export function AddToCartButton({
  variantId,
  quantity,
  cartId,
  isOutOfStock,
  isSubmitting,
  fetcher,
}: AddToCartButtonProps) {
  const buttonText = isOutOfStock
    ? "Out of Stock"
    : isSubmitting
    ? "Adding..."
    : "Add to Cart";

  return (
    <fetcher.Form method="post" className={styles.form}>
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value={quantity} />
      {cartId && <input type="hidden" name="cartId" value={cartId} />}

      <button
        type="submit"
        className={`${styles.button} ${isOutOfStock ? styles.disabled : ""}`}
        disabled={isOutOfStock || isSubmitting || !variantId}
      >
        {buttonText}
      </button>
    </fetcher.Form>
  );
}
