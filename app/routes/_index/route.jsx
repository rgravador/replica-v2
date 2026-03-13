import { redirect, Form, useLoaderData } from "react-router";
import { login, unauthenticated } from "../../shopify.server";
import prisma from "../../db.server";
import stylesheet from "./styles.css?url";

export const links = () => [
  { rel: "stylesheet", href: stylesheet },
];

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  let products = [];
  let shopDomain = null;

  try {
    // Get the first installed shop from sessions
    const session = await prisma.session.findFirst({
      where: { isOnline: false },
      orderBy: { id: "desc" },
    });

    if (session?.shop) {
      shopDomain = session.shop;
      const { admin } = await unauthenticated.admin(session.shop);

      const response = await admin.graphql(
        `#graphql
          query getProducts {
            products(first: 12, query: "status:active") {
              edges {
                node {
                  id
                  title
                  description
                  handle
                  featuredImage {
                    url
                    altText
                  }
                  compareAtPriceRange {
                    maxVariantCompareAtPrice {
                      amount
                    }
                  }
                  priceRange {
                    minVariantPrice {
                      amount
                    }
                  }
                }
              }
            }
          }`
      );

      const { data } = await response.json();

      products = data.products.edges.map(({ node }) => ({
        id: node.id,
        name: node.title,
        description: node.description || "",
        price: parseFloat(node.priceRange.minVariantPrice.amount).toFixed(2),
        comparePrice: node.compareAtPriceRange?.maxVariantCompareAtPrice?.amount
          ? parseFloat(node.compareAtPriceRange.maxVariantCompareAtPrice.amount).toFixed(2)
          : null,
        image: node.featuredImage?.url || "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=400",
        handle: node.handle,
      }));
    }
  } catch (error) {
    console.error("Failed to fetch products:", error);
  }

  return { showForm: Boolean(login), products, shopDomain };
};

const features = [
  {
    icon: "🎯",
    title: "Museum Quality",
    text: "Every replica is crafted with meticulous attention to historical accuracy and detail.",
  },
  {
    icon: "🛡️",
    title: "Non-Firing & Safe",
    text: "All our replicas are non-firing display pieces, perfect for collectors and reenactors.",
  },
  {
    icon: "📦",
    title: "Free Shipping",
    text: "Enjoy free shipping on all orders over $150. Secure packaging guaranteed.",
  },
];

