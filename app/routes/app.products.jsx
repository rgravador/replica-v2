import { Link, useLoaderData } from "react-router";
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
        const response = await storefront.request(`
          query getProducts($first: Int!) {
            products(first: $first) {
              edges {
                node {
                  id
                  title
                  handle
                  description
                  availableForSale
                  productType
                  vendor
                  tags
                  featuredImage {
                    url
                    altText
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
                  variants(first: 1) {
                    edges {
                      node {
                        id
                        availableForSale
                        quantityAvailable
                      }
                    }
                  }
                }
              }
            }
          }
        `, {
          variables: { first: 50 },
        });

        products = response.data?.products?.edges?.map((edge) => edge.node) || [];
      } catch (error) {
        console.error("Storefront API error:", error);
      }
    }
  }

  return { hasToken, products };
};

export default function ProductsPage() {
  const { hasToken, products } = useLoaderData();

  const formatPrice = (amount, currencyCode) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(parseFloat(amount));
  };

  if (!hasToken) {
    return (
      <s-page heading="Products">
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

  return (
    <s-page heading="Products">
      <s-section heading={`All Products (${products.length})`}>
        {products.length === 0 ? (
          <s-box padding="loose" background="subdued" borderRadius="base">
            <s-stack direction="block" gap="base" align="center">
              <s-text>No products found.</s-text>
              <s-text tone="subdued">
                Create some products from the{" "}
                <s-link href="/app">Home page</s-link> to see them here.
              </s-text>
            </s-stack>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {products.map((product) => {
              const variant = product.variants?.edges?.[0]?.node;
              const isAvailable = product.availableForSale && variant?.availableForSale;

              return (
                <Link
                  key={product.id}
                  to={`/app/product/${product.handle}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <s-box
                    padding="base"
                    borderWidth="base"
                    borderRadius="base"
                    style={{ cursor: "pointer" }}
                  >
                    <s-stack direction="inline" gap="base" align="start" wrap>
                      {product.featuredImage ? (
                        <img
                          src={product.featuredImage.url}
                          alt={product.featuredImage.altText || product.title}
                          style={{
                            width: "100px",
                            height: "100px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <s-box
                          background="subdued"
                          borderRadius="base"
                          style={{
                            width: "100px",
                            height: "100px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <s-text tone="subdued">No image</s-text>
                        </s-box>
                      )}

                      <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                        <s-stack direction="inline" gap="tight" align="center">
                          <s-text fontWeight="bold">{product.title}</s-text>
                          <s-badge tone={isAvailable ? "success" : "critical"}>
                            {isAvailable ? "Available" : "Unavailable"}
                          </s-badge>
                        </s-stack>

                        {product.description && (
                          <s-text tone="subdued">
                            {product.description.length > 100
                              ? `${product.description.substring(0, 100)}...`
                              : product.description}
                          </s-text>
                        )}

                        <s-stack direction="inline" gap="base" align="center">
                          <s-text fontWeight="bold">
                            {formatPrice(
                              product.priceRange.minVariantPrice.amount,
                              product.priceRange.minVariantPrice.currencyCode
                            )}
                            {product.priceRange.minVariantPrice.amount !==
                              product.priceRange.maxVariantPrice.amount && (
                              <s-text tone="subdued">
                                {" - "}
                                {formatPrice(
                                  product.priceRange.maxVariantPrice.amount,
                                  product.priceRange.maxVariantPrice.currencyCode
                                )}
                              </s-text>
                            )}
                          </s-text>
                          {variant?.quantityAvailable !== null && (
                            <s-text tone="subdued">
                              {variant.quantityAvailable} in stock
                            </s-text>
                          )}
                        </s-stack>

                        <s-stack direction="inline" gap="tight" wrap>
                          {product.vendor && (
                            <s-badge>{product.vendor}</s-badge>
                          )}
                          {product.productType && (
                            <s-badge tone="info">{product.productType}</s-badge>
                          )}
                        </s-stack>
                      </s-stack>

                      <s-text tone="subdued">View →</s-text>
                    </s-stack>
                  </s-box>
                </Link>
              );
            })}
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="Quick Actions">
        <s-stack direction="block" gap="tight">
          <s-link href="/app">Create New Product</s-link>
          <s-link href="/app/cart">View Cart</s-link>
          <s-link href="/app/storefront">Manage Storefront Token</s-link>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="About This Page">
        <s-paragraph>
          This page displays all products using the Storefront API, showing
          customer-facing data like availability and pricing.
        </s-paragraph>
        <s-paragraph>
          Click on any product to view its full details and add it to your cart.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
