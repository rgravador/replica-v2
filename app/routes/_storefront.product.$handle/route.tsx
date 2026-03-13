import { useState, useEffect } from "react";
import {
  useLoaderData,
  useFetcher,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "react-router";
import {
  storefrontClient,
  PRODUCT_QUERY,
  CART_CREATE_MUTATION,
  CART_LINES_ADD_MUTATION,
} from "~/storefront.server";
import {
  formatMoney,
  type ProductDetails,
  type ProductVariant,
  type Cart,
} from "~/storefront.types";
import { useCart } from "../_storefront";
import { VariantSelector } from "~/components/storefront/VariantSelector";
import { AddToCartButton } from "~/components/storefront/AddToCartButton";
import styles from "./styles.module.css";

interface LoaderData {
  product: ProductDetails | null;
  error?: string;
}

interface ActionData {
  success: boolean;
  cart?: Cart;
  error?: string;
}

export async function loader({
  params,
}: LoaderFunctionArgs): Promise<LoaderData> {
  const { handle } = params;

  if (!handle) {
    return { product: null, error: "Product handle is required" };
  }

  try {
    const { data, errors } = await storefrontClient.request(PRODUCT_QUERY, {
      variables: { handle },
    });

    if (errors) {
      console.error("Storefront API errors:", errors);
      return { product: null, error: "Failed to load product" };
    }

    if (!data?.product) {
      return { product: null, error: "Product not found" };
    }

    return { product: data.product as ProductDetails };
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return { product: null, error: "Failed to load product" };
  }
}

export async function action({
  request,
}: ActionFunctionArgs): Promise<ActionData> {
  const formData = await request.formData();
  const variantId = formData.get("variantId") as string;
  const quantity = parseInt(formData.get("quantity") as string) || 1;
  const cartId = formData.get("cartId") as string | null;

  if (!variantId) {
    return { success: false, error: "Variant ID is required" };
  }

  const lines = [{ merchandiseId: variantId, quantity }];

  try {
    // If we have an existing cart, add to it
    if (cartId) {
      const { data, errors } = await storefrontClient.request(
        CART_LINES_ADD_MUTATION,
        {
          variables: { cartId, lines },
        }
      );

      if (errors || data?.cartLinesAdd?.userErrors?.length > 0) {
        const errorMsg =
          data?.cartLinesAdd?.userErrors?.[0]?.message ||
          "Failed to add to cart";
        console.error("Cart add errors:", errors || data?.cartLinesAdd?.userErrors);
        return { success: false, error: errorMsg };
      }

      return { success: true, cart: data.cartLinesAdd.cart as Cart };
    }

    // Create a new cart with the item
    const { data, errors } = await storefrontClient.request(
      CART_CREATE_MUTATION,
      {
        variables: { lines },
      }
    );

    if (errors || data?.cartCreate?.userErrors?.length > 0) {
      const errorMsg =
        data?.cartCreate?.userErrors?.[0]?.message || "Failed to create cart";
      console.error("Cart create errors:", errors || data?.cartCreate?.userErrors);
      return { success: false, error: errorMsg };
    }

    return { success: true, cart: data.cartCreate.cart as Cart };
  } catch (error) {
    console.error("Cart operation failed:", error);
    return { success: false, error: "Failed to add item to cart" };
  }
}

export default function ProductPage() {
  const { product, error } = useLoaderData<LoaderData>();
  const { cartId, setCartId, setCartCount, setCheckoutUrl } = useCart();
  const fetcher = useFetcher<ActionData>();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Initialize selected options and variant
  useEffect(() => {
    if (product && product.variants.nodes.length > 0) {
      const firstAvailable =
        product.variants.nodes.find((v) => v.availableForSale) ||
        product.variants.nodes[0];

      const options: Record<string, string> = {};
      firstAvailable.selectedOptions.forEach((opt) => {
        options[opt.name] = opt.value;
      });
      setSelectedOptions(options);
      setSelectedVariant(firstAvailable);
    }
  }, [product]);

  // Find variant when options change
  useEffect(() => {
    if (!product) return;

    const variant = product.variants.nodes.find((v) =>
      v.selectedOptions.every(
        (opt) => selectedOptions[opt.name] === opt.value
      )
    );

    if (variant) {
      setSelectedVariant(variant);
      // Update image to variant image if available
      if (variant.image) {
        const imageIndex = product.images.nodes.findIndex(
          (img) => img.url === variant.image?.url
        );
        if (imageIndex >= 0) {
          setSelectedImageIndex(imageIndex);
        }
      }
    }
  }, [selectedOptions, product]);

  // Update cart context when fetcher returns
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data.cart) {
      const cart = fetcher.data.cart;
      setCartId(cart.id);
      setCartCount(cart.totalQuantity);
      setCheckoutUrl(cart.checkoutUrl);
    }
  }, [fetcher.data, setCartId, setCartCount, setCheckoutUrl]);

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: value,
    }));
  };

  if (error || !product) {
    return (
      <div className={styles.errorContainer}>
        <h1>Product Not Found</h1>
        <p>{error || "The product you're looking for doesn't exist."}</p>
        <a href="/" className={styles.backLink}>
          Back to Store
        </a>
      </div>
    );
  }

  const images = product.images.nodes;
  const currentImage = images[selectedImageIndex] || images[0];
  const isOutOfStock = selectedVariant && !selectedVariant.availableForSale;
  const isSubmitting = fetcher.state === "submitting";

  return (
    <div className={styles.container}>
      {/* Image Gallery */}
      <div className={styles.gallery}>
        <div className={styles.mainImage}>
          {currentImage ? (
            <img
              src={currentImage.url}
              alt={currentImage.altText || product.title}
              className={styles.image}
            />
          ) : (
            <div className={styles.noImage}>No image available</div>
          )}
        </div>

        {images.length > 1 && (
          <div className={styles.thumbnails}>
            {images.map((image, index) => (
              <button
                key={image.url}
                type="button"
                className={`${styles.thumbnail} ${
                  index === selectedImageIndex ? styles.thumbnailActive : ""
                }`}
                onClick={() => setSelectedImageIndex(index)}
              >
                <img
                  src={image.url}
                  alt={image.altText || `${product.title} - Image ${index + 1}`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className={styles.info}>
        <h1 className={styles.title}>{product.title}</h1>

        {selectedVariant && (
          <div className={styles.price}>
            <span className={styles.currentPrice}>
              {formatMoney(selectedVariant.price)}
            </span>
            {selectedVariant.compareAtPrice &&
              parseFloat(selectedVariant.compareAtPrice.amount) >
                parseFloat(selectedVariant.price.amount) && (
                <span className={styles.comparePrice}>
                  {formatMoney(selectedVariant.compareAtPrice)}
                </span>
              )}
          </div>
        )}

        {/* Variant Selector */}
        {product.options.length > 0 &&
          !(
            product.options.length === 1 &&
            product.options[0].values.length === 1
          ) && (
            <VariantSelector
              options={product.options}
              selectedOptions={selectedOptions}
              variants={product.variants.nodes}
              onOptionChange={handleOptionChange}
            />
          )}

        {/* Quantity Selector */}
        <div className={styles.quantitySection}>
          <label htmlFor="quantity" className={styles.quantityLabel}>
            Quantity
          </label>
          <div className={styles.quantityControls}>
            <button
              type="button"
              className={styles.quantityButton}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              -
            </button>
            <input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, parseInt(e.target.value) || 1))
              }
              className={styles.quantityInput}
            />
            <button
              type="button"
              className={styles.quantityButton}
              onClick={() => setQuantity((q) => q + 1)}
            >
              +
            </button>
          </div>
        </div>

        {/* Add to Cart */}
        <AddToCartButton
          variantId={selectedVariant?.id || ""}
          quantity={quantity}
          cartId={cartId}
          isOutOfStock={isOutOfStock || false}
          isSubmitting={isSubmitting}
          fetcher={fetcher}
        />

        {fetcher.data?.error && (
          <p className={styles.error}>{fetcher.data.error}</p>
        )}

        {/* Description */}
        {product.descriptionHtml && (
          <div className={styles.description}>
            <h2 className={styles.descriptionTitle}>Description</h2>
            <div
              className={styles.descriptionContent}
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
