import { useEffect } from "react";
import { useFetcher, Link } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getStorefrontClient } from "../storefront.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];

  // Step 1: Create product via Admin API
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
            demoInfo: metafield(namespace: "$app", key: "demo_info") {
              jsonValue
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
          metafields: [
            {
              namespace: "$app",
              key: "demo_info",
              value: "Created by React Router Template",
            },
          ],
        },
      },
    },
  );
  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;

  // Step 2: Update variant price via Admin API
  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyReactRouterTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );
  const variantResponseJson = await variantResponse.json();

  // Step 3: Publish product to Online Store (required for Storefront API visibility)
  await admin.graphql(
    `#graphql
    mutation publishProduct($id: ID!) {
      productUpdate(input: { id: $id, status: ACTIVE }) {
        product {
          id
          status
        }
      }
      publishablePublish(id: $id, input: { publicationId: "gid://shopify/Publication/0" }) {
        publishable {
          availablePublicationsCount {
            count
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: { id: product.id },
    },
  );

  // Step 4: Fetch product via Storefront API for customer-facing preview
  let storefrontProduct = null;
  try {
    const storefront = await getStorefrontClient(admin, shop);
    if (storefront) {
      // Small delay to allow indexing
      await new Promise((resolve) => setTimeout(resolve, 500));

      const storefrontResponse = await storefront.request(
        `#graphql
        query getProductByHandle($handle: String!) {
          productByHandle(handle: $handle) {
            id
            title
            handle
            description
            availableForSale
            productType
            vendor
            tags
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
            images(first: 5) {
              edges {
                node {
                  url
                  altText
                  width
                  height
                }
              }
            }
            variants(first: 10) {
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
                }
              }
            }
            seo {
              title
              description
            }
          }
        }`,
        {
          variables: { handle: product.handle },
        },
      );
      storefrontProduct = storefrontResponse.data?.productByHandle;
    }
  } catch (error) {
    console.error("Storefront API error:", error);
  }

  // Step 5: Create metaobject via Admin API
  const metaobjectResponse = await admin.graphql(
    `#graphql
    mutation shopifyReactRouterTemplateUpsertMetaobject($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
      metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
        metaobject {
          id
          handle
          title: field(key: "title") {
            jsonValue
          }
          description: field(key: "description") {
            jsonValue
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        handle: {
          type: "$app:example",
          handle: "demo-entry",
        },
        metaobject: {
          fields: [
            { key: "title", value: "Demo Entry" },
            {
              key: "description",
              value:
                "This metaobject was created by the Shopify app template to demonstrate the metaobject API.",
            },
          ],
        },
      },
    },
  );
  const metaobjectResponseJson = await metaobjectResponse.json();

  return {
    product: responseJson.data.productCreate.product,
    variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
    metaobject: metaobjectResponseJson.data.metaobjectUpsert.metaobject,
    storefrontProduct,
  };
};

