import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Alert, EmptyState, Field, SkeletonGrid } from "./demo/DemoUi";
import ValkeyProductCard from "./ValkeyProductCard";

const defaultFilters = { q: "", categoryId: "", sort: "newest", maxPrice: "", minRating: "", page: "1" };

const ShopSection = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 12, source: "" });
  const [filters, setFilters] = useState(defaultFilters);
  const [agenticQuery, setAgenticQuery] = useState("");
  const [agenticPlan, setAgenticPlan] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agenticLoading, setAgenticLoading] = useState(false);
  const [error, setError] = useState("");

  const params = useMemo(() => ({ ...defaultFilters, ...Object.fromEntries(searchParams.entries()) }), [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setAgenticPlan(null);
    try {
      const requestParams = {
        q: params.q,
        categoryId: params.categoryId,
        sort: params.sort,
        maxPrice: params.maxPrice,
        minRating: params.minRating,
        page: params.page,
        pageSize: 12
      };
      const needsSearch = Boolean(requestParams.q || requestParams.minRating);
      const data = needsSearch ? await api.search(requestParams) : await api.products(requestParams);
      setProducts(data.results || []);
      setMeta({ total: data.total || 0, page: data.page || Number(params.page || 1), pageSize: data.pageSize || 12, source: data.source || "catalog" });
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    setFilters(params);
    load();
  }, [params, load]);

  useEffect(() => {
    api.categories().then((data) => setCategories(data.results || [])).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const value = filters.q.trim();
    if (value.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      api.suggestions(value).then((data) => setSuggestions(data.suggestions || [])).catch(() => setSuggestions([]));
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [filters.q]);

  const submitFilters = (event) => {
    event.preventDefault();
    setSearchParams(clean({ ...filters, page: "1" }));
  };

  const goToPage = (page) => {
    setSearchParams(clean({ ...params, page: String(page) }));
  };

  const runAgentic = async (event) => {
    event.preventDefault();
    setError("");
    setAgenticLoading(true);
    try {
      const data = await api.agenticSearch(agenticQuery);
      setProducts(data.results || []);
      setMeta({ total: data.total || 0, page: 1, pageSize: 12, source: data.source || "agentic" });
      setAgenticPlan(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setAgenticLoading(false);
      setLoading(false);
    }
  };

  const flatCategories = useMemo(() => categories.flatMap((category) => [category, ...(category.children || [])]), [categories]);
  const pages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  return (
    <section className="demo-section">
      <div className="demo-shell demo-shop-layout">
        <aside className="demo-filter-panel" aria-label="Product filters">
          <form onSubmit={submitFilters}>
            <h2>Filters</h2>
            <Field id="shop-q" label="Keyword">
              <input
                id="shop-q"
                value={filters.q}
                onChange={(event) => setFilters((value) => ({ ...value, q: event.target.value }))}
                placeholder="gaming laptop"
              />
            </Field>
            {suggestions.length > 0 && (
              <div className="demo-suggestions" aria-label="Search suggestions">
                {suggestions.slice(0, 5).map((suggestion) => (
                  <button
                    className="demo-chip"
                    type="button"
                    key={suggestion}
                    onClick={() => setFilters((value) => ({ ...value, q: suggestion }))}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <Field id="shop-category" label="Category">
              <select
                id="shop-category"
                value={filters.categoryId}
                onChange={(event) => setFilters((value) => ({ ...value, categoryId: event.target.value }))}
              >
                <option value="">All categories</option>
                {flatCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="shop-max-price" label="Max price">
              <input
                id="shop-max-price"
                type="number"
                min="0"
                inputMode="numeric"
                value={filters.maxPrice}
                onChange={(event) => setFilters((value) => ({ ...value, maxPrice: event.target.value }))}
                placeholder="60000"
              />
            </Field>
            <Field id="shop-rating" label="Minimum rating">
              <select
                id="shop-rating"
                value={filters.minRating}
                onChange={(event) => setFilters((value) => ({ ...value, minRating: event.target.value }))}
              >
                <option value="">Any rating</option>
                <option value="4">4+</option>
                <option value="4.5">4.5+</option>
              </select>
            </Field>
            <Field id="shop-sort" label="Sort">
              <select id="shop-sort" value={filters.sort} onChange={(event) => setFilters((value) => ({ ...value, sort: event.target.value }))}>
                <option value="newest">Newest</option>
                <option value="price_asc">Price low to high</option>
                <option value="price_desc">Price high to low</option>
                <option value="rating_desc">Top rated</option>
                <option value="name_asc">Name</option>
              </select>
            </Field>
            <button className="demo-button" type="submit">
              <i className="ph ph-funnel" aria-hidden="true" />
              Apply filters
            </button>
          </form>
        </aside>

        <div>
          <form className="demo-agentic-panel" onSubmit={runAgentic}>
            <h2>Agentic search</h2>
            <Field id="agentic-query" label="Natural language query">
              <input
                id="agentic-query"
                value={agenticQuery}
                placeholder="phones with good camera under 30000"
                onChange={(event) => setAgenticQuery(event.target.value)}
              />
            </Field>
            <button className="demo-button" type="submit" disabled={agenticLoading}>
              <i className="ph ph-sparkle" aria-hidden="true" />
              {agenticLoading ? "Searching" : "Run agentic search"}
            </button>
            {agenticPlan && (
              <p className="demo-plan" aria-live="polite">
                {agenticPlan.plan.explanation} Source: {agenticPlan.source}. Query: {agenticPlan.generatedSearchQuery}.
              </p>
            )}
          </form>

          {error && <Alert type="danger">{error}</Alert>}

          <div className="demo-toolbar">
            <div>
              <strong>{meta.total} products</strong>
              <div className="demo-muted">
                Page {meta.page} of {pages} - {meta.source || "catalog"}
              </div>
            </div>
          </div>

          {loading ? (
            <SkeletonGrid />
          ) : products.length ? (
            <>
              <div className="demo-grid demo-grid--products">
                {products.map((product) => (
                  <ValkeyProductCard product={product} key={product.id} />
                ))}
              </div>
              <div className="demo-pagination">
                <button className="demo-button demo-button--secondary" type="button" disabled={meta.page <= 1 || Boolean(agenticPlan)} onClick={() => goToPage(meta.page - 1)}>
                  Previous
                </button>
                <button className="demo-button" type="button" disabled={meta.page >= pages || Boolean(agenticPlan)} onClick={() => goToPage(meta.page + 1)}>
                  Next
                </button>
              </div>
            </>
          ) : (
            <EmptyState
              icon="ph-magnifying-glass"
              title="No products found"
              action={
                <button className="demo-button demo-button--secondary" type="button" onClick={() => setSearchParams({})}>
                  Clear filters
                </button>
              }
            >
              Try a broader query or remove one of the active filters.
            </EmptyState>
          )}
        </div>
      </div>
    </section>
  );
};

function clean(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "1"));
}

export default ShopSection;
