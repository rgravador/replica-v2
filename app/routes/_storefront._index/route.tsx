import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { storefrontClient, PRODUCTS_QUERY } from "~/storefront.server";
import type { ProductCard as ProductCardType, Shop } from "~/storefront.types";
import { ProductGrid } from "~/components/storefront/ProductGrid";
import { EmptyState } from "~/components/storefront/EmptyState";
import styles from "./styles.module.css";

interface LoaderData {
  products: ProductCardType[];
  shop: Shop;
  hasNextPage: boolean;
  endCursor: string | null;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");

  try {
    const { data, errors } = await storefrontClient.request(PRODUCTS_QUERY, {
      variables: {
        first: 24,
        after: cursor,
      },
    });

    if (errors) {
      console.error("Storefront API errors:", errors);
      throw new Response("Failed to load products", { status: 500 });
    }

    return {
      products: data.products.nodes,
      shop: data.shop,
      hasNextPage: data.products.pageInfo.hasNextPage,
      endCursor: data.products.pageInfo.endCursor,
    };
  } catch (error) {
    console.error("Failed to fetch products:", error);
    // Return empty state if API fails (e.g., no token configured)
    return {
      products: [],
      shop: { name: "Store", description: null },
      hasNextPage: false,
      endCursor: null,
    };
  }
}

export default function Storefront() {
  const { products, hasNextPage, endCursor } = useLoaderData<typeof loader>();

  return (
    <>
      {/* Hero Section */}
      <section className={styles.landingHero}>
        <h1 className={styles.landingHeading}>Authentic Western Replica Firearms</h1>
        <p className={styles.landingTagline}>
          Museum-quality replicas of legendary revolvers, rifles, and accessories from the Wild West era.
          Perfect for collectors, reenactors, and western enthusiasts.
        </p>
        <a href="#products" className={styles.landingCtaButton}>
          Shop Collection
        </a>
      </section>

      <div className={styles.page}>
        <section id="products" className={styles.products}>
        <h2 className={styles.sectionTitle}>Products</h2>

        {products.length > 0 ? (
          <>
            <ProductGrid products={products} />

            {hasNextPage && endCursor && (
              <div className={styles.pagination}>
                <Link
                  to={`/?cursor=${endCursor}`}
                  className={styles.loadMore}
                >
                  Load More Products
                </Link>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            heading="No products available"
            message="Check back soon for new arrivals."
          />
        )}
        </section>
      </div>
    </>
  );
}
