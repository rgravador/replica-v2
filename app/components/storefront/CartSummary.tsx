import { formatMoney, type Cart } from "~/storefront.types";
import styles from "./CartSummary.module.css";

interface CartSummaryProps {
  cart: Cart;
  checkoutUrl: string;
}

export function CartSummary({ cart, checkoutUrl }: CartSummaryProps) {
  const { cost, totalQuantity } = cart;

  return (
    <div className={styles.summary}>
      <h2 className={styles.title}>Order Summary</h2>

      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.label}>
            Subtotal ({totalQuantity} {totalQuantity === 1 ? "item" : "items"})
          </span>
          <span className={styles.value}>
            {formatMoney(cost.subtotalAmount)}
          </span>
        </div>

        {cost.totalTaxAmount && parseFloat(cost.totalTaxAmount.amount) > 0 && (
          <div className={styles.row}>
            <span className={styles.label}>Tax</span>
            <span className={styles.value}>
              {formatMoney(cost.totalTaxAmount)}
            </span>
          </div>
        )}

        <div className={styles.row}>
          <span className={styles.label}>Shipping</span>
          <span className={styles.value}>Calculated at checkout</span>
        </div>
      </div>

      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>Total</span>
        <span className={styles.totalValue}>
          {formatMoney(cost.totalAmount)}
        </span>
      </div>

      <a href={checkoutUrl} className={styles.checkoutButton}>
        Proceed to Checkout
      </a>

      <p className={styles.note}>
        Taxes and shipping calculated at checkout
      </p>
    </div>
  );
}
