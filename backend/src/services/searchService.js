const { sortProducts } = require("./catalogService");
const { enrichProducts } = require("./productPresenter");

function includes(haystack, needle) {
  return String(haystack || "").toLowerCase().includes(String(needle || "").toLowerCase());
}

class SearchService {
  constructor(store, repos) {
    this.store = store;
    this.repos = repos;
  }

  async search(query = {}) {
    if (this.store.capabilities?.search && this.store.capabilities?.json) {
      try {
        return await this.searchWithValkey(query);
      } catch (error) {
        console.warn(`Valkey Search unavailable for request, using fallback: ${error.message}`);
      }
    }
    return this.searchFallback(query, "fallback");
  }

  async searchFallback(query = {}, source = "fallback") {
    const q = (query.q || "").trim();
    let products = (await this.repos.products.all()).filter((item) => item.status === "active");
    if (q) {
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      products = products.filter((product) => {
        const text = [product.name, product.description, product.brand, product.categoryId, ...(product.tags || [])]
          .join(" ")
          .toLowerCase();
        return terms.every((term) => text.includes(term));
      });
    }
    if (query.categoryId) products = products.filter((item) => item.categoryId === query.categoryId);
    if (query.minPrice !== undefined) products = products.filter((item) => item.price >= query.minPrice);
    if (query.maxPrice !== undefined) products = products.filter((item) => item.price <= query.maxPrice);
    if (query.minRating !== undefined) products = products.filter((item) => item.rating >= query.minRating);
    if (query.brand) products = products.filter((item) => includes(item.brand, query.brand));

    const facets = this.facets(products);
    products = sortProducts(products, query.sort || (q ? "rating_desc" : "newest"));
    const page = query.page || 1;
    const pageSize = Math.min(Math.max(query.pageSize || 12, 1), 100);
    const total = products.length;
    const results = await enrichProducts(this.store, products.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize));
    const suggestions = total === 0 ? await this.suggest(q.slice(0, 3) || "g") : [];
    return { query: q, total, page, pageSize, results, facets, suggestions, source };
  }

  async searchWithValkey(query = {}) {
    const q = (query.q || "").trim();
    const searchQuery = this.buildValkeyQuery(query);
    const raw = await this.store.sendCommand(["FT.SEARCH", "idx:products", searchQuery, "LIMIT", "0", "1000", "DIALECT", "2"]);
    const keys = [];
    for (let index = 1; index < raw.length; index += 2) keys.push(raw[index]);
    let products = (await Promise.all(keys.map((key) => this.repos.products.get(key)))).filter(
      (item) => item?.status === "active"
    );

    if (query.brand) products = products.filter((item) => includes(item.brand, query.brand));
    const facets = this.facets(products);
    products = sortProducts(products, query.sort || (q ? "rating_desc" : "newest"));
    const page = query.page || 1;
    const pageSize = Math.min(Math.max(query.pageSize || 12, 1), 100);
    const total = products.length;
    const results = await enrichProducts(this.store, products.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize));
    const suggestions = total === 0 ? await this.suggest(q.slice(0, 3) || "g") : [];
    return { query: q, total, page, pageSize, results, facets, suggestions, source: "valkey-search" };
  }

  buildValkeyQuery(query = {}) {
    const clauses = [];
    const q = (query.q || "").trim();
    if (q) {
      const terms = q
        .toLowerCase()
        .split(/\s+/)
        .map((term) => term.replace(/[^a-z0-9]/gi, ""))
        .filter(Boolean);
      if (terms.length) clauses.push(terms.join(" "));
    }
    if (query.categoryId) clauses.push(`@categoryId:{${escapeTag(query.categoryId)}}`);
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      clauses.push(`@price:[${query.minPrice ?? "-inf"} ${query.maxPrice ?? "+inf"}]`);
    }
    if (query.minRating !== undefined) clauses.push(`@rating:[${query.minRating} +inf]`);
    return clauses.length ? clauses.join(" ") : "*";
  }

  facets(products) {
    const countBy = (getter) => {
      const map = new Map();
      products.forEach((item) => map.set(getter(item), (map.get(getter(item)) || 0) + 1));
      return Array.from(map.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
    };
    return {
      categories: countBy((item) => item.categoryId),
      brands: countBy((item) => item.brand),
      priceRanges: [
        { key: "under_25000", count: products.filter((item) => item.price < 25000).length },
        { key: "25000_60000", count: products.filter((item) => item.price >= 25000 && item.price <= 60000).length },
        { key: "above_60000", count: products.filter((item) => item.price > 60000).length }
      ]
    };
  }

  async suggest(prefix = "") {
    const normalized = prefix.toLowerCase();
    if (!normalized) return [];
    if (this.store.capabilities?.searchModule) {
      try {
        const rows = await this.store.sendCommand(["FT.SUGGET", "autocomplete", normalized, "MAX", "10"]);
        if (Array.isArray(rows) && rows.length) return rows;
      } catch (error) {}
    }
    const products = await this.repos.products.all();
    return products
      .flatMap((product) => [product.name, product.brand, ...(product.tags || [])])
      .filter((value, index, list) => value && list.indexOf(value) === index)
      .filter((value) => value.toLowerCase().includes(normalized))
      .slice(0, 10);
  }
}

function escapeTag(value) {
  return String(value).replace(/([\\,.<>{}\[\]"':;!@#$%^&*()\-+=~| ])/g, "\\$1");
}

module.exports = { SearchService };
