import { useEffect, useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getStorefrontClient, getStorefrontToken } from "../storefront.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const hasToken = !!(await getStorefrontToken(shop));
  let products = [];

  if (hasToken) {
    const storefront = await getStorefrontClient(admin, shop);
    if (storefront) {
      try {
        const productsResponse = await storefront.request(`
          query getProducts($first: Int!) {
            products(first: $first, query: "status:active") {
              edges {
                node {
                  id
                  title
                  handle
                  description
                  availableForSale
                  featuredImage {
                    url
                    altText
                  }
                  priceRange {
                    minVariantPrice {
                      amount
                      currencyCode
                    }
                  }
                  variants(first: 5) {
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
                      }
                    }
                  }
                }
              }
            }
          }
        `, {
          variables: { first: 20 },
        });
        products = productsResponse.data?.products?.edges?.map(edge => edge.node) || [];
      } catch (error) {
        console.error("Storefront API error:", error);
      }
    }
  }

  return { hasToken, products };
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
    // Create a new cart
    if (actionType === "create-cart") {
      const variantId = formData.get("variantId");
      const quantity = parseInt(formData.get("quantity") || "1", 10);

      const response = await storefront.request(`
        mutation createCart($input: CartInput!) {
          cartCreate(input: $input) {
            cart {
              id
              checkoutUrl
              totalQuantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
                subtotalAmount {
                  amount
                  currencyCode
                }
                totalTaxAmount {
                  amount
                  currencyCode
                }
              }
              lines(first: 50) {
                edges {
                  node {
                    id
                    quantity
                    cost {
                      totalAmount {
                        amount
                        currencyCode
                      }
                    }
                    merchandise {
                      ... on ProductVariant {
                        id
                        title
                        price {
                          amount
                          currencyCode
                        }
                        product {
                          title
                          featuredImage {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
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

      return { success: true, cart, message: "Cart created!" };
    }

    // Add item to existing cart
    if (actionType === "add-to-cart") {
      const cartId = formData.get("cartId");
      const variantId = formData.get("variantId");
      const quantity = parseInt(formData.get("quantity") || "1", 10);

      const response = await storefront.request(`
        mutation addToCart($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart {
              id
              checkoutUrl
              totalQuantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
                subtotalAmount {
                  amount
                  currencyCode
                }
              }
              lines(first: 50) {
                edges {
                  node {
                    id
                    quantity
                    cost {
                      totalAmount {
                        amount
                        currencyCode
                      }
                    }
                    merchandise {
                      ... on ProductVariant {
                        id
                        title
                        price {
                          amount
                          currencyCode
                        }
                        product {
                          title
                          featuredImage {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
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

      return { success: true, cart, message: "Item added to cart!" };
    }

    // Update cart line quantity
    if (actionType === "update-quantity") {
      const cartId = formData.get("cartId");
      const lineId = formData.get("lineId");
      const quantity = parseInt(formData.get("quantity") || "1", 10);

      const response = await storefront.request(`
        mutation updateCartLine($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart {
              id
              checkoutUrl
              totalQuantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
                subtotalAmount {
                  amount
                  currencyCode
                }
              }
              lines(first: 50) {
                edges {
                  node {
                    id
                    quantity
                    cost {
                      totalAmount {
                        amount
                        currencyCode
                      }
                    }
                    merchandise {
                      ... on ProductVariant {
                        id
                        title
                        price {
                          amount
                          currencyCode
                        }
                        product {
                          title
                          featuredImage {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
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
          lines: [{ id: lineId, quantity }],
        },
      });

      const cart = response.data?.cartLinesUpdate?.cart;
      const errors = response.data?.cartLinesUpdate?.userErrors;

      if (errors?.length > 0) {
        return { success: false, message: errors[0].message };
      }

      return { success: true, cart, message: "Cart updated!" };
    }

    // Remove item from cart
    if (actionType === "remove-from-cart") {
      const cartId = formData.get("cartId");
      const lineId = formData.get("lineId");

      const response = await storefront.request(`
        mutation removeFromCart($cartId: ID!, $lineIds: [ID!]!) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart {
              id
              checkoutUrl
              totalQuantity
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
                subtotalAmount {
                  amount
                  currencyCode
                }
              }
              lines(first: 50) {
                edges {
                  node {
                    id
                    quantity
                    cost {
                      totalAmount {
                        amount
                        currencyCode
                      }
                    }
                    merchandise {
                      ... on ProductVariant {
                        id
                        title
                        price {
                          amount
                          currencyCode
                        }
                        product {
                          title
                          featuredImage {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
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
          lineIds: [lineId],
        },
      });

      const cart = response.data?.cartLinesRemove?.cart;
      const errors = response.data?.cartLinesRemove?.userErrors;

      if (errors?.length > 0) {
        return { success: false, message: errors[0].message };
      }

      return { success: true, cart, message: "Item removed from cart!" };
    }

    // Fetch existing cart
    if (actionType === "fetch-cart") {
      const cartId = formData.get("cartId");

      const response = await storefront.request(`
        query getCart($cartId: ID!) {
          cart(id: $cartId) {
            id
            checkoutUrl
            totalQuantity
            cost {
              totalAmount {
                amount
                currencyCode
              }
              subtotalAmount {
                amount
                currencyCode
              }
            }
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  cost {
                    totalAmount {
                      amount
                      currencyCode
                    }
                  }
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                      product {
                        title
                        featuredImage {
                          url
                          altText
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        variables: { cartId },
      });

      return { success: true, cart: response.data?.cart };
    }

    return { success: false, message: "Unknown action" };
  } catch (error) {
    console.error("Cart action error:", error);
    return { success: false, message: error.message || "An error occurred" };
  }
};

export default function CartPage() {
  const { hasToken, products } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [cart, setCart] = useState(null);

  const isLoading = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message);
    }
    if (fetcher.data?.cart) {
      setCart(fetcher.data.cart);
    }
  }, [fetcher.data, shopify]);

  const addToCart = (variantId) => {
    if (cart?.id) {
      fetcher.submit(
        { action: "add-to-cart", cartId: cart.id, variantId, quantity: "1" },
        { method: "POST" }
      );
    } else {
      fetcher.submit(
        { action: "create-cart", variantId, quantity: "1" },
        { method: "POST" }
      );
    }
  };

  const updateQuantity = (lineId, quantity) => {
    if (quantity < 1) {
      removeFromCart(lineId);
      return;
    }
    fetcher.submit(
      { action: "update-quantity", cartId: cart.id, lineId, quantity: quantity.toString() },
      { method: "POST" }
    );
  };

  const removeFromCart = (lineId) => {
    fetcher.submit(
      { action: "remove-from-cart", cartId: cart.id, lineId },
      { method: "POST" }
    );
  };

  const formatPrice = (amount, currencyCode) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(parseFloat(amount));
  };

  if (!hasToken) {
    return (
      <s-page heading="Shopping Cart">
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

  const cartLines = cart?.lines?.edges?.map((edge) => edge.node) || [];

  return (
    <s-page heading="Shopping Cart (Storefront API)">
      <s-section heading="Your Cart">
        {!cart || cartLines.length === 0 ? (
          <s-box padding="loose" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="base" align="center">
              <s-text tone="subdued">Your cart is empty</s-text>
              <s-text>Add products from the list below to get started.</s-text>
            </s-stack>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {cartLines.map((line) => (
              <s-box
                key={line.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="inline" gap="base" align="center" wrap>
                  {line.merchandise.product.featuredImage && (
                    <img
                      src={line.merchandise.product.featuredImage.url}
                      alt={line.merchandise.product.featuredImage.altText || ""}
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "cover",
                        borderRadius: "4px",
                      }}
                    />
                  )}
                  <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                    <s-text fontWeight="bold">
                      {line.merchandise.product.title}
                    </s-text>
                    <s-text tone="subdued">{line.merchandise.title}</s-text>
                    <s-text>
                      {formatPrice(
                        line.merchandise.price.amount,
                        line.merchandise.price.currencyCode
                      )}{" "}
                      each
                    </s-text>
                  </s-stack>
                  <s-stack direction="inline" gap="tight" align="center">
                    <s-button
                      variant="secondary"
                      size="small"
                      onClick={() => updateQuantity(line.id, line.quantity - 1)}
                      disabled={isLoading}
                    >
                      -
                    </s-button>
                    <s-text>{line.quantity}</s-text>
                    <s-button
                      variant="secondary"
                      size="small"
                      onClick={() => updateQuantity(line.id, line.quantity + 1)}
                      disabled={isLoading}
                    >
                      +
                    </s-button>
                  </s-stack>
                  <s-text fontWeight="bold">
                    {formatPrice(
                      line.cost.totalAmount.amount,
                      line.cost.totalAmount.currencyCode
                    )}
                  </s-text>
                  <s-button
                    variant="tertiary"
                    tone="critical"
                    size="small"
                    onClick={() => removeFromCart(line.id)}
                    disabled={isLoading}
                  >
                    Remove
                  </s-button>
                </s-stack>
              </s-box>
            ))}

            {/* Cart Summary */}
            <s-box
              padding="loose"
              borderWidth="base"
              borderRadius="base"
              background="subdued"
            >
              <s-stack direction="block" gap="base">
                <s-stack direction="inline" gap="base" align="center">
                  <s-text>Subtotal ({cart.totalQuantity} items):</s-text>
                  <s-text fontWeight="bold">
                    {formatPrice(
                      cart.cost.subtotalAmount.amount,
                      cart.cost.subtotalAmount.currencyCode
                    )}
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="base" align="center">
                  <s-text fontWeight="bold">Total:</s-text>
                  <s-text fontWeight="bold" tone="success">
                    {formatPrice(
                      cart.cost.totalAmount.amount,
                      cart.cost.totalAmount.currencyCode
                    )}
                  </s-text>
                </s-stack>
                <s-button
                  variant="primary"
                  onClick={() => window.open(cart.checkoutUrl, "_blank")}
                >
                  Proceed to Checkout
                </s-button>
              </s-stack>
            </s-box>

            {/* Cart Debug Info */}
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-heading level={4}>Cart Data (Storefront API)</s-heading>
              <pre style={{ margin: 0, fontSize: "11px", overflow: "auto" }}>
                <code>{JSON.stringify(cart, null, 2)}</code>
              </pre>
            </s-box>
          </s-stack>
        )}
      </s-section>

      <s-section heading={`Available Products (${products.length})`}>
        {products.length === 0 ? (
          <s-text tone="subdued">
            No products available. Create some products first.
          </s-text>
        ) : (
          <s-stack direction="block" gap="base">
            {products.map((product) => {
              const firstVariant = product.variants.edges[0]?.node;
              const isAvailable =
                product.availableForSale && firstVariant?.availableForSale;

              return (
                <s-box
                  key={product.id}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                >
                  <s-stack direction="inline" gap="base" align="center" wrap>
                    {product.featuredImage && (
                      <img
                        src={product.featuredImage.url}
                        alt={product.featuredImage.altText || product.title}
                        style={{
                          width: "80px",
                          height: "80px",
                          objectFit: "cover",
                          borderRadius: "4px",
                        }}
                      />
                    )}
                    <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                      <s-text fontWeight="bold">{product.title}</s-text>
                      <s-badge tone={isAvailable ? "success" : "critical"}>
                        {isAvailable ? "In Stock" : "Out of Stock"}
                      </s-badge>
                      <s-text>
                        {formatPrice(
                          product.priceRange.minVariantPrice.amount,
                          product.priceRange.minVariantPrice.currencyCode
                        )}
                      </s-text>
                      {product.variants.edges.length > 1 && (
                        <s-text tone="subdued">
                          {product.variants.edges.length} variants
                        </s-text>
                      )}
                    </s-stack>
                    <s-button
                      onClick={() => addToCart(firstVariant?.id)}
                      disabled={!isAvailable || isLoading}
                      {...(isLoading ? { loading: true } : {})}
                    >
                      Add to Cart
                    </s-button>
                  </s-stack>
                </s-box>
              );
            })}
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="Storefront Cart API">
        <s-paragraph>
          This page demonstrates the Storefront API cart functionality:
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            <strong>cartCreate</strong> - Create a new cart
          </s-list-item>
          <s-list-item>
            <strong>cartLinesAdd</strong> - Add items to cart
          </s-list-item>
          <s-list-item>
            <strong>cartLinesUpdate</strong> - Update quantities
          </s-list-item>
          <s-list-item>
            <strong>cartLinesRemove</strong> - Remove items
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Features">
        <s-unordered-list>
          <s-list-item>Real-time cart management</s-list-item>
          <s-list-item>Checkout URL generation</s-list-item>
          <s-list-item>Price calculation with tax</s-list-item>
          <s-list-item>Product availability checking</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
