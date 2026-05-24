import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import ValkeyProductCard from "./ValkeyProductCard";

const ShopSection = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 12 });
  const [filters, setFilters] = useState({ q: "", categoryId: "", sort: "newest", maxPrice: "", minRating: "" });
  const [agenticQuery, setAgenticQuery] = useState("budget gaming laptops under 60000 with good ratings");
  const [agenticPlan, setAgenticPlan] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async (next = filters, page = 1) => {
    setError("");
    try {
      const data = next.q
        ? await api.search({ ...next, page, pageSize: 12 })
        : await api.products({ ...next, page, pageSize: 12 });
      setProducts(data.results || []);
      setMeta({ total: data.total || 0, page: data.page || page, pageSize: data.pageSize || 12 });
    } catch (err) {
      setError(err.message);
    }
  }, [filters]);

  useEffect(() => {
    api.categories().then((data) => setCategories(data.results || [])).catch(() => setCategories([]));
    load();
  }, [load]);

  const submitFilters = (event) => {
    event.preventDefault();
    setAgenticPlan(null);
    load(filters, 1);
  };

  const runAgentic = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await api.agenticSearch(agenticQuery);
      setProducts(data.results || []);
      setMeta({ total: data.total || 0, page: 1, pageSize: 12 });
      setAgenticPlan(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const flatCategories = categories.flatMap((category) => [category, ...(category.children || [])]);
  const pages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  return (
    <section className="shop py-80">
      <div className="container container-lg">
        <form onSubmit={runAgentic} className="border border-main-100 rounded-8 p-24 mb-32 bg-main-50">
          <h5 className="mb-16">Agentic Search</h5>
          <div className="d-flex gap-12 flex-wrap">
            <input className="common-input flex-grow-1" value={agenticQuery} onChange={(e) => setAgenticQuery(e.target.value)} />
            <button className="btn btn-main flex-align gap-8" type="submit"><i className="ph ph-sparkle" /> Search</button>
          </div>
          {agenticPlan && <p className="mt-16 mb-0 text-gray-700">{agenticPlan.plan.explanation}</p>}
        </form>

        <form onSubmit={submitFilters} className="row gy-3 mb-32">
          <div className="col-lg-4"><input className="common-input" placeholder="Search products" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /></div>
          <div className="col-lg-3">
            <select className="common-input" value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}>
              <option value="">All categories</option>
              {flatCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div className="col-lg-2"><input className="common-input" placeholder="Max price" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} /></div>
          <div className="col-lg-2">
            <select className="common-input" value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price low</option>
              <option value="price_desc">Price high</option>
              <option value="rating_desc">Top rated</option>
            </select>
          </div>
          <div className="col-lg-1"><button className="btn btn-main h-100 w-100" type="submit"><i className="ph ph-funnel" /></button></div>
        </form>

        {error && <div className="alert alert-danger">{error}</div>}
        <div className="flex-between mb-24">
          <span className="text-gray-600">{meta.total} products</span>
          <span className="text-gray-600">Page {meta.page} of {pages}</span>
        </div>
        <div className="row gy-4 g-12">
          {products.map((product) => (
            <div className="col-xxl-3 col-lg-4 col-sm-6" key={product.id}>
              <ValkeyProductCard product={product} />
            </div>
          ))}
        </div>
        <div className="mt-32 flex-center gap-12">
          <button className="btn btn-outline-main" disabled={meta.page <= 1} onClick={() => load(filters, meta.page - 1)}>Previous</button>
          <button className="btn btn-main" disabled={meta.page >= pages} onClick={() => load(filters, meta.page + 1)}>Next</button>
        </div>
      </div>
    </section>
  );
};

export default ShopSection;