export default function LandingPage() {
  const { showForm, products, shopDomain } = useLoaderData();
  const storeUrl = shopDomain ? `https://${shopDomain}` : null;

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <a href="/" className="landing-logo">
          <img src="/logo.png" alt="Frontier Armory Co." className="landing-logo-img" />
        </a>
        <ul className="landing-nav-links">
          <li className="landing-nav-item landing-nav-dropdown">
            <a href="#info" className="landing-nav-link">INFO <span className="landing-nav-arrow">›</span></a>
            <ul className="landing-dropdown-menu">
              <li><a href="#about">ABOUT US</a></li>
              <li><a href="#reseller">BE A RESELLER</a></li>
              <li><a href="#blogs">BLOGS</a></li>
              <li><a href="#disclaimer">DISCLAIMER</a></li>
              <li><a href="#license">SUBMIT YOUR LICENSE</a></li>
              <li><a href="#permit">LICENSE AND PERMIT APPLICATION</a></li>
              <li><a href="#warranty">WARRANTY AND RETURN POLICY</a></li>
              <li><a href="#faqs">FAQS</a></li>
              <li><a href="#contact">CONTACT US</a></li>
            </ul>
          </li>
          <li className="landing-nav-item landing-nav-dropdown">
            <a href="#brands" className="landing-nav-link">BRANDS <span className="landing-nav-arrow">›</span></a>
            <ul className="landing-dropdown-menu">
              <li><a href="#denix">DENIX</a></li>
              <li><a href="#gonher">GONHER</a></li>
              <li><a href="#schroedel">SCHROEDEL</a></li>
              <li><a href="#villa">VILLA GIOCATTOLI S.R.L</a></li>
              <li><a href="#edison">EDISON</a></li>
            </ul>
          </li>
          <li className="landing-nav-item landing-nav-dropdown">
            <a href="#era" className="landing-nav-link">ERA <span className="landing-nav-arrow">›</span></a>
            <ul className="landing-dropdown-menu">
              <li><a href="#new-arrivals">NEW ARRIVALS</a></li>
              <li><a href="#cap-guns">CAP GUNS</a></li>
              <li><a href="#colonial">COLONIAL AND PIRATE</a></li>
              <li><a href="#historical">HISTORICAL WEAPONS</a></li>
              <li><a href="#western">WESTERN</a></li>
              <li><a href="#ww1">WORLD WAR I</a></li>
              <li><a href="#ww2">WORLD WAR II</a></li>
              <li><a href="#post-ww2">POST WORLD WAR II</a></li>
            </ul>
          </li>
          <li className="landing-nav-item landing-nav-dropdown">
            <a href="#products" className="landing-nav-link">PRODUCT TYPE <span className="landing-nav-arrow">›</span></a>
            <ul className="landing-dropdown-menu">
              <li><a href="#flintlock-pistols">FLINTLOCK AND PERCUSSION PISTOLS</a></li>
              <li><a href="#flintlock-rifles">FLINTLOCK AND PERCUSSION RIFLES</a></li>
              <li><a href="#western-pistols">WESTERN PISTOLS</a></li>
              <li><a href="#western-rifles">WESTERN RIFLES</a></li>
              <li><a href="#military-pistols">MILITARY AND POLICE PISTOLS</a></li>
              <li><a href="#military-rifles">MILITARY AND POLICE RIFLES</a></li>
              <li><a href="#cap-guns">CAP GUNS</a></li>
              <li><a href="#cannons">CANNONS</a></li>
              <li><a href="#accessories">BULLETS, ACCESSORIES AND HOLSTERS</a></li>
              <li><a href="#stands">STANDS AND BRACKETS</a></li>
              <li><a href="#gift-cards">GIFT CARDS</a></li>
            </ul>
          </li>
          <li className="landing-nav-item landing-nav-dropdown">
            <a href="#vault" className="landing-nav-link">THE VAULT <span className="landing-nav-arrow">›</span></a>
            <ul className="landing-dropdown-menu">
              <li><a href="#bestselling">TOP 24 BESTSELLING DENIX REPLICAS</a></li>
              <li><a href="#ned-kelly">GUNS OF NED KELLY</a></li>
            </ul>
          </li>
        </ul>
        {storeUrl && (
          <a href={`${storeUrl}/cart`} className="landing-cart-link" target="_blank" rel="noopener noreferrer">
            <span className="landing-cart-icon">🛒</span>
            <span>Cart</span>
          </a>
        )}
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <h1 className="landing-heading">Authentic Western Replica Firearms</h1>
        <p className="landing-tagline">
          Museum-quality replicas of legendary revolvers, rifles, and accessories from the Wild West era.
          Perfect for collectors, reenactors, and western enthusiasts.
        </p>
        <a href="#products" className="landing-cta-button">
          Shop Collection
        </a>
      </section>

      {/* Products Section */}
      <section id="products" className="landing-section">
        <h2 className="landing-section-title">Featured Products</h2>
        {products.length === 0 ? (
          <p className="landing-no-products">No products available yet. Check back soon!</p>
        ) : (
          <div className="landing-products-grid">
            {products.map((product) => (
              <a
                key={product.id}
                href={storeUrl ? `${storeUrl}/products/${product.handle}` : "#"}
                className="landing-product-card"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="landing-product-image"
                />
                <div className="landing-product-info">
                  <h3 className="landing-product-name">{product.name}</h3>
                  <p className="landing-product-description">
                    {product.description.length > 120
                      ? `${product.description.substring(0, 120)}...`
                      : product.description}
                  </p>
                  <div>
                    <span className="landing-product-price">${product.price}</span>
                    {product.comparePrice && (
                      <span className="landing-product-compare-price">${product.comparePrice}</span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Features Section */}
      <section id="features" className="landing-section landing-features">
        <h2 className="landing-section-title">Why Choose Frontier Armory</h2>
        <ul className="landing-features-list">
          {features.map((feature, index) => (
            <li key={index} className="landing-feature">
              <div className="landing-feature-icon">{feature.icon}</div>
              <h3 className="landing-feature-title">{feature.title}</h3>
              <p className="landing-feature-text">{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Login Section */}
      {showForm && (
        <section id="login" className="landing-login-section">
          <h2 className="landing-login-title">Merchant Access</h2>
          <p className="landing-login-text">
            Already a Frontier Armory merchant? Log in to manage your store.
          </p>
          <Form className="landing-form" method="post" action="/auth/login">
            <label className="landing-label">
              <span>Shop Domain</span>
              <input
                className="landing-input"
                type="text"
                name="shop"
                placeholder="your-store.myshopify.com"
              />
            </label>
            <button className="landing-button" type="submit">
              Log In to Dashboard
            </button>
          </Form>
        </section>
      )}

      {/* Footer */}
      <footer className="landing-footer">
        <ul className="landing-footer-links">
          <li><a href="#products" className="landing-footer-link">Products</a></li>
          <li><a href="#features" className="landing-footer-link">About Us</a></li>
          <li><a href="#login" className="landing-footer-link">Merchant Login</a></li>
        </ul>
        <p className="landing-copyright">
          © 2024 Frontier Armory Co. All replicas are non-firing collectibles.
        </p>
      </footer>
    </div>
  );
}
