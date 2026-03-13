import { Link } from "react-router";
import type { ProductCard as ProductCardType } from "~/storefront.types";
import { formatMoney } from "~/storefront.types";
import styles from "./ProductCard.module.css";

interface ProductCardProps {
  product: ProductCardType;
}

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.featuredImage?.url;
  const imageAlt = product.featuredImage?.altText || product.title;

  return (
    <Link to={`/product/${product.handle}`} className={styles.card}>
      <div className={styles.imageContainer}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt}
            className={styles.image}
            loading="lazy"
          />
        ) : (
          <div className={styles.placeholder}>
            <span>No Image</span>
          </div>
        )}
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{product.title}</h3>
        <p className={styles.price}>
          {formatMoney(product.priceRange.minVariantPrice)}
        </p>
      </div>
    </Link>
  );
}