export default function Index() {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  useEffect(() => {
    if (fetcher.data?.product?.id) {
      shopify.toast.show("Product created");
    }
  }, [fetcher.data?.product?.id, shopify]);
  const generateProduct = () => fetcher.submit({}, { method: "POST" });

  return (
    <s-page heading="Shopify app template">
      <s-button slot="primary-action" onClick={generateProduct}>
        Generate a product
      </s-button>

      <s-section heading="Congrats on creating a new Shopify app 🎉">
        <s-paragraph>
          This embedded app template uses{" "}
          <s-link
            href="https://shopify.dev/docs/apps/tools/app-bridge"
            target="_blank"
          >
            App Bridge
          </s-link>{" "}
          interface examples like an{" "}
          <s-link href="/app/additional">additional page in the app nav</s-link>
          , as well as an{" "}
          <s-link
            href="https://shopify.dev/docs/api/admin-graphql"
            target="_blank"
          >
            Admin GraphQL
          </s-link>{" "}
          mutation demo, to provide a starting point for app development.
        </s-paragraph>
      </s-section>
      <s-section heading="Get started with products">
        <s-paragraph>
          Generate a product with GraphQL and get the JSON output for that
          product. Learn more about the{" "}
          <s-link
            href="https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate"
            target="_blank"
          >
            productCreate
          </s-link>{" "}
          mutation in our API references. Includes a product{" "}
          <s-link
            href="https://shopify.dev/docs/apps/build/custom-data/metafields"
            target="_blank"
          >
            metafield
          </s-link>{" "}
          and{" "}
          <s-link
            href="https://shopify.dev/docs/apps/build/custom-data/metaobjects"
            target="_blank"
          >
            metaobject
          </s-link>
          .
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-button
            onClick={generateProduct}
            {...(isLoading ? { loading: true } : {})}
          >
            Generate a product
          </s-button>
          {fetcher.data?.product && (
            <>
              <Link to={`/app/product/${fetcher.data.product.handle}`}>
                <s-button variant="primary">
                  View Product (Storefront)
                </s-button>
              </Link>
              <s-button
                onClick={() => {
                  shopify.intents.invoke?.("edit:shopify/Product", {
                    value: fetcher.data?.product?.id,
                  });
                }}
                variant="tertiary"
              >
                Edit in Admin
              </s-button>
            </>
          )}
        </s-stack>
        {fetcher.data?.product && (
          <>
            {/* Storefront API Preview - Customer-facing data */}
            {fetcher.data.storefrontProduct && (
              <s-section heading="Storefront API Preview (Customer View)">
                <Link
                  to={`/app/product/${fetcher.data.storefrontProduct.handle}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <s-box
                    padding="loose"
                    borderWidth="base"
                    borderRadius="base"
                    background="subdued"
                    style={{ cursor: "pointer" }}
                  >
                    <s-stack direction="block" gap="base">
                      <s-stack direction="inline" gap="base" align="center">
                        <s-heading level={3}>
                          {fetcher.data.storefrontProduct.title}
                        </s-heading>
                        <s-badge tone="info">Click to view details</s-badge>
                      </s-stack>
                      <s-stack direction="inline" gap="tight">
                        <s-badge
                          tone={
                            fetcher.data.storefrontProduct.availableForSale
                              ? "success"
                              : "critical"
                          }
                        >
                          {fetcher.data.storefrontProduct.availableForSale
                            ? "Available"
                            : "Unavailable"}
                        </s-badge>
                      </s-stack>
                      <s-text>
                        <strong>Price: </strong>
                        {fetcher.data.storefrontProduct.priceRange.minVariantPrice
                          .currencyCode}{" "}
                        {
                          fetcher.data.storefrontProduct.priceRange.minVariantPrice
                            .amount
                        }
                      </s-text>
                      <s-text tone="subdued">
                        Handle: {fetcher.data.storefrontProduct.handle}
                      </s-text>
                      {fetcher.data.storefrontProduct.variants.edges.length > 0 && (
                        <s-text>
                          <strong>Variants: </strong>
                          {fetcher.data.storefrontProduct.variants.edges
                            .map((v) => v.node.title)
                            .join(", ")}
                        </s-text>
                      )}
                    </s-stack>
                  </s-box>
                </Link>
                <s-box
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <s-heading level={4}>Storefront API Response</s-heading>
                  <pre style={{ margin: 0, fontSize: "12px" }}>
                    <code>
                      {JSON.stringify(fetcher.data.storefrontProduct, null, 2)}
                    </code>
                  </pre>
                </s-box>
              </s-section>
            )}

            {!fetcher.data.storefrontProduct && (
              <s-section heading="Storefront API Preview">
                <s-banner tone="warning">
                  <s-text>
                    Storefront API data not available. The product may not be
                    published yet or the Storefront token needs to be created.
                    Visit the{" "}
                    <s-link href="/app/storefront">Storefront API page</s-link> to
                    set up your token.
                  </s-text>
                </s-banner>
              </s-section>
            )}

            {/* Admin API Response */}
            <s-section heading="Admin API Response">
              <s-stack direction="block" gap="base">
                <s-heading level={4}>productCreate mutation</s-heading>
                <s-box
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <pre style={{ margin: 0 }}>
                    <code>{JSON.stringify(fetcher.data.product, null, 2)}</code>
                  </pre>
                </s-box>

                <s-heading level={4}>productVariantsBulkUpdate mutation</s-heading>
                <s-box
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <pre style={{ margin: 0 }}>
                    <code>{JSON.stringify(fetcher.data.variant, null, 2)}</code>
                  </pre>
                </s-box>

                <s-heading level={4}>metaobjectUpsert mutation</s-heading>
                <s-box
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <pre style={{ margin: 0 }}>
                    <code>
                      {JSON.stringify(fetcher.data.metaobject, null, 2)}
                    </code>
                  </pre>
                </s-box>
              </s-stack>
            </s-section>
          </>
        )}
      </s-section>

      <s-section slot="aside" heading="App template specs">
        <s-paragraph>
          <s-text>Framework: </s-text>
          <s-link href="https://reactrouter.com/" target="_blank">
            React Router
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Interface: </s-text>
          <s-link
            href="https://shopify.dev/docs/api/app-home/using-polaris-components"
            target="_blank"
          >
            Polaris web components
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>API: </s-text>
          <s-link
            href="https://shopify.dev/docs/api/admin-graphql"
            target="_blank"
          >
            GraphQL
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Custom data: </s-text>
          <s-link
            href="https://shopify.dev/docs/apps/build/custom-data"
            target="_blank"
          >
            Metafields &amp; metaobjects
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Database: </s-text>
          <s-link href="https://www.prisma.io/" target="_blank">
            Prisma
          </s-link>
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="Next steps">
        <s-unordered-list>
          <s-list-item>
            Build an{" "}
            <s-link
              href="https://shopify.dev/docs/apps/getting-started/build-app-example"
              target="_blank"
            >
              example app
            </s-link>
          </s-list-item>
          <s-list-item>
            Explore Shopify&apos;s API with{" "}
            <s-link
              href="https://shopify.dev/docs/apps/tools/graphiql-admin-api"
              target="_blank"
            >
              GraphiQL
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
