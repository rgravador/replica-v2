import { useEffect, useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getStorefrontClient, getStorefrontToken, deleteStorefrontToken } from "../storefront.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Check if we have a Storefront token
  const hasToken = !!(await getStorefrontToken(shop));

  // If we have a token, fetch products via Storefront API
  let products = [];
  let shopInfo = null;

  if (hasToken) {
    const storefront = await getStorefrontClient(admin, shop);
    if (storefront) {
      try {
        // Get shop info
        const shopResponse = await storefront.request(`
          query getShopInfo {
            shop {
              name
              primaryDomain {
                url
                host
              }
              paymentSettings {
                currencyCode
              }
            }
          }
        `);
        shopInfo = shopResponse.data?.shop;

        // Get products
        const productsResponse = await storefront.request(`
          query getProducts($first: Int!) {
            products(first: $first) {
              edges {
                node {
                  id
                  title
                  handle
                  description
                  availableForSale
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
                  images(first: 1) {
                    edges {
                      node {
                        url
                        altText
                      }
                    }
                  }
                  variants(first: 5) {
                    edges {
                      node {
                        id
                        title
                        availableForSale
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
          variables: { first: 10 },
        });
        products = productsResponse.data?.products?.edges?.map(edge => edge.node) || [];
      } catch (error) {
        console.error("Storefront API error:", error);
      }
    }
  }

  return { shop, hasToken, products, shopInfo };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "create-token") {
    // Create a new Storefront token
    const storefront = await getStorefrontClient(admin, shop);
    if (storefront) {
      return { success: true, message: "Storefront token created successfully!" };
    }
    return { success: false, message: "Failed to create Storefront token" };
  }

  if (actionType === "delete-token") {
    await deleteStorefrontToken(shop);
    return { success: true, message: "Storefront token deleted successfully!" };
  }

  if (actionType === "fetch-collections") {
    const storefront = await getStorefrontClient(admin, shop);
    if (storefront) {
      const response = await storefront.request(`
        query getCollections {
          collections(first: 10) {
            edges {
              node {
                id
                title
                handle
                description
                productsCount {
                  count
                }
              }
            }
          }
        }
      `);
      return {
        success: true,
        collections: response.data?.collections?.edges?.map(edge => edge.node) || []
      };
    }
    return { success: false, message: "No Storefront client available" };
  }

  return null;
};

export default function StorefrontPage() {
  const { shop, hasToken, products, shopInfo } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [collections, setCollections] = useState(null);

  const isLoading = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message);
    }
    if (fetcher.data?.collections) {
      setCollections(fetcher.data.collections);
    }
  }, [fetcher.data, shopify]);

  const createToken = () => {
    fetcher.submit({ action: "create-token" }, { method: "POST" });
  };

  const deleteToken = () => {
    fetcher.submit({ action: "delete-token" }, { method: "POST" });
  };

  const fetchCollections = () => {
    fetcher.submit({ action: "fetch-collections" }, { method: "POST" });
  };

  return (
    <s-page heading="Storefront API Integration">
      <s-section heading="Storefront Access Token">
        <s-paragraph>
          The Storefront API allows you to build customer-facing experiences.
          It requires a separate access token from the Admin API.
        </s-paragraph>
        <s-paragraph>
          <s-text>Shop: </s-text>
          <s-text fontWeight="bold">{shop}</s-text>
        </s-paragraph>
        <s-paragraph>
          <s-text>Token Status: </s-text>
          <s-text fontWeight="bold" tone={hasToken ? "success" : "critical"}>
            {hasToken ? "Active" : "Not configured"}
          </s-text>
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          {!hasToken ? (
            <s-button onClick={createToken} {...(isLoading ? { loading: true } : {})}>
              Create Storefront Token
            </s-button>
          ) : (
            <>
              <s-button onClick={fetchCollections} {...(isLoading ? { loading: true } : {})}>
                Fetch Collections
              </s-button>
              <s-button variant="secondary" tone="critical" onClick={deleteToken}>
                Delete Token
              </s-button>
            </>
          )}
        </s-stack>
      </s-section>

      {shopInfo && (
        <s-section heading="Shop Info (via Storefront API)">
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <pre style={{ margin: 0 }}>
              <code>{JSON.stringify(shopInfo, null, 2)}</code>
            </pre>
          </s-box>
        </s-section>
      )}

      {hasToken && products.length > 0 && (
        <s-section heading={`Products (${products.length})`}>
          <s-paragraph>
            These products were fetched using the Storefront API, which provides
            customer-facing data like availability and pricing.
          </s-paragraph>
          <s-stack direction="block" gap="base">
            {products.map((product) => (
              <s-box
                key={product.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="tight">
                  <s-heading level={4}>{product.title}</s-heading>
                  <s-text tone={product.availableForSale ? "success" : "critical"}>
                    {product.availableForSale ? "Available" : "Unavailable"}
                  </s-text>
                  <s-text>
                    Price: {product.priceRange.minVariantPrice.currencyCode} {product.priceRange.minVariantPrice.amount}
                    {product.priceRange.minVariantPrice.amount !== product.priceRange.maxVariantPrice.amount &&
                      ` - ${product.priceRange.maxVariantPrice.amount}`}
                  </s-text>
                  <s-text tone="subdued">Handle: {product.handle}</s-text>
                  {product.variants.edges.length > 0 && (
                    <s-text tone="subdued">
                      Variants: {product.variants.edges.map(v => v.node.title).join(", ")}
                    </s-text>
                  )}
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        </s-section>
      )}

      {collections && (
        <s-section heading={`Collections (${collections.length})`}>
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <pre style={{ margin: 0 }}>
              <code>{JSON.stringify(collections, null, 2)}</code>
            </pre>
          </s-box>
        </s-section>
      )}

      <s-section slot="aside" heading="Storefront API Features">
        <s-unordered-list>
          <s-list-item>Read products and collections</s-list-item>
          <s-list-item>Check inventory availability</s-list-item>
          <s-list-item>Create customer checkouts</s-list-item>
          <s-list-item>Access customer data</s-list-item>
          <s-list-item>Build headless storefronts</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Usage Example">
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <pre style={{ margin: 0, fontSize: "12px" }}>
            <code>{`import { getStorefrontClient }
  from "../storefront.server";

const storefront = await
  getStorefrontClient(admin, shop);

const response = await
  storefront.request(\`
    query {
      products(first: 10) {
        edges {
          node {
            id
            title
          }
        }
      }
    }
  \`);`}</code>
          </pre>
        </s-box>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
