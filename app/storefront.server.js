import { createStorefrontApiClient } from "@shopify/storefront-api-client";
import prisma from "./db.server";
import { apiVersion } from "./shopify.server";

/**
 * Creates a Storefront API client for the given shop.
 * @param {string} shop - The shop domain (e.g., "my-store.myshopify.com")
 * @param {string} storefrontAccessToken - The Storefront access token
 * @returns {import("@shopify/storefront-api-client").StorefrontApiClient}
 */
export function createStorefrontClient(shop, storefrontAccessToken) {
  return createStorefrontApiClient({
    storeDomain: `https://${shop}`,
    apiVersion,
    privateAccessToken: storefrontAccessToken,
  });
}

/**
 * Gets an existing Storefront access token for the shop from the database.
 * @param {string} shop - The shop domain
 * @returns {Promise<string | null>}
 */
export async function getStorefrontToken(shop) {
  const record = await prisma.storefrontToken.findUnique({
    where: { shop },
  });
  return record?.accessToken || null;
}

/**
 * Saves a Storefront access token for the shop to the database.
 * @param {string} shop - The shop domain
 * @param {string} accessToken - The Storefront access token
 * @param {string} [title] - Optional title for the token
 * @returns {Promise<import("@prisma/client").StorefrontToken>}
 */
export async function saveStorefrontToken(shop, accessToken, title = "App Storefront Token") {
  return prisma.storefrontToken.upsert({
    where: { shop },
    update: { accessToken, title, updatedAt: new Date() },
    create: { shop, accessToken, title },
  });
}

/**
 * Deletes a Storefront access token for the shop from the database.
 * @param {string} shop - The shop domain
 * @returns {Promise<void>}
 */
export async function deleteStorefrontToken(shop) {
  await prisma.storefrontToken.delete({
    where: { shop },
  }).catch(() => {
    // Ignore if token doesn't exist
  });
}

/**
 * Creates a new Storefront access token via the Admin API and saves it to the database.
 * @param {import("@shopify/shopify-app-react-router/server").AdminApiContext} admin - The Admin API context
 * @param {string} shop - The shop domain
 * @param {string} [title] - Optional title for the token
 * @returns {Promise<{accessToken: string, title: string} | null>}
 */
export async function createAndSaveStorefrontToken(admin, shop, title = "App Storefront Token") {
  const response = await admin.graphql(`
    mutation storefrontAccessTokenCreate($input: StorefrontAccessTokenInput!) {
      storefrontAccessTokenCreate(input: $input) {
        storefrontAccessToken {
          accessToken
          title
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      input: { title },
    },
  });

  const { data } = await response.json();

  if (data?.storefrontAccessTokenCreate?.userErrors?.length > 0) {
    console.error("Failed to create Storefront token:", data.storefrontAccessTokenCreate.userErrors);
    return null;
  }

  const token = data?.storefrontAccessTokenCreate?.storefrontAccessToken;

  if (token?.accessToken) {
    await saveStorefrontToken(shop, token.accessToken, token.title);
    return token;
  }

  return null;
}

/**
 * Gets or creates a Storefront access token for the shop.
 * First checks the database, then creates a new one via Admin API if needed.
 * @param {import("@shopify/shopify-app-react-router/server").AdminApiContext} admin - The Admin API context
 * @param {string} shop - The shop domain
 * @returns {Promise<string | null>}
 */
export async function getOrCreateStorefrontToken(admin, shop) {
  // First, try to get existing token from database
  const existingToken = await getStorefrontToken(shop);
  if (existingToken) {
    return existingToken;
  }

  // Create a new token via Admin API
  const newToken = await createAndSaveStorefrontToken(admin, shop);
  return newToken?.accessToken || null;
}

/**
 * Helper to get a ready-to-use Storefront client.
 * Gets or creates the token automatically.
 * @param {import("@shopify/shopify-app-react-router/server").AdminApiContext} admin - The Admin API context
 * @param {string} shop - The shop domain
 * @returns {Promise<import("@shopify/storefront-api-client").StorefrontApiClient | null>}
 */
export async function getStorefrontClient(admin, shop) {
  const token = await getOrCreateStorefrontToken(admin, shop);
  if (!token) {
    return null;
  }
  return createStorefrontClient(shop, token);
}
