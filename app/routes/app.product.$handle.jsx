import { useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getStorefrontClient, getStorefrontToken } from "../storefront.server";

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const { handle } = params;

  const hasToken = !!(await getStorefrontToken(shop));
  let product = null;
  let adminProduct = null;

  if (hasToken && handle) {
    const storefront = await getStorefrontClient(admin, shop);
    if (storefront) {
      try {
        // Fetch product via Storefront API
        const response = await storefront.request(`
          query getProductByHandle($handle: String!) {
            productByHandle(handle: $handle) {
              id
              title
              handle
              description
              descriptionHtml
              availableForSale
              productType
              vendor
              tags
              options {
                id
                name
                values
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              compareAtPriceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    availableForSale
                    quantityAvailable
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                    selectedOptions {
                      name
                      value
                    }
                    image {
                      url
                      altText
                    }
                  }
                }
              }
              seo {
                title
                description
              }
            }
          }
        `, {
          variables: { handle },
        });
        product = response.data?.productByHandle;
      } catch (error) {
        console.error("Storefront API error:", error);
      }
    }
  }

  // Also fetch from Admin API for comparison
  if (handle) {
    try {
      const adminResponse = await admin.graphql(`
        query getProductByHandle($query: String!) {
          products(first: 1, query: $query) {
            edges {
              node {
                id
                title
                handle
                status
                totalInventory
                createdAt
                updatedAt
                variants(first: 10) {
                  edges {
                    node {
                      id
                      title
                      price
                      inventoryQuantity
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        variables: { query: `handle:${handle}` },
      });
      const adminData = await adminResponse.json();
      adminProduct = adminData.data?.products?.edges?.[0]?.node;
    } catch (error) {
      console.error("Admin API error:", error);
    }
  }

  return { hasToken, product, adminProduct, handle };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("action");

  const storefront = await getStorefrontClient(admin, shop);
  if (!storefront) {
    return { success: false, message: "Storefront API not configured" };
  }

  try {
    if (actionType === "add-to-cart") {
      const variantId = formData.get("variantId");
      const quantity = parseInt(formData.get("quantity") || "1", 10);
      const cartId = formData.get("cartId");

      if (cartId) {
        // Add to existing cart
        const response = await storefront.request(`
          mutation addToCart($cartId: ID!, $lines: [CartLineInput!]!) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
              cart {
                id
                totalQuantity
                checkoutUrl
              }
              userErrors {
                field
                message
              }
            }
          }
        `, {
          variables: {
            cartId,
            lines: [{ merchandiseId: variantId, quantity }],
          },
        });

        const cart = response.data?.cartLinesAdd?.cart;
        const errors = response.data?.cartLinesAdd?.userErrors;

        if (errors?.length > 0) {
          return { success: false, message: errors[0].message };
        }

        return { success: true, cart, message: "Added to cart!" };
      } else {
        // Create new cart
        const response = await storefront.request(`
          mutation createCart($input: CartInput!) {
            cartCreate(input: $input) {
              cart {
                id
                totalQuantity
                checkoutUrl
              }
              userErrors {
                field
                message
              }
            }
          }
        `, {
          variables: {
            input: {
              lines: [{ merchandiseId: variantId, quantity }],
            },
          },
        });

        const cart = response.data?.cartCreate?.cart;
        const errors = response.data?.cartCreate?.userErrors;

        if (errors?.length > 0) {
          return { success: false, message: errors[0].message };
        }

        return { success: true, cart, message: "Added to cart!" };
      }
    }

    return { success: false, message: "Unknown action" };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, message: error.message || "An error occurred" };
  }
};

export default function ProductPage() {
  const { hasToken, product, adminProduct, handle } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const isLoading = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message);
    }
  }, [fetcher.data, shopify]);

  const formatPrice = (amount, currencyCode) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(parseFloat(amount));
  };

  const addToCart = (variantId) => {
    fetcher.submit(
      { action: "add-to-cart", variantId, quantity: "1" },
      { method: "POST" }
    );
  };

  if (!hasToken) {
    return (
      <s-page heading="Product Details">
        <s-section>
          <s-banner tone="warning">
            <s-text>
              Storefront API is not configured. Please visit the{" "}
              <s-link href="/app/storefront">Storefront API page</s-link> to
              create a Storefront access token.
            </s-text>
          </s-banner>
        </s-section>
      </s-page>
    );
  }

  if (!product) {
    return (
      <s-page heading="Product Not Found">
        <s-section>
          <s-banner tone="critical">
            <s-text>
              Product with handle &quot;{handle}&quot; was not found via Storefront API.
              This could mean:
            </s-text>
          </s-banner>
          <s-unordered-list>
            <s-list-item>The product does not exist</s-list-item>
            <s-list-item>The product is not published/active</s-list-item>
            <s-list-item>The product was recently created and not yet indexed</s-list-item>
          </s-unordered-list>
          <s-stack direction="inline" gap="base">
            <s-link href="/app">Back to Home</s-link>
            <s-link href="/app/cart">View Cart</s-link>
          </s-stack>
        </s-section>
      </s-page>
    );
  }

  const images = product.images?.edges?.map((e) => e.node) || [];
  const variants = product.variants?.edges?.map((e) => e.node) || [];
  const firstVariant = variants[0];
  const hasCompareAtPrice =
    product.compareAtPriceRange?.minVariantPrice?.amount &&
    parseFloat(product.compareAtPriceRange.minVariantPrice.amount) > 0;

  return (
    <s-page heading={product.title}>
      <s-button slot="primary-action" onClick={() => window.history.back()}>
        Back
      </s-button>

      <s-section>
        <s-stack direction="inline" gap="loose" wrap>
          {/* Product Images */}
          <s-box style={{ flex: "1", minWidth: "300px" }}>
            {images.length > 0 ? (
              <s-stack direction="block" gap="base">
                <img
                  src={images[0].url}
                  alt={images[0].altText || product.title}
                  style={{
                    width: "100%",
                    maxWidth: "400px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                  }}
                />
                {images.length > 1 && (
                  <s-stack direction="inline" gap="tight" wrap>
                    {images.slice(1).map((img) => (
                      <img
                        key={img.id}
                        src={img.url}
                        alt={img.altText || ""}
                        style={{
                          width: "60px",
                          height: "60px",
                          objectFit: "cover",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                      />
                    ))}
                  </s-stack>
                )}
              </s-stack>
            ) : (
              <s-box
                padding="loose"
                background="subdued"
                borderRadius="base"
                style={{ textAlign: "center" }}
              >
                <s-text tone="subdued">No images available</s-text>
              </s-box>
            )}
          </s-box>

          {/* Product Info */}
          <s-box style={{ flex: "1", minWidth: "300px" }}>
            <s-stack direction="block" gap="base">
              <s-heading level={2}>{product.title}</s-heading>

              <s-stack direction="inline" gap="tight">
                <s-badge tone={product.availableForSale ? "success" : "critical"}>
                  {product.availableForSale ? "In Stock" : "Out of Stock"}
                </s-badge>
                {product.vendor && <s-badge>{product.vendor}</s-badge>}
                {product.productType && <s-badge>{product.productType}</s-badge>}
              </s-stack>

              {/* Pricing */}
              <s-stack direction="inline" gap="tight" align="center">
                <s-text fontWeight="bold" style={{ fontSize: "24px" }}>
                  {formatPrice(
                    product.priceRange.minVariantPrice.amount,
                    product.priceRange.minVariantPrice.currencyCode
                  )}
                </s-text>
                {product.priceRange.minVariantPrice.amount !==
                  product.priceRange.maxVariantPrice.amount && (
                  <s-text tone="subdued">
                    -{" "}
                    {formatPrice(
                      product.priceRange.maxVariantPrice.amount,
                      product.priceRange.maxVariantPrice.currencyCode
                    )}
                  </s-text>
                )}
                {hasCompareAtPrice && (
                  <s-text
                    tone="subdued"
                    style={{ textDecoration: "line-through" }}
                  >
                    {formatPrice(
                      product.compareAtPriceRange.minVariantPrice.amount,
                      product.compareAtPriceRange.minVariantPrice.currencyCode
                    )}
                  </s-text>
                )}
              </s-stack>

              {/* Description */}
              {product.description && (
                <s-box padding="base" background="subdued" borderRadius="base">
                  <s-text>{product.description}</s-text>
                </s-box>
              )}

              {/* Variants */}
              {variants.length > 1 && (
                <s-stack direction="block" gap="tight">
                  <s-heading level={4}>Variants</s-heading>
                  {variants.map((variant) => (
                    <s-box
                      key={variant.id}
                      padding="base"
                      borderWidth="base"
                      borderRadius="base"
                    >
                      <s-stack direction="inline" gap="base" align="center" wrap>
                        <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                          <s-text fontWeight="bold">{variant.title}</s-text>
                          <s-text>
                            {formatPrice(
                              variant.price.amount,
                              variant.price.currencyCode
                            )}
                          </s-text>
                          {variant.quantityAvailable !== null && (
                            <s-text tone="subdued">
                              {variant.quantityAvailable} in stock
                            </s-text>
                          )}
                        </s-stack>
                        <s-button
                          onClick={() => addToCart(variant.id)}
                          disabled={!variant.availableForSale || isLoading}
                          {...(isLoading ? { loading: true } : {})}
                        >
                          Add to Cart
                        </s-button>
                      </s-stack>
                    </s-box>
                  ))}
                </s-stack>
              )}

              {/* Single variant add to cart */}
              {variants.length === 1 && firstVariant && (
                <s-button
                  variant="primary"
                  onClick={() => addToCart(firstVariant.id)}
                  disabled={!firstVariant.availableForSale || isLoading}
                  {...(isLoading ? { loading: true } : {})}
                >
                  Add to Cart
                </s-button>
              )}

              {/* Tags */}
              {product.tags?.length > 0 && (
                <s-stack direction="inline" gap="tight" wrap>
                  {product.tags.map((tag) => (
                    <s-badge key={tag} tone="info">
                      {tag}
                    </s-badge>
                  ))}
                </s-stack>
              )}

              {/* Cart Link */}
              {fetcher.data?.cart && (
                <s-banner tone="success">
                  <s-text>
                    Item added!{" "}
                    <s-link href="/app/cart">
                      View Cart ({fetcher.data.cart.totalQuantity} items)
                    </s-link>
                  </s-text>
                </s-banner>
              )}
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* Storefront API Data */}
      <s-section heading="Storefront API Response">
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <pre style={{ margin: 0, fontSize: "11px", overflow: "auto", maxHeight: "400px" }}>
            <code>{JSON.stringify(product, null, 2)}</code>
          </pre>
        </s-box>
      </s-section>

      {/* Admin API Comparison */}
      {adminProduct && (
        <s-section heading="Admin API Response (Comparison)">
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <pre style={{ margin: 0, fontSize: "11px", overflow: "auto", maxHeight: "300px" }}>
              <code>{JSON.stringify(adminProduct, null, 2)}</code>
            </pre>
          </s-box>
        </s-section>
      )}

      <s-section slot="aside" heading="Product Options">
        {product.options?.length > 0 ? (
          <s-stack direction="block" gap="tight">
            {product.options.map((option) => (
              <s-box key={option.id}>
                <s-text fontWeight="bold">{option.name}</s-text>
                <s-text tone="subdued">{option.values.join(", ")}</s-text>
              </s-box>
            ))}
          </s-stack>
        ) : (
          <s-text tone="subdued">No options</s-text>
        )}
      </s-section>

      <s-section slot="aside" heading="SEO">
        {product.seo ? (
          <s-stack direction="block" gap="tight">
            <s-text fontWeight="bold">Title:</s-text>
            <s-text>{product.seo.title || "Not set"}</s-text>
            <s-text fontWeight="bold">Description:</s-text>
            <s-text>{product.seo.description || "Not set"}</s-text>
          </s-stack>
        ) : (
          <s-text tone="subdued">No SEO data</s-text>
        )}
      </s-section>

      <s-section slot="aside" heading="Actions">
        <s-stack direction="block" gap="tight">
          <s-link href="/app/cart">View Cart</s-link>
          <s-link href="/app">Back to Home</s-link>
          {adminProduct && (
            <s-button
              variant="tertiary"
              onClick={() => {
                shopify.intents.invoke?.("edit:shopify/Product", {
                  value: adminProduct.id,
                });
              }}
            >
              Edit in Admin
            </s-button>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
