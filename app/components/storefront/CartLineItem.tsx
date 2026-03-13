import { Link } from "react-router";
import { formatMoney, type CartLine } from "~/storefront.types";
import styles from "./CartLineItem.module.css";

interface CartLineItemProps {
  line: CartLine;
  onQuantityChange: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
  isDisabled: boolean;
}

export function CartLineItem({
  line,
  onQuantityChange,
  onRemove,
  isDisabled,
}: CartLineItemProps) {
  const { merchandise, quantity, cost } = line;
  const productHandle = merchandise.product.handle;
  const productTitle = merchandise.product.title;
  const variantTitle = merchandise.title;

  return (
    <div className={styles.item}>
      <Link
        to={`/product/${productHandle}`}
        className={styles.imageContainer}
      >
        {merchandise.image ? (
          <img
            src={merchandise.image.url}
            alt={merchandise.image.altText || productTitle}
            className={styles.image}
          />
        ) : (
          <div className={styles.noImage}>No image</div>
        )}
      </Link>

      <div className={styles.details}>
        <div className={styles.info}>
          <Link
            to={`/product/${productHandle}`}
            className={styles.productTitle}
          >
            {productTitle}
          </Link>
          {variantTitle !== "Default Title" && (
            <p className={styles.variantTitle}>{variantTitle}</p>
          )}
          <p className={styles.price}>{formatMoney(merchandise.price)}</p>
        </div>

        <div className={styles.actions}>
          <div className={styles.quantityControls}>
            <button
              type="button"
              className={styles.quantityButton}
              onClick={() => onQuantityChange(line.id, quantity - 1)}
              disabled={isDisabled || quantity <= 1}
              aria-label="Decrease quantity"
            >
              -
            </button>
            <span className={styles.quantity}>{quantity}</span>
            <button
              type="button"
              className={styles.quantityButton}
              onClick={() => onQuantityChange(line.id, quantity + 1)}
              disabled={isDisabled}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            className={styles.removeButton}
            onClick={() => onRemove(line.id)}
            disabled={isDisabled}
            aria-label="Remove item"
          >
            Remove
          </button>
        </div>
      </div>

      <div className={styles.total}>
        <span className={styles.totalLabel}>Total</span>
        <span className={styles.totalAmount}>
          {formatMoney(cost.totalAmount)}
        </span>
      </div>
    </div>
  );
}
