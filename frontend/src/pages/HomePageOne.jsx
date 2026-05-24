import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatPrice } from "../api/client";
import DemoLayout from "../components/demo/DemoLayout";
import { Alert, EmptyState, SkeletonGrid } from "../components/demo/DemoUi";
import ValkeyProductCard from "../components/ValkeyProductCard";

const HomePageOne = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [healthData, categoriesData, featuredData, trendingData, recData] = await Promise.all([
          api.health().catch(() => null),
          api.categories(),
          api.products({ pageSize: 8, sort: "rating_desc" }),
          api.trending({ window: "24h", limit: 8 }),
          api.recommendations({ limit: 8 })
        ]);
        if (!alive) return;
        setHealth(healthData);
        setCategories(categoriesData.results || []);
        setFeatured(featuredData.results || []);
        setTrending(trendingData.results?.length ? trendingData.results : featuredData.results || []);
        setRecommendations(recData.results?.length ? recData.results : featuredData.results || []);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const flatCategories = useMemo(() => categories.flatMap((category) => [category, ...(category.children || [])]), [categories]);
  const heroProduct = featured[0];

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <DemoLayout>
      <section className="demo-hero">
        <div className="demo-shell demo-hero__panel">
          <div>
            <span className="demo-eyebrow">
              <i className="ph ph-lightning" aria-hidden="true" />
              Curated electronics
            </span>
            <h1>Find, cart, and checkout electronics in real time.</h1>
            <p>Compare laptops, phones, audio gear, wearables, accessories, and gaming essentials with a fast path from search to checkout.</p>
            <form className="demo-hero-search" onSubmit={submitSearch} role="search">
              <label className="sr-only" htmlFor="home-search">
                Search products
              </label>
              <input id="home-search" value={query} onChange={(event) => setQuery(event.target.value)} />
              <button className="demo-button" type="submit">
                <i className="ph ph-magnifying-glass" aria-hidden="true" />
                Search
              </button>
            </form>
            <div className="demo-metric-strip" aria-label="Demo data status">
              <div className="demo-metric">
                <strong>{featured.length || 24}</strong>
                <span>Products</span>
              </div>
              <div className="demo-metric">
                <strong>{health?.valkey === "connected" ? "Live" : "Ready"}</strong>
                <span>Catalog</span>
              </div>
              <div className="demo-metric">
                <strong>{health?.search === "available" ? "Fast" : "Smart"}</strong>
                <span>Search</span>
              </div>
            </div>
          </div>
          <div className="demo-hero__visual">
            <img
              className="demo-hero__image"
              src={heroProduct?.image || "/assets/images/thumbs/product-two-img1.png"}
              alt={heroProduct?.name || "Featured electronics product"}
            />
            {heroProduct && (
              <div className="demo-metric-strip">
                <div className="demo-metric">
                  <strong>{formatPrice(heroProduct.price)}</strong>
                  <span>{heroProduct.name}</span>
                </div>
                <div className="demo-metric">
                  <strong>{heroProduct.rating}</strong>
                  <span>Rating</span>
                </div>
                <div className="demo-metric">
                  <strong>{heroProduct.availableStock}</strong>
                  <span>Available</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="demo-section">
        <div className="demo-shell">
          <div className="demo-section__heading">
            <div>
              <h2>Shop by category</h2>
              <p>Start with the product families shoppers compare most often.</p>
            </div>
            <Link className="demo-button demo-button--secondary" to="/shop">
              View catalog
            </Link>
          </div>
          {loading ? (
            <SkeletonGrid count={4} />
          ) : (
            <div className="demo-grid demo-grid--categories">
              {flatCategories.slice(0, 8).map((category) => (
                <Link className="demo-category-card" to={`/shop?categoryId=${encodeURIComponent(category.id)}`} key={category.id}>
                  <span>{category.name}</span>
                  <i className={`ph ph-${category.icon || "tag"}`} aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="demo-shell">
          <Alert type="danger">{error}</Alert>
        </div>
      )}

      <ProductSection title="Trending now" products={trending} loading={loading} empty="Trending data will appear after product events." />
      <ProductSection title="Recommended for you" products={recommendations} loading={loading} empty="Recommendations will appear after browsing." />
    </DemoLayout>
  );
};

const ProductSection = ({ title, products, loading, empty }) => (
  <section className="demo-section">
    <div className="demo-shell">
      <div className="demo-section__heading">
        <div>
          <h2>{title}</h2>
          <p>{products.length ? "Fresh picks from the catalog." : empty}</p>
        </div>
      </div>
      {loading ? (
        <SkeletonGrid />
      ) : products.length ? (
        <div className="demo-grid demo-grid--products">
          {products.map((product) => (
            <ValkeyProductCard product={product} key={`${title}-${product.id}`} />
          ))}
        </div>
      ) : (
        <EmptyState title={title}>{empty}</EmptyState>
      )}
    </div>
  </section>
);

export default HomePageOne;
